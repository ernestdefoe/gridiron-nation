<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/**
 * Drop the legacy `gridiron_recruits` table.
 *
 * Up to v1.x of this theme, recruit data was stored locally in this
 * table and managed via an admin CRUD page. That has been retired —
 * recruit data now comes from the ernestdefoe/recruiting extension,
 * which pulls live from CollegeFootballData.com with photo enrichment
 * from On3. The widget on the forum index hits /api/cfbd-recruits
 * (provided by that extension) instead of /api/gn-recruits.
 *
 * The `down` here recreates the empty table shape so an operator
 * rolling back this update gets the schema back, but it does NOT
 * restore the row data — the operator should restore from a DB backup
 * if they need the old admin-managed entries. The original 2026_05_16
 * create migration was kept in tree so `migrate:reset` knows the full
 * history; this migration is the inverse delta on top of it.
 */
return [
    'up' => function (Builder $schema) {
        $schema->dropIfExists('gridiron_recruits');
    },

    'down' => function (Builder $schema) {
        if ($schema->hasTable('gridiron_recruits')) return;

        $schema->create('gridiron_recruits', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('position', 10)->nullable();
            $table->string('height', 20)->nullable();
            $table->string('hometown', 255)->nullable();
            $table->tinyInteger('stars')->default(3);
            $table->enum('status', ['committed', 'undecided', 'decommitted'])->default('undecided');
            $table->string('school', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    },
];
