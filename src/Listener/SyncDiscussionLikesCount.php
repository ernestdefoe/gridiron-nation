<?php

namespace Ernestdefoe\GridironNation\Listener;

use Flarum\Discussion\Discussion;
use Flarum\Likes\Event\PostWasLiked;
use Flarum\Likes\Event\PostWasUnliked;

/**
 * Keeps `discussions.likes_count` in sync with the actual count of
 * likes across every post in a discussion.
 *
 * Wired in extend.php only when flarum/likes is installed (the event
 * classes are guarded with `class_exists` there, and the listeners are
 * registered as `Class@method` strings, so this file is never autoloaded
 * — and these typed methods never resolve their parameter classes — on a
 * forum without flarum/likes). When invoked:
 *
 *   PostWasLiked   → bump the discussion's likes_count by +1
 *   PostWasUnliked → drop the discussion's likes_count by -1
 *
 * Uses Eloquent's atomic increment()/decrement() (a single
 * `SET likes_count = likes_count ± 1` UPDATE), so it's race-safe against
 * concurrent likes and works on every database engine Flarum supports —
 * no raw SQL / dialect-specific CAST. A `where('likes_count', '>', 0)`
 * guard on decrement floors the counter at 0 if a desync (manual delete,
 * half-fired event) would otherwise push it negative.
 */
class SyncDiscussionLikesCount
{
    public function whenPostLiked(PostWasLiked $event): void
    {
        $this->bump($event, +1);
    }

    public function whenPostUnliked(PostWasUnliked $event): void
    {
        $this->bump($event, -1);
    }

    private function bump(object $event, int $delta): void
    {
        $discussionId = $event->post->discussion_id ?? null;
        if (! $discussionId) {
            return;
        }

        $query = Discussion::query()->where('id', (int) $discussionId);

        if ($delta >= 0) {
            $query->increment('likes_count');
        } else {
            $query->where('likes_count', '>', 0)->decrement('likes_count');
        }
    }
}
