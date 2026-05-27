<?php

// Bump PHP's memory_limit to a level that survives compiling our
// themed forum.less alongside three other ernestdefoe extensions. The
// upstream wikimedia/less.php parser holds the full AST + every nested
// rule + every inline data URI in heap, and the 128M PHP default tips
// over while compiling our hero block (football SVG + [data-theme]
// override matrix + glassmorphic popover styles). 256M matches Flarum's
// own recommendation for theme-heavy installs.
//
// @ini_set returns false when the operator has disabled runtime
// memory_limit changes — silently no-ops in that case, and we fall
// back to whatever the host configured. This is *additive only*: we
// never lower a higher operator-set value.
if (function_exists('ini_get')) {
    $current = trim((string) ini_get('memory_limit'));
    $needed  = 256 * 1024 * 1024;
    $parsed  = $current === '-1' ? PHP_INT_MAX : (int) $current * match (strtoupper(substr($current, -1))) {
        'G'     => 1024 * 1024 * 1024,
        'M'     => 1024 * 1024,
        'K'     => 1024,
        default => 1,
    };
    if ($parsed < $needed) {
        @ini_set('memory_limit', '256M');
    }
}

use Ernestdefoe\GridironNation\Api\Controller\LiveScoresController;
use Ernestdefoe\GridironNation\Api\Controller\OnlineNowController;
use Ernestdefoe\GridironNation\Listener\SyncDiscussionLikesCount;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;
use Flarum\Extend;
use Flarum\User\User;

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
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Arr::make('gridironNewestMember')
                ->get(function () {
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
                }),
        ]),

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
// Closures (not `[Class, 'method']` arrays) because `Extend\Event::listen`
// strictly types its second argument as `callable|string` and rejects
// arrays at runtime even though they ARE callable per PHP semantics.
if (class_exists(\Flarum\Likes\Event\PostWasLiked::class)) {
    $extenders[] = (new Extend\Event())
        ->listen(\Flarum\Likes\Event\PostWasLiked::class, function ($event) {
            resolve(SyncDiscussionLikesCount::class)->whenPostLiked($event);
        })
        ->listen(\Flarum\Likes\Event\PostWasUnliked::class, function ($event) {
            resolve(SyncDiscussionLikesCount::class)->whenPostUnliked($event);
        });
}

return $extenders;
