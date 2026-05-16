<?php

namespace Ernestdefoe\Fbsfb\Model;

use Illuminate\Database\Eloquent\Model;

class GridironRecruit extends Model
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
