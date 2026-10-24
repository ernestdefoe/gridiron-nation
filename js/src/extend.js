import app from 'flarum/admin/app';
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
      setting: 'ernestdefoe-gridiron-nation.widget_live_scores',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.widget_live_scores'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.widget_live_scores_help'),
      type: 'boolean',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-gridiron-nation.widget_trending',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.widget_trending'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.widget_trending_help'),
      type: 'boolean',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-gridiron-nation.widget_top_recruits',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.widget_top_recruits'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.widget_top_recruits_help'),
      type: 'boolean',
    }))

    // ── DiscussionHero secondary-tag icon decoration ────────────────────────
    .setting(() => ({
      setting: 'ernestdefoe-gridiron-nation.hero_deco_enabled',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_deco_enabled'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_deco_enabled_help'),
      type: 'boolean',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-gridiron-nation.hero_deco_icon_count',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_deco_icon_count'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_deco_icon_count_help'),
      type: 'select',
      options: { 1: '1', 2: '2' },
      default: '2',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-gridiron-nation.hero_deco_opacity',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_deco_opacity'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_deco_opacity_help'),
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      placeholder: '35',
    }))

    // ── DiscussionHero layout ───────────────────────────────────────────────
    .setting(() => ({
      setting: 'ernestdefoe-gridiron-nation.hero_align',
      label: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_align'),
      help: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_align_help'),
      type: 'select',
      options: {
        left: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_align_left'),
        center: app.translator.trans('ernestdefoe-gridiron-nation.admin.settings.hero_align_center'),
      },
      default: 'left',
    })),
];
