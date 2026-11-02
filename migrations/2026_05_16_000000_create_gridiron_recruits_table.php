<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

return Migration::createTableIfNotExists('gridiron_recruits', function (Blueprint $table) {
    $table->bigIncrements('id');
    $table->string('name');
    $table->string('position', 10)->nullable();
    $table->string('height', 20)->nullable();
    $table->string('hometown', 255)->nullable();
    $table->tinyInteger('stars')->default(3);
    // String, not enum — enum DDL isn't portable (migrate:reset can fail on
    // PostgreSQL/SQLite with older Laravel). The committed/undecided/
    // decommitted allowlist is enforced at the application layer.
    $table->string('status', 20)->default('undecided');
    $table->string('school', 255)->nullable();
    $table->integer('sort_order')->default(0);
    $table->timestamps();
});
