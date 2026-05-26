<?php

namespace Ernestdefoe\Fbsfb\Model;

use Flarum\Database\AbstractModel;

/**
 * GridIron Nation top-recruit row. Extends Flarum's AbstractModel so
 * the row picks up Flarum's visibility pipeline, soft-delete awareness,
 * and event hooks if we ever need them.
 *
 * Mass-assignment via `$fillable` is safe here only because every
 * controller call site (Create/UpdateRecruitController) assembles the
 * field dict explicitly and never passes `$request->getParsedBody()`
 * straight to `->fill()` (CLAUDE.md §7).
 */
class GridironRecruit extends AbstractModel
{
    protected $table = 'gridiron_recruits';

    protected $fillable = [
        'name', 'position', 'height', 'hometown',
        'stars', 'status', 'school', 'sort_order',
    ];

    protected $casts = [
        'stars'      => 'integer',
        'sort_order' => 'integer',
    ];

    public function toSerializable(): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'position'   => $this->position,
            'height'     => $this->height,
            'hometown'   => $this->hometown,
            'stars'      => $this->stars,
            'status'     => $this->status,
            'school'     => $this->school,
            'sortOrder'  => $this->sort_order,
            'createdAt'  => $this->created_at?->toIso8601String(),
            'updatedAt'  => $this->updated_at?->toIso8601String(),
        ];
    }
}
