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

use Ernestdefoe\Fbsfb\Api\Controller\LiveScoresController;
use Ernestdefoe\Fbsfb\Api\Controller\OnlineNowController;
use Flarum\Extend;

return [
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
    // `app.forum.attribute('fbsfb.widget_*')` and skip rendering when
    // the value is explicitly `false`.
    (new Extend\Settings())
        ->serializeToForum('fbsfb.widget_live_scores',  'ernestdefoe-fbsfb.widget_live_scores',  'boolval', true)
        ->serializeToForum('fbsfb.widget_trending',     'ernestdefoe-fbsfb.widget_trending',     'boolval', true)
        ->serializeToForum('fbsfb.widget_top_recruits', 'ernestdefoe-fbsfb.widget_top_recruits', 'boolval', true)
        // DiscussionHero secondary-tag icon decoration. Mirrors ramon/avocado
        // — child tags only, up to 2 icons on desktop, configurable opacity.
        // Opacity is stored as a 0-100 integer so the admin UI is a plain
        // text field; the frontend divides by 100 before applying.
        ->serializeToForum('fbsfb.hero_deco_enabled',    'ernestdefoe-fbsfb.hero_deco_enabled',    'boolval', true)
        ->serializeToForum('fbsfb.hero_deco_icon_count', 'ernestdefoe-fbsfb.hero_deco_icon_count', 'intval', 2)
        ->serializeToForum('fbsfb.hero_deco_opacity',    'ernestdefoe-fbsfb.hero_deco_opacity',    'intval', 12)
        ->default('ernestdefoe-fbsfb.widget_live_scores',   '1')
        ->default('ernestdefoe-fbsfb.widget_trending',      '1')
        ->default('ernestdefoe-fbsfb.widget_top_recruits',  '1')
        ->default('ernestdefoe-fbsfb.hero_deco_enabled',    '1')
        ->default('ernestdefoe-fbsfb.hero_deco_icon_count', '2')
        ->default('ernestdefoe-fbsfb.hero_deco_opacity',    '12'),
];
