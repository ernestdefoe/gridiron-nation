<?php

namespace Ernestdefoe\Fbsfb\Api\Controller\Recruit;

use Ernestdefoe\Fbsfb\Model\GridironRecruit;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ListRecruitsController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $recruits = GridironRecruit::orderBy('sort_order')->orderBy('stars', 'desc')->get();

        return new JsonResponse([
            'data' => $recruits->map(fn ($r) => $r->toSerializable())->values(),
        ]);
    }
}
