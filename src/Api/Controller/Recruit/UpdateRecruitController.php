<?php

namespace Ernestdefoe\Fbsfb\Api\Controller\Recruit;

use Ernestdefoe\Fbsfb\Model\GridironRecruit;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * PATCH /api/gn-recruits/{id}
 *
 * Admin-only partial update. Only the fields that are present in the
 * request body are touched — clients can PATCH `{stars: 5}` without
 * having to round-trip the whole record.
 */
class UpdateRecruitController implements RequestHandlerInterface
{
    /** @var array<string,int> column width caps mirroring the migration */
    private const LENGTH_CAPS = [
        'name'     => 255,
        'position' => 10,
        'height'   => 20,
        'hometown' => 255,
        'school'   => 255,
    ];

    private const VALID_STATUSES = ['committed', 'undecided', 'decommitted'];

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        // Flarum 2 merges route parameters into the query-params bag, so
        // {id} from `/gn-recruits/{id}` is right here. No URL parsing
        // needed — the previous regex fallback was dead code that never
        // ran in practice.
        $id      = Arr::get($request->getQueryParams(), 'id');
        $recruit = GridironRecruit::findOrFail($id);
        $body    = (array) $request->getParsedBody();

        $fields = [];

        if (isset($body['name']))     $fields['name']     = $this->cap($body['name'], 'name');
        if (isset($body['position'])) $fields['position'] = strtoupper($this->cap($body['position'], 'position'));
        if (isset($body['height']))   $fields['height']   = $this->cap($body['height'], 'height');
        if (isset($body['hometown'])) $fields['hometown'] = $this->cap($body['hometown'], 'hometown');
        if (isset($body['school']))   $fields['school']   = $this->cap($body['school'], 'school');

        if (isset($body['stars']))     $fields['stars']      = max(1, min(5, (int) $body['stars']));
        if (isset($body['sortOrder'])) $fields['sort_order'] = (int) $body['sortOrder'];

        if (isset($body['status']) && in_array($body['status'], self::VALID_STATUSES, true)) {
            $fields['status'] = $body['status'];
        }

        $recruit->update($fields);

        return new JsonResponse($recruit->fresh()->toSerializable());
    }

    private function cap(mixed $value, string $field): string
    {
        $trimmed = trim((string) $value);
        $cap     = self::LENGTH_CAPS[$field] ?? 255;

        return mb_substr($trimmed, 0, $cap);
    }
}
