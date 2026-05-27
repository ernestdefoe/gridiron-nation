import app from 'flarum/admin/app';

app.initializers.add('ernestdefoe-fbsfb', () => {
  // Register widget-visibility toggles on the extension's admin page.
  // Each one is a checkbox bound to the same setting key declared in
  // extend.php → Extend\Settings::serializeToForum. The forum-side
  // widgets read these via app.forum.attribute('fbsfb.widget_*') and
  // skip rendering when explicitly false.
  app.extensionData
    .for('ernestdefoe-fbsfb')
    .registerSetting({
      setting:  'ernestdefoe-fbsfb.widget_live_scores',
      label:    app.translator.trans('ernestdefoe-fbsfb.admin.settings.widget_live_scores'),
      help:     app.translator.trans('ernestdefoe-fbsfb.admin.settings.widget_live_scores_help'),
      type:     'boolean',
    })
    .registerSetting({
      setting:  'ernestdefoe-fbsfb.widget_trending',
      label:    app.translator.trans('ernestdefoe-fbsfb.admin.settings.widget_trending'),
      help:     app.translator.trans('ernestdefoe-fbsfb.admin.settings.widget_trending_help'),
      type:     'boolean',
    })
    .registerSetting({
      setting:  'ernestdefoe-fbsfb.widget_top_recruits',
      label:    app.translator.trans('ernestdefoe-fbsfb.admin.settings.widget_top_recruits'),
      help:     app.translator.trans('ernestdefoe-fbsfb.admin.settings.widget_top_recruits_help'),
      type:     'boolean',
    })
    // ── DiscussionHero decoration icons ─────────────────────────────────
    .registerSetting({
      setting:  'ernestdefoe-fbsfb.hero_deco_enabled',
      label:    app.translator.trans('ernestdefoe-fbsfb.admin.settings.hero_deco_enabled'),
      help:     app.translator.trans('ernestdefoe-fbsfb.admin.settings.hero_deco_enabled_help'),
      type:     'boolean',
    })
    .registerSetting({
      setting:  'ernestdefoe-fbsfb.hero_deco_icon_count',
      label:    app.translator.trans('ernestdefoe-fbsfb.admin.settings.hero_deco_icon_count'),
      help:     app.translator.trans('ernestdefoe-fbsfb.admin.settings.hero_deco_icon_count_help'),
      type:     'select',
      options:  { '1': '1', '2': '2' },
      default:  '2',
    })
    .registerSetting({
      setting:    'ernestdefoe-fbsfb.hero_deco_opacity',
      label:      app.translator.trans('ernestdefoe-fbsfb.admin.settings.hero_deco_opacity'),
      help:       app.translator.trans('ernestdefoe-fbsfb.admin.settings.hero_deco_opacity_help'),
      type:       'number',
      min:        0,
      max:        100,
      step:       1,
      default:    12,
    });
});
