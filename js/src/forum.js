import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage          from 'flarum/forum/components/IndexPage';
import IndexSidebar       from 'flarum/forum/components/IndexSidebar';
import WelcomeHero        from 'flarum/forum/components/WelcomeHero';
import DiscussionHero     from 'flarum/forum/components/DiscussionHero';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';
import GNHeroNav         from './forum/components/GNHeroNav';
import GNComposerTrigger from './forum/components/GNComposerTrigger';

/**
 * Forum-frontend wiring.
 *
 * Layout (PageStructure-rendered, top to bottom):
 *
 *   .Page-hero
 *     <WelcomeHero>            — title, subtitle, stats, composer trigger
 *     <GNHeroNav>               — pill nav row, OUTSIDE the gradient
 *   .Page-container
 *     .Page-content              — discussion list (toolbar + DiscussionList)
 *     .Page-sidebar              — IndexSidebar (hidden chrome) + widget stack
 *
 * Visual extras layered on top:
 *   - WelcomeHero bodyItems    — football-pattern SVG + yard-line band
 *   - DiscussionHero bodyItems — semi-transparent FA tag icon at right
 *   - GridIronHero stats       — ONLINE tile opens a dropdown of online users
 */
app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── 1. Force the WelcomeHero to always render ─────────────────────────────
  // Honor the operator's empty-title escape hatch (blank welcomeTitle =
  // hide the hero) but ignore the per-visitor localStorage dismiss flag
  // so visitors can't make our themed hero disappear.
  override(WelcomeHero.prototype, 'isHidden', function () {
    const title = app.forum.attribute('welcomeTitle');
    return !title || !String(title).trim();
  });

  // ── 2. Strip the dismiss-button + add hero stats + composer trigger ───────
  // contentItems() lives inside .containerNarrow nested in the hero
  // gradient. Reading order top-to-bottom:
  //   title (100) → subtitle (default ~10) → stats (50) → composer (30)
  // The pill nav row (GNHeroNav) deliberately renders OUTSIDE the hero —
  // see the override(hero) below — so it reads on the page bg instead
  // of the gradient.
  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.remove('dismiss-button');
  });

  extend(WelcomeHero.prototype, 'contentItems', function (items) {
    items.add('gn-hero-extras', m(GridIronHero), 50);
    items.add('gn-composer',    m(GNComposerTrigger), 30);
  });

  // ── 3. Hero slot = [WelcomeHero, GNHeroNav] as siblings ───────────────────
  // IndexPage.hero() returns a single component by default. Override to
  // return a fragment so the pill nav row renders right below the
  // gradient hero, on the page background — easier to read than nav
  // sitting on the crimson and not constrained by the hero copy.
  override(IndexPage.prototype, 'hero', function () {
    return [
      m(WelcomeHero),
      m(GNHeroNav),
    ];
  });

  // ── 4. DiscussionHero — decorative FontAwesome tag icons ──────────────────
  // Anchors up to two big semi-transparent tag icons to the right side
  // of every tagged discussion's hero, mirroring ramon/avocado's
  // `.DiscussionHero-decorationIcon` + `has-two-deco-icons` pattern.
  //
  // Rules:
  //   - SECONDARY tags only. A tag qualifies when `tag.parent()`
  //     returns truthy (i.e. it's nested under a primary tag) AND it
  //     has an icon class set in the flarum/tags admin.
  //   - Up to 2 icons rendered, controlled by the
  //     `hero_deco_icon_count` admin setting (1 or 2). The 2-icon
  //     layout requires ≥ 768px viewport width — on tablet/phone we
  //     fall back to a single icon to avoid layout compression.
  //   - Opacity is the `hero_deco_opacity` admin setting (0–100,
  //     default 12). Applied via a CSS custom property so the LESS
  //     reads `color-mix(in srgb, white calc(var(--gn-deco-opacity, …)
  //     * 100%), transparent)`. An admin setting of 0 hides the
  //     decoration entirely without changing the markup.
  //   - The whole feature is gated by `hero_deco_enabled` so an
  //     operator can turn the decoration off without losing tag-icon
  //     metadata.
  extend(DiscussionHero.prototype, 'bodyItems', function (items) {
    if (app.forum.attribute('fbsfb.hero_deco_enabled') === false) return;

    const discussion = this.attrs.discussion;
    if (!discussion) return;

    const tags = (discussion.tags && discussion.tags()) || [];
    if (!tags.length) return;

    // Secondary tags = tags with a parent set. flarum/tags exposes the
    // parent relation via tag.parent(); if the relation isn't loaded
    // (rare on the discussion page where the bootstrap eagerLoads
    // tags + parents), tag.parent() returns false and we correctly
    // skip the tag.
    const secondaryWithIcon = tags.filter((t) =>
      t && t.parent && t.parent() && t.icon && t.icon()
    );
    if (!secondaryWithIcon.length) return;

    const wideEnoughForTwo = typeof window !== 'undefined' && window.innerWidth > 767;
    const requestedCount   = Math.min(2, Math.max(1,
      parseInt(app.forum.attribute('fbsfb.hero_deco_icon_count'), 10) || 2
    ));
    const renderCount = wideEnoughForTwo ? requestedCount : 1;

    const picked = secondaryWithIcon.slice(0, renderCount);
    if (!picked.length) return;

    const opacityPct = Math.min(100, Math.max(0,
      parseInt(app.forum.attribute('fbsfb.hero_deco_opacity'), 10)
    ));
    if (opacityPct === 0) return;

    items.add(
      'gn-hero-deco-icons',
      m('.GN-discussionHero-icons',
        {
          'aria-hidden': 'true',
          'data-icon-count': picked.length,
          style: { '--gn-deco-opacity': (opacityPct / 100).toFixed(2) },
        },
        picked.map((tag, i) =>
          m('span.GN-discussionHero-icon', {
            key: tag.id ? tag.id() : i,
            style: tag.color && tag.color() ? { color: tag.color() } : null,
          },
            m('i', { className: tag.icon() })
          )
        )
      ),
      1
    );
  });

  // ── 5. Sidebar: keep IndexSidebar (hidden), append widget stack ───────────
  // CSS flips the .Page-container flex direction so the sidebar lands on
  // the right of the discussion list. IndexSidebar stays mounted so its
  // navItems() can feed our hero pill row + GNComposerTrigger's click
  // delegate (.IndexPage-newDiscussion) is still in the DOM.
  //
  // Each widget honors an admin setting — when toggled off via the
  // extension page, the widget's `shouldRender()` returns false and
  // Mithril doesn't render it. We still mount the components and let
  // them self-gate so the toggle is a runtime concern, not a wiring
  // concern.
  override(IndexPage.prototype, 'sidebar', function (original) {
    const showLive     = app.forum.attribute('fbsfb.widget_live_scores')  !== false;
    const showTrending = app.forum.attribute('fbsfb.widget_trending')     !== false;
    const showRecruits = app.forum.attribute('fbsfb.widget_top_recruits') !== false;

    return [
      original(),
      m('.GN-widgetSidebar', [
        showLive     ? m(LiveScoresWidget)  : null,
        showTrending ? m(TrendingWidget)    : null,
        showRecruits ? m(TopRecruitsWidget) : null,
      ]),
    ];
  });
});
