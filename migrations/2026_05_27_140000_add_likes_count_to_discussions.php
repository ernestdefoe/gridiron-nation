<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/**
 * Add `discussions.likes_count` — a running total of likes across every
 * post in a discussion. Mirrors how core stores `comment_count` and
 * `participant_count` on the same row so list-payload aggregates don't
 * need a JOIN at read time.
 *
 * Kept in sync by `Listener\SyncDiscussionLikesCount` which listens for
 * flarum/likes' `PostWasLiked` / `PostWasUnliked` events. The listener
 * (and this column) is only useful when flarum/likes is installed —
 * extend.php gates the wiring on `class_exists(PostWasLiked::class)` so
 * the column sits dormant (just defaults to 0) when likes isn't enabled.
 *
 * The `up` callback backfills existing discussions in one SQL statement
 * — a JOIN against `post_likes` summed per discussion. Guards on the
 * `post_likes` table existing (it does iff flarum/likes is installed).
 *
 * Idempotent: `hasColumn` guard so re-running on an already-migrated DB
 * is a no-op. `down` drops the column if it exists.
 */
return [
    'up' => function (Builder $schema) {
        if (! $schema->hasColumn('discussions', 'likes_count')) {
            $schema->table('discussions', function (Blueprint $table) {
                $table->unsignedInteger('likes_count')->default(0);
            });
        }

        $db = $schema->getConnection();
        if ($schema->hasTable('post_likes')) {
            // Backfill from existing likes. Subquery sum keeps it to one
            // statement instead of N+1.
            $db->statement(
                'UPDATE discussions d
                 SET likes_count = (
                     SELECT COUNT(*) FROM post_likes pl
                     INNER JOIN posts p ON p.id = pl.post_id
                     WHERE p.discussion_id = d.id
                 )'
            );
        }
    },

    'down' => function (Builder $schema) {
        if ($schema->hasColumn('discussions', 'likes_count')) {
            $schema->table('discussions', function (Blueprint $table) {
                $table->dropColumn('likes_count');
            });
        }
    },
];
