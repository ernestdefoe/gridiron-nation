<?php

namespace Ernestdefoe\Fbsfb\Api\Controller\Recruit;

use Ernestdefoe\Fbsfb\Model\GridironRecruit;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * DELETE /api/gn-recruits/{id}
 *
 * Admin-only. 204 No Content on success, 404 if the recruit doesn't
 * exist (findOrFail raises ModelNotFoundException which Flarum's error
 * handler maps to a clean 404 JSON-API response).
 */
class DeleteRecruitController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $id = Arr::get($request->getQueryParams(), 'id');

        GridironRecruit::findOrFail($id)->delete();

        return new EmptyResponse(204);
    }
}
