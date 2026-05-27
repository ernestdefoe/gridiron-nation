<?php

namespace Ernestdefoe\GridironNation\Listener;

use Flarum\Discussion\Discussion;
use Illuminate\Database\ConnectionInterface;

/**
 * Keeps `discussions.likes_count` in sync with the actual count of
 * likes across every post in a discussion.
 *
 * Wired in extend.php only when flarum/likes is installed (we
 * `class_exists` the event classes there). When invoked:
 *
 *   PostWasLiked   → bump the discussion's likes_count by +1
 *   PostWasUnliked → drop the discussion's likes_count by -1
 *
 * The bump runs as a single SQL `UPDATE ... = likes_count + 1` so it's
 * race-safe against concurrent likes on different posts in the same
 * discussion. `GREATEST(0, ...)` guards against the counter going
 * negative if a manual DB delete ever skips the unlike event.
 */
class SyncDiscussionLikesCount
{
    public function __construct(private readonly ConnectionInterface $db) {}

    /**
     * Listener target for `Flarum\Likes\Event\PostWasLiked`. The event
     * carries the Post that was liked; we read `discussion_id` off the
     * post and bump that discussion's counter.
     *
     * Typed parameter is `object` (instead of `PostWasLiked`) so the
     * file doesn't `use` the flarum/likes class at the top — that would
     * make this whole file refuse to autoload when likes isn't
     * installed. extend.php gates the listener registration on
     * `class_exists`, so when this method runs, the event object IS
     * a PostWasLiked instance with the expected shape.
     */
    public function whenPostLiked(object $event): void
    {
        $discussionId = $event->post->discussion_id ?? null;
        if ($discussionId) {
            $this->bump((int) $discussionId, +1);
        }
    }

    public function whenPostUnliked(object $event): void
    {
        $discussionId = $event->post->discussion_id ?? null;
        if ($discussionId) {
            $this->bump((int) $discussionId, -1);
        }
    }

    /**
     * Atomic +1/−1 on `discussions.likes_count`. `GREATEST` floors at 0
     * so a desync (manual delete, half-fired event) never produces a
     * negative count.
     */
    private function bump(int $discussionId, int $delta): void
    {
        $op = $delta >= 0 ? '+' : '-';
        $abs = abs($delta);
        $this->db->table('discussions')
            ->where('id', $discussionId)
            ->update([
                'likes_count' => $this->db->raw("GREATEST(0, CAST(likes_count AS SIGNED) {$op} {$abs})"),
            ]);
    }
}
