<?php

namespace Ernestdefoe\Fbsfb\Api\Controller;

use Carbon\Carbon;
use Flarum\Http\RequestUtil;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;

/**
 * GET /api/gn-online
 *
 * Registered-users-only listing of the 12 most-recently-active users in
 * the last 5 minutes, plus the count. Three layers of access control:
 *
 *  1. `assertRegistered()` — guests cannot enumerate presence at all.
 *  2. `User::query()->whereVisibleTo($actor)` — Flarum's permission
 *     pipeline drops users the actor isn't allowed to see (suspended
 *     hidden, GDPR-anonymized, etc.).
 *  3. `preferences.discloseOnline === false` filter — a user who turned
 *     off presence in their settings stays invisible regardless of the
 *     other two layers.
 *
 * Cache is bucketed by actor id so per-actor visibility doesn't bleed
 * across users (CLAUDE.md §24). Bucket TTL is 30s — well under the
 * 5-minute "active" window.
 */
class OnlineNowController implements RequestHandlerInterface
{
    private const CACHE_TTL = 30; // seconds

    public function __construct(
        private readonly CacheRepository $cache,
        private readonly LoggerInterface $log,
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        try {
            $payload = $this->cache->remember(
                "fbsfb.online_now.actor.{$actor->id}",
                self::CACHE_TTL,
                fn () => $this->snapshot($actor),
            );

            return new JsonResponse($payload);
        } catch (\Throwable $e) {
            $this->log->error('[fbsfb] OnlineNowController: ' . $e->getMessage());
            return new JsonResponse(['count' => 0, 'users' => []], 200);
        }
    }

    /**
     * Build the online-users snapshot for one actor. Per-actor scoping
     * is required because `whereVisibleTo` filters by who the actor is
     * allowed to see — caching a single global snapshot would leak.
     *
     * @return array{count:int, users:array<int,array<string,mixed>>}
     */
    private function snapshot(User $actor): array
    {
        $cutoff = Carbon::now()->subMinutes(5);

        // Pull a slightly larger window from the DB than we ultimately
        // return (12 visible), because the `discloseOnline` filter runs
        // in PHP and could shrink the set. 32 is comfortably more than
        // we'd ever surface to a sidebar widget while still being a
        // cheap query.
        $users = User::query()
            ->whereVisibleTo($actor)
            ->where('last_seen_at', '>=', $cutoff)
            ->orderByDesc('last_seen_at')
            ->limit(32)
            ->get(['id', 'username', 'display_name', 'avatar_url', 'last_seen_at', 'preferences']);

        $visible = $users
            ->filter(fn (User $u) => $u->getPreference('discloseOnline', true) !== false)
            ->take(12)
            ->values();

        return [
            'count' => $visible->count(),
            'users' => $visible->map(fn (User $u) => [
                'id'          => $u->id,
                'displayName' => $u->display_name ?: $u->username,
                'avatarUrl'   => $u->avatar_url,
                'slug'        => $u->username,
            ])->all(),
        ];
    }
}
