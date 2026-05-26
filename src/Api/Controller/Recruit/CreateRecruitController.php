<?php

namespace Ernestdefoe\Fbsfb\Api\Controller\Recruit;

use Ernestdefoe\Fbsfb\Model\GridironRecruit;
use Flarum\Foundation\ValidationException;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * POST /api/gn-recruits
 *
 * Admin-only. Validates + length-caps every user-provided string field
 * against the underlying schema column widths (see migrations/2026_…)
 * so a malicious / malformed payload never reaches the database with
 * a string that would overflow its column.
 */
class CreateRecruitController implements RequestHandlerInterface
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
        // assertAdmin() throws PermissionDeniedException → Flarum's
        // error handler renders the canonical JSON-API 403 body for us,
        // which keeps the wire format consistent with every other
        // admin-only endpoint in the forum.
        RequestUtil::getActor($request)->assertAdmin();

        $body = (array) $request->getParsedBody();
        $data = $this->normalize($body);

        if ($data['name'] === '') {
            throw new ValidationException(['name' => 'The name field is required.']);
        }

        $recruit = GridironRecruit::create($data);

        return new JsonResponse($recruit->toSerializable(), 201);
    }

    /**
     * Trim, length-cap, and whitelist every user-supplied field. Returns
     * a fully-resolved array safe to pass to Model::create().
     *
     * @param  array<string,mixed> $body
     * @return array<string,mixed>
     */
    private function normalize(array $body): array
    {
        $status = $body['status'] ?? '';
        $status = in_array($status, self::VALID_STATUSES, true) ? $status : 'undecided';

        return [
            'name'       => $this->cap($body['name']     ?? '', 'name'),
            'position'   => strtoupper($this->cap($body['position'] ?? '', 'position')),
            'height'     => $this->cap($body['height']   ?? '', 'height'),
            'hometown'   => $this->cap($body['hometown'] ?? '', 'hometown'),
            'school'     => $this->cap($body['school']   ?? '', 'school'),
            'stars'      => max(1, min(5, (int) Arr::get($body, 'stars', 3))),
            'status'     => $status,
            'sort_order' => (int) Arr::get($body, 'sortOrder', 0),
        ];
    }

    private function cap(mixed $value, string $field): string
    {
        $trimmed = trim((string) $value);
        $cap     = self::LENGTH_CAPS[$field] ?? 255;

        // mb_substr keeps multi-byte names intact (Łukasz, Müller, etc.)
        // rather than slicing in the middle of a code point.
        return mb_substr($trimmed, 0, $cap);
    }
}
