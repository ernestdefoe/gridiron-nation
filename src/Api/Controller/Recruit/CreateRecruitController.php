<?php

namespace Ernestdefoe\Fbsfb\Api\Controller\Recruit;

use Ernestdefoe\Fbsfb\Model\GridironRecruit;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class CreateRecruitController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if (! $actor->isAdmin()) {
            return new JsonResponse(['error' => 'Forbidden.'], 403);
        }

        $body = (array) $request->getParsedBody();

        $recruit = GridironRecruit::create([
            'name'       => trim($body['name'] ?? ''),
            'position'   => strtoupper(trim($body['position'] ?? '')),
            'height'     => trim($body['height'] ?? ''),
            'hometown'   => trim($body['hometown'] ?? ''),
            'stars'      => max(1, min(5, (int) ($body['stars'] ?? 3))),
            'status'     => in_array($body['status'] ?? '', ['committed', 'undecided', 'decommitted'])
                ? $body['status']
                : 'undecided',
            'school'     => trim($body['school'] ?? ''),
            'sort_order' => (int) ($body['sortOrder'] ?? 0),
        ]);

        return new JsonResponse($recruit->toSerializable(), 201);
    }
}
