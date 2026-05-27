import Admin from 'flarum/common/extenders/Admin';

/**
 * Admin extender — registers the theme's settings fields on the
 * extension's admin page. Flarum 2's canonical pattern: each .setting()
 * call takes a function that returns the field config. The
 * `extend` array is re-exported from admin.js so the build picks it
 * up via webpack's flarum-webpack-config plugin.
 *
 * Why this lives in extend.js and NOT inside app.initializers.add:
 * `app.extensionData` is registered by a core admin initializer that
 * may not have run yet when our own initializer fires (depending on
 * registration order), producing `TypeError: undefined is not an
 * object (evaluating 'app.extensionData.for')`. The Admin extender
 * pipeline runs at the right point in the boot sequence with no
 * ordering hazard.
 */
export default [
  new Admin()
    // ── Sidebar widget toggles ──────────────────────────────────────────────
    .setting(() => ({
      setting:  'ernestdefoe-fbsfb.widget_live_scores',
      label:    'Show Live Scores widget',
      help:     'Sidebar ticker that scrolls through in-progress NCAA football scores. Powered by an internal ESPN proxy with a 60s server-side cache.',
      type:     'boolean',
    }))
    .setting(() => ({
      setting:  'ernestdefoe-fbsfb.widget_trending',
      label:    'Show Trending widget',
      help:     'Sidebar widget listing the five most recently active discussions on the forum.',
      type:     'boolean',
    }))
    .setting(() => ({
      setting:  'ernestdefoe-fbsfb.widget_top_recruits',
      label:    'Show Top Recruits widget',
      help:     'Sidebar widget that reads from the ernestdefoe/recruiting extension. Requires that extension to be installed and a CollegeFootballData.com API key configured.',
      type:     'boolean',
    }))

    // ── DiscussionHero secondary-tag icon decoration ────────────────────────
    .setting(() => ({
      setting:  'ernestdefoe-fbsfb.hero_deco_enabled',
      label:    'Show FontAwesome decoration in discussion hero',
      help:     'Anchors a large semi-transparent FontAwesome glyph to the right side of every discussion hero, pulled from any secondary (child) tag with an icon. Set the icon per-tag in the Flarum Tags admin panel.',
      type:     'boolean',
    }))
    .setting(() => ({
      setting:  'ernestdefoe-fbsfb.hero_deco_icon_count',
      label:    'Number of decoration icons',
      help:     'Up to 2 icons on desktop (≥ 768px viewport). Tablet and phone always show a single icon to avoid layout compression.',
      type:     'select',
      options:  { '1': '1', '2': '2' },
      default:  '2',
    }))
    .setting(() => ({
      setting:     'ernestdefoe-fbsfb.hero_deco_opacity',
      label:       'Decoration icon opacity (0–100)',
      help:        'Percentage opacity for the glyph against the hero background. Default 12. Set to 0 to hide without disabling the feature.',
      type:        'number',
      min:         0,
      max:         100,
      step:        1,
      placeholder: '12',
    })),
];
