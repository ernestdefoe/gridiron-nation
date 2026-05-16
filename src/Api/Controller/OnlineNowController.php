<?php

namespace Ernestdefoe\Fbsfb\Api\Controller;

use Flarum\User\User;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class OnlineNowController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        try {
            // Users seen in the last 5 minutes
            $cutoff = \Carbon\Carbon::now()->subMinutes(5)->toDateTimeString();

            $users = User::where('last_seen_at', '>=', $cutoff)
                ->orderBy('last_seen_at', 'desc')
                ->limit(12)
                ->get(['id', 'username', 'display_name', 'avatar_url', 'last_seen_at']);

            return new JsonResponse([
                'count' => $users->count(),
                'users' => $users->map(fn ($u) => [
                    'id'          => $u->id,
                    'displayName' => $u->display_name ?: $u->username,
                    'avatarUrl'   => $u->avatar_url,
                    'slug'        => $u->username,
                ])->values(),
            ]);
        } catch (\Throwable $e) {
            resolve('log')->error('[fbsfb] OnlineNowController: ' . $e->getMessage());
            return new JsonResponse(['count' => 0, 'users' => []], 200);
        }
    }
}
