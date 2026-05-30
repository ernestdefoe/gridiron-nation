<?php

// NOTE on LESS compilation memory: compiling this theme's forum.less can
// exceed PHP's 128M default in the wikimedia/less.php parser. That is a
// BUILD concern, not a per-request one, so it must NOT be set here (this
// file runs on every web request and would silently override an operator's
// intentionally lower memory_limit). If a CLI compile (`php flarum
// assets:publish` / cache:clear) runs short, raise memory_limit for the
// CLI SAPI only — e.g. `php -d memory_limit=256M flarum cache:clear`, or a
// memory_limit directive in the cli php.ini.

use Ernestdefoe\GridironNation\Api\Controller\LiveScoresController;
use Ernestdefoe\GridironNation\Api\Controller\OnlineNowController;
use Ernestdefoe\GridironNation\Listener\SyncDiscussionLikesCount;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;
use Flarum\Extend;
use Flarum\Post\Post;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;

$extenders = [
    // ── Frontend ──────────────────────────────────────────────────────────────
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    new Extend\Locales(__DIR__ . '/locale'),

    // ── API routes ───────────────────────────────────────────────────────────
    // Recruits used to live here under /api/gn-recruits with a small
    // admin CRUD page. That has been retired in favour of pulling from
    // the ernestdefoe/recruiting extension (CollegeFootballData.com
    // source, scheduled refresh, On3 photo enrichment) — see
    // js/src/forum/components/TopRecruitsWidget.js which now hits
    // /api/cfbd-recruits. The migrations folder includes a drop for
    // the legacy `gridiron_recruits` table.
    (new Extend\Routes('api'))
        // Phase 2 — Live Scores (ESPN proxy, CORS-safe, public)
        ->get('/gn-live-scores', 'gn.live-scores', LiveScoresController::class)
        // Phase 4 — Online Now
        ->get('/gn-online',      'gn.online',      OnlineNowController::class),

    // ── Settings ─────────────────────────────────────────────────────────────
    // Per-widget visibility toggles exposed to the forum frontend so the
    // sidebar can honor the operator's preference without an extra API
    // round-trip. `boolval` cast normalizes the persisted "1"/"0" string
    // back to a real JS bool — the widgets read these via
    // `app.forum.attribute('gridiron-nation.widget_*')` and skip rendering
    // when the value is explicitly `false`.
    //
    // Storage-key prefix:   ernestdefoe-gridiron-nation.*   (canonical settings table key)
    // Frontend payload key: gridiron-nation.*               (what JS reads via app.forum.attribute)
    //
    // The rename migration (see migrations/2026_05_27_*.php) copies any
    // legacy fbsfb.* / ernestdefoe-fbsfb.* rows into these new keys on
    // first boot so upgraders don't lose their widget toggles.
    (new Extend\Settings())
        ->serializeToForum('gridiron-nation.widget_live_scores',  'ernestdefoe-gridiron-nation.widget_live_scores',  'boolval', true)
        ->serializeToForum('gridiron-nation.widget_trending',     'ernestdefoe-gridiron-nation.widget_trending',     'boolval', true)
        ->serializeToForum('gridiron-nation.widget_top_recruits', 'ernestdefoe-gridiron-nation.widget_top_recruits', 'boolval', true)
        // DiscussionHero secondary-tag icon decoration. Child tags only,
        // up to 2 icons on desktop, configurable opacity. Opacity is
        // stored as a 0-100 integer so the admin UI is a plain text
        // field; the frontend divides by 100 before applying.
        ->serializeToForum('gridiron-nation.hero_deco_enabled',    'ernestdefoe-gridiron-nation.hero_deco_enabled',    'boolval', true)
        ->serializeToForum('gridiron-nation.hero_deco_icon_count', 'ernestdefoe-gridiron-nation.hero_deco_icon_count', 'intval', 2)
        ->serializeToForum('gridiron-nation.hero_deco_opacity',    'ernestdefoe-gridiron-nation.hero_deco_opacity',    'intval', 35)
        ->default('ernestdefoe-gridiron-nation.widget_live_scores',   '1')
        ->default('ernestdefoe-gridiron-nation.widget_trending',      '1')
        ->default('ernestdefoe-gridiron-nation.widget_top_recruits',  '1')
        ->default('ernestdefoe-gridiron-nation.hero_deco_enabled',    '1')
        ->default('ernestdefoe-gridiron-nation.hero_deco_icon_count', '2')
        ->default('ernestdefoe-gridiron-nation.hero_deco_opacity',    '35'),

    // ── Forum payload — newest registered member ────────────────────────────
    // Exposes the most recently joined user as
    // `app.forum.attribute('gridironNewestMember')` so the hero
    // scoreboard can render a "NEWEST" slot without an extra API
    // round-trip. Returns a tiny shape — just id / displayName /
    // username / avatarUrl — so we don't bloat the bootstrap payload
    // with full user resources. Falls back to null on a forum with no
    // users yet (fresh install during onboarding).
    // ── Forum payload — scoreboard counts (members / topics / posts) ─────────
    // The hero scoreboard (GridIronHero.js) reads these three counts from
    // `app.forum.attribute(...)`. They are NOT core forum attributes, so
    // without this extender the scoreboard renders zeros. Cached for five
    // minutes and memoized per request so a full page load resolves all
    // three from one COUNT trio rather than re-counting per field.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(function () {
            $counts = function (): array {
                static $memo = null;
                if ($memo !== null) {
                    return $memo;
                }
                return $memo = resolve(CacheRepository::class)->remember(
                    'gridiron-nation.scoreboard_counts',
                    300,
                    fn () => [
                        'users'       => (int) User::query()->count(),
                        'discussions' => (int) Discussion::query()->count(),
                        'posts'       => (int) Post::query()->count(),
                    ]
                );
            };

            return [
                Schema\Integer::make('userCount')->get(fn () => $counts()['users']),
                Schema\Integer::make('discussionCount')->get(fn () => $counts()['discussions']),
                Schema\Integer::make('postCount')->get(fn () => $counts()['posts']),

                // Newest registered member, for the hero scoreboard's "NEWEST"
                // slot. Cached for five minutes like the counts above so it
                // doesn't add a DB round-trip to every bootstrap payload.
                // Tiny shape (id / displayName / username / avatarUrl) to keep
                // the payload small; null on a fresh install with no users.
                Schema\Arr::make('gridironNewestMember')
                    ->get(fn () => resolve(CacheRepository::class)->remember(
                        'gridiron-nation.newest_member',
                        300,
                        function () {
                            $user = User::query()
                                ->orderByDesc('joined_at')
                                ->first(['id', 'username', 'avatar_url', 'joined_at']);

                            if (! $user) {
                                return null;
                            }

                            return [
                                'id'          => (int) $user->id,
                                'username'    => $user->username,
                                'displayName' => $user->display_name ?: $user->username,
                                'avatarUrl'   => $user->avatar_url,
                            ];
                        }
                    )),
            ];
        }),

    // ── Discussion `likesCount` field ───────────────────────────────────────
    // Surface the running total of post-likes per discussion (maintained
    // by the SyncDiscussionLikesCount listener below + the 2026_05_27
    // migration). The showcase card's thumbs stat reads
    // `discussion.likesCount()` from this field. Always 0 when
    // flarum/likes isn't installed (column defaults to 0 and never
    // increments).
    (new Extend\ApiResource(DiscussionResource::class))
        ->fields(fn () => [
            Schema\Integer::make('likesCount')
                ->property('likes_count'),
        ]),
];

// ── Optional flarum/likes integration ─────────────────────────────────────
// flarum/likes ships `PostWasLiked` / `PostWasUnliked` events that fire
// every time a like is added or removed. We listen for both and update
// `discussions.likes_count` in lockstep. Gated on `class_exists` so the
// extension boots cleanly on a forum that doesn't have flarum/likes —
// the migration still adds the column (it stays at 0) and the field is
// still exposed (it returns 0), the listener just doesn't register.
//
// Registered as `Class@method` listener strings: Laravel's dispatcher
// resolves SyncDiscussionLikesCount from the container and calls the named
// method, so there's no manual `resolve()` per event. (A `[Class, 'method']`
// array can't be used — an instance method pair isn't a valid PHP `callable`
// without an instance, so `Extend\Event::listen`'s `callable|string` type
// rejects it; the `Class@method` string form is the idiomatic alternative.)
if (class_exists(\Flarum\Likes\Event\PostWasLiked::class)) {
    $extenders[] = (new Extend\Event())
        ->listen(\Flarum\Likes\Event\PostWasLiked::class, SyncDiscussionLikesCount::class . '@whenPostLiked')
        ->listen(\Flarum\Likes\Event\PostWasUnliked::class, SyncDiscussionLikesCount::class . '@whenPostUnliked');
}

return $extenders;
