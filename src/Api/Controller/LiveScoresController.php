<?php

namespace Ernestdefoe\GridironNation\Api\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;

/**
 * GET /api/gn-live-scores
 *
 * Proxy + normalizer for ESPN's college-football scoreboard endpoint.
 * The response is cached for 60 seconds — ESPN itself updates scores
 * roughly every 30 seconds, but every page-view of the forum mounts
 * the LiveScoresWidget which also polls every 60 seconds, so without
 * a server-side cache a single page refresh by every visitor would
 * fan out to ESPN. The cache key is global (the endpoint is public
 * and identical for everyone).
 */
class LiveScoresController implements RequestHandlerInterface
{
    private const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

    private const CACHE_KEY = 'gridiron-nation.live_scores';
    private const CACHE_TTL = 60; // seconds

    public function __construct(
        private readonly CacheRepository $cache,
        private readonly LoggerInterface $log,
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // Cache::remember returns the cached array if hot, otherwise
        // executes the closure and caches the result. The closure
        // always returns a `games` array (possibly empty) so the cache
        // never holds error state — if ESPN is down we cache `[]` for
        // 60s, which is the right tradeoff (don't hammer ESPN trying
        // to recover, just show "Scores unavailable" briefly).
        $games = $this->cache->remember(
            self::CACHE_KEY,
            self::CACHE_TTL,
            fn () => $this->fetchAndNormalize(),
        );

        return new JsonResponse(['games' => $games]);
    }

    /**
     * Hit ESPN and reshape the response into our widget's flat schema.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fetchAndNormalize(): array
    {
        try {
            $client   = new Client(['timeout' => 6, 'connect_timeout' => 4]);
            $response = $client->get(self::ESPN_URL, [
                'headers' => [
                    'User-Agent' => 'Mozilla/5.0 (compatible; GridIronNation/1.0)',
                    'Accept'     => 'application/json',
                ],
                'http_errors' => false,
            ]);

            $data = json_decode((string) $response->getBody(), true);
            if (! is_array($data) || ! isset($data['events']) || ! is_array($data['events'])) {
                return [];
            }

            $games = [];
            foreach ($data['events'] as $event) {
                $game = $this->normalizeEvent($event);
                if ($game !== null) {
                    $games[] = $game;
                }
            }

            // Live games first, then scheduled, then finals (so the
            // widget's "above the fold" rows are the most actionable).
            usort($games, fn ($a, $b) =>
                ($b['isLive'] ? 2 : ($b['isFinal'] ? 0 : 1)) <=>
                ($a['isLive'] ? 2 : ($a['isFinal'] ? 0 : 1))
            );

            return array_slice($games, 0, 6);
        } catch (GuzzleException $e) {
            // Network / timeout — log once, cache empty. The widget
            // distinguishes "no games" from "ESPN unavailable" via the
            // shape of the response, but for caching purposes we treat
            // both as `games=[]`.
            $this->log->info('[gridiron-nation] ESPN unreachable: ' . $e->getMessage());
            return [];
        } catch (\Throwable $e) {
            $this->log->error('[gridiron-nation] LiveScoresController: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Reduce one ESPN event blob to our wire shape, or null if the
     * blob is unusable (no home/away competitor — happens for the
     * occasional all-star or exhibition format that ESPN lists).
     *
     * @param  array<string,mixed> $event
     * @return array<string,mixed>|null
     */
    private function normalizeEvent(array $event): ?array
    {
        $competition = $event['competitions'][0] ?? null;
        if (! is_array($competition)) {
            return null;
        }

        $home = $away = null;
        foreach ($competition['competitors'] ?? [] as $c) {
            if (($c['homeAway'] ?? '') === 'home') $home = $c;
            if (($c['homeAway'] ?? '') === 'away') $away = $c;
        }
        if (! $home || ! $away) {
            return null;
        }

        $statusType   = $event['status']['type'] ?? [];
        $statusName   = $statusType['name'] ?? '';
        $statusDetail = $statusType['shortDetail'] ?? $statusType['description'] ?? '';

        $isLive  = in_array($statusName, [
            'STATUS_IN_PROGRESS',
            'STATUS_HALFTIME',
            'STATUS_END_PERIOD',
        ], true);
        $isFinal = str_contains($statusName, 'FINAL') || $statusName === 'STATUS_FINAL';

        $homeScore = (int) ($home['score'] ?? 0);
        $awayScore = (int) ($away['score'] ?? 0);

        return [
            'id'       => $event['id'] ?? null,
            'home'     => [
                'abbr'  => $home['team']['abbreviation'] ?? '???',
                'name'  => $home['team']['displayName']  ?? '',
                'score' => $homeScore,
                'logo'  => $home['team']['logo']         ?? null,
            ],
            'away'     => [
                'abbr'  => $away['team']['abbreviation'] ?? '???',
                'name'  => $away['team']['displayName']  ?? '',
                'score' => $awayScore,
                'logo'  => $away['team']['logo']         ?? null,
            ],
            'status'   => $statusDetail,
            'isLive'   => $isLive,
            'isFinal'  => $isFinal,
            'homeWins' => $homeScore > $awayScore,
            'awayWins' => $awayScore > $homeScore,
        ];
    }
}
