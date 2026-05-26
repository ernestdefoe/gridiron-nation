<?php

namespace Ernestdefoe\Fbsfb\Api\Controller;

use Carbon\Carbon;
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
 * Returns the 12 most-recently active users in the last 5 minutes plus
 * a count of all such users. Cached for 30 seconds — the "active in
 * last 5 minutes" window changes slowly enough that a half-minute
 * cache window is invisible to humans, and the cache prevents every
 * page-view on a busy forum from running a (cheap, but still avoidable)
 * users-table scan.
 */
class OnlineNowController implements RequestHandlerInterface
{
    private const CACHE_KEY = 'fbsfb.online_now';
    private const CACHE_TTL = 30; // seconds — well under the 5-minute "active" window

    public function __construct(
        private readonly CacheRepository $cache,
        private readonly LoggerInterface $log,
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $payload = $this->cache->remember(
                self::CACHE_KEY,
                self::CACHE_TTL,
                fn () => $this->snapshot(),
            );

            return new JsonResponse($payload);
        } catch (\Throwable $e) {
            $this->log->error('[fbsfb] OnlineNowController: ' . $e->getMessage());
            return new JsonResponse(['count' => 0, 'users' => []], 200);
        }
    }

    /**
     * Build the online-users payload by reading `last_seen_at` directly
     * from the users table. Stored as a plain array so the cache layer
     * can serialize it without dragging Eloquent models along.
     *
     * @return array{count:int, users:array<int,array<string,mixed>>}
     */
    private function snapshot(): array
    {
        $cutoff = Carbon::now()->subMinutes(5);

        $users = User::query()
            ->where('last_seen_at', '>=', $cutoff)
            ->orderByDesc('last_seen_at')
            ->limit(12)
            ->get(['id', 'username', 'display_name', 'avatar_url', 'last_seen_at']);

        return [
            'count' => $users->count(),
            'users' => $users->map(fn (User $u) => [
                'id'          => $u->id,
                'displayName' => $u->display_name ?: $u->username,
                'avatarUrl'   => $u->avatar_url,
                'slug'        => $u->username,
            ])->values()->all(),
        ];
    }
}
