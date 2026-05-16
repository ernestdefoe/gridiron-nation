<?php

namespace Ernestdefoe\Fbsfb\Api\Controller;

use Flarum\Http\RequestUtil;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class LiveScoresController implements RequestHandlerInterface
{
    private const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

    public function handle(ServerRequestInterface $request): ResponseInterface
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

            $body = (string) $response->getBody();
            $data = json_decode($body, true);

            if (!$data || !isset($data['events'])) {
                return new JsonResponse(['games' => []]);
            }

            $games = [];
            foreach ($data['events'] as $event) {
                $competition = $event['competitions'][0] ?? null;
                if (!$competition) continue;

                $competitors = $competition['competitors'] ?? [];
                $home = null;
                $away = null;

                foreach ($competitors as $c) {
                    if (($c['homeAway'] ?? '') === 'home') $home = $c;
                    if (($c['homeAway'] ?? '') === 'away') $away = $c;
                }

                if (!$home || !$away) continue;

                $statusType = $event['status']['type'] ?? [];
                $statusName = $statusType['name'] ?? '';
                $statusDetail = $statusType['shortDetail'] ?? $statusType['description'] ?? '';

                // Map ESPN status to display status
                $isLive = in_array($statusName, [
                    'STATUS_IN_PROGRESS',
                    'STATUS_HALFTIME',
                    'STATUS_END_PERIOD',
                ]);
                $isFinal = str_contains($statusName, 'FINAL') || $statusName === 'STATUS_FINAL';

                $homeScore = (int) ($home['score'] ?? 0);
                $awayScore = (int) ($away['score'] ?? 0);

                $games[] = [
                    'id'        => $event['id'],
                    'home'      => [
                        'abbr'  => $home['team']['abbreviation'] ?? '???',
                        'name'  => $home['team']['displayName'] ?? '',
                        'score' => $homeScore,
                        'logo'  => $home['team']['logo'] ?? null,
                    ],
                    'away'      => [
                        'abbr'  => $away['team']['abbreviation'] ?? '???',
                        'name'  => $away['team']['displayName'] ?? '',
                        'score' => $awayScore,
                        'logo'  => $away['team']['logo'] ?? null,
                    ],
                    'status'    => $statusDetail,
                    'isLive'    => $isLive,
                    'isFinal'   => $isFinal,
                    'homeWins'  => $homeScore > $awayScore,
                    'awayWins'  => $awayScore > $homeScore,
                ];
            }

            // Show live games first, then scheduled, then finals
            usort($games, fn ($a, $b) =>
                ($b['isLive'] ? 2 : ($b['isFinal'] ? 0 : 1)) <=>
                ($a['isLive'] ? 2 : ($a['isFinal'] ? 0 : 1))
            );

            return new JsonResponse(['games' => array_slice($games, 0, 6)]);
        } catch (RequestException $e) {
            return new JsonResponse(['games' => [], 'error' => 'ESPN unavailable'], 200);
        } catch (\Throwable $e) {
            resolve('log')->error('[fbsfb] LiveScoresController: ' . $e->getMessage());
            return new JsonResponse(['games' => []], 200);
        }
    }
}
