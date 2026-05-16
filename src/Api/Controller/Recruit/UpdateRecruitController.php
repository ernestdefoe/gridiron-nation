<?php

namespace Ernestdefoe\Fbsfb\Api\Controller\Recruit;

use Ernestdefoe\Fbsfb\Model\GridironRecruit;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class UpdateRecruitController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if (! $actor->isAdmin()) {
            return new JsonResponse(['error' => 'Forbidden.'], 403);
        }

        $params = $request->getQueryParams();
        $id     = $params['id'] ?? null;
        if (! $id) {
            preg_match('#/gn-recruits/(\d+)#', $request->getUri()->getPath(), $m);
            $id = $m[1] ?? null;
        }

        $recruit = GridironRecruit::findOrFail($id);
        $body    = (array) $request->getParsedBody();

        $fields = [];
        if (isset($body['name']))      $fields['name']       = trim($body['name']);
        if (isset($body['position']))  $fields['position']   = strtoupper(trim($body['position']));
        if (isset($body['height']))    $fields['height']     = trim($body['height']);
        if (isset($body['hometown']))  $fields['hometown']   = trim($body['hometown']);
        if (isset($body['stars']))     $fields['stars']      = max(1, min(5, (int) $body['stars']));
        if (isset($body['school']))    $fields['school']     = trim($body['school']);
        if (isset($body['sortOrder'])) $fields['sort_order'] = (int) $body['sortOrder'];
        if (isset($body['status']) && in_array($body['status'], ['committed', 'undecided', 'decommitted'])) {
            $fields['status'] = $body['status'];
        }

        $recruit->update($fields);

        return new JsonResponse($recruit->fresh()->toSerializable());
    }
}
