<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return new class {
    public function up(Builder $schema): void
    {
        if ($schema->hasTable('gridiron_recruits')) return;

        $schema->create('gridiron_recruits', function (Blueprint $table) {
            $table->id();
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
    }

    public function down(Builder $schema): void
    {
        $schema->dropIfExists('gridiron_recruits');
    }
};
