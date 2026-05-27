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

  // ── 2. Strip the dismiss-button + add composer trigger + hero stats ───────
  // contentItems() lives inside .containerNarrow nested in the hero
  // gradient. Reading order top-to-bottom:
  //   title (100) → subtitle (default ~10) → composer (8) → stats (5)
  //
  // The composer card sits ABOVE the stats. Title/subtitle reads as
  // the welcome message; the next thing the visitor sees is the
  // "what's on your mind" prompt — the primary affordance — with the
  // supporting stat counts below as ambient context. Subtitle's
  // default priority is ~10, so composer at 8 + stats at 5 keep both
  // below the welcome text without inverting them.
  //
  // The pill nav row (GNHeroNav) deliberately renders OUTSIDE the hero —
  // see the override(hero) below — so it reads on the page bg instead
  // of the gradient.
  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.remove('dismiss-button');
  });

  extend(WelcomeHero.prototype, 'contentItems', function (items) {
    items.add('gn-composer',    m(GNComposerTrigger), 8);
    items.add('gn-hero-extras', m(GridIronHero), 5);
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
  // Uses the `view` extender (same pattern flarum/tags uses to add tag
  // pills to the hero — see vendor/flarum/tags/js/src/forum/addTagLabels.js).
  // We mutate the returned vdom in place, pushing our decoration vnode
  // as a direct child of the .Hero <header>. That's more reliable than
  // adding to bodyItems because it doesn't depend on the bodyItems
  // ItemList being unwrapped inside `.container`, and it survives
  // alongside other extensions that override DiscussionHero.view().
  //
  // Rules:
  //   - SECONDARY tags only. A tag qualifies when `tag.parent()`
  //     returns truthy (i.e. it's nested under a primary tag) AND it
  //     has an icon class set in the flarum/tags admin. Falls back to
  //     ANY tag with an icon if no secondary candidates exist — that
  //     way flat tag setups still get decoration.
  //   - Up to 2 icons rendered, controlled by `hero_deco_icon_count`
  //     (1 or 2). The 2-icon layout requires ≥ 768px viewport — on
  //     tablet/phone we fall back to 1 icon.
  //   - Opacity is `hero_deco_opacity` (0–100, default 12), applied
  //     via the `--gn-deco-opacity` CSS custom property. Setting 0
  //     hides the decoration.
  //   - Gated by `hero_deco_enabled`.
  override(DiscussionHero.prototype, 'view', function (original, ...args) {
    const vdom = original.apply(this, args);
    if (!vdom) return vdom;
    if (app.forum.attribute('fbsfb.hero_deco_enabled') === false) return vdom;

    const discussion = this.attrs.discussion;
    if (!discussion) return vdom;

    const tags = (discussion.tags && discussion.tags()) || [];
    if (!tags.length) return vdom;

    // Filter to tags that have an icon set in flarum/tags admin.
    // tag.icon() returns string | null per the Tag model.
    const withIcon = tags.filter((t) => t && typeof t.icon === 'function' && t.icon());
    if (!withIcon.length) return vdom;

    // Prefer secondary tags (those with a parent). Fall back to ANY
    // tag with an icon so flat tag setups still get decoration.
    // tag.parent() returns the parent Tag or false when no parent —
    // unequal-to-false captures both a loaded Tag model and any
    // truthy stand-in.
    const secondary = withIcon.filter((t) => {
      if (typeof t.parent !== 'function') return false;
      const p = t.parent();
      return !!p;
    });
    const candidates = secondary.length ? secondary : withIcon;

    const wideEnoughForTwo = typeof window !== 'undefined' && window.innerWidth > 767;
    const requestedCount   = Math.min(2, Math.max(1,
      parseInt(app.forum.attribute('fbsfb.hero_deco_icon_count'), 10) || 2
    ));
    const renderCount = wideEnoughForTwo ? requestedCount : 1;

    const picked = candidates.slice(0, renderCount);
    if (!picked.length) return vdom;

    const opacityPct = parseInt(app.forum.attribute('fbsfb.hero_deco_opacity'), 10);
    const opacity = isNaN(opacityPct) ? 12 : Math.min(100, Math.max(0, opacityPct));
    if (opacity === 0) return vdom;

    const decoration = m('.GN-discussionHero-icons',
      {
        'aria-hidden': 'true',
        'data-icon-count': picked.length,
        style: { '--gn-deco-opacity': (opacity / 100).toFixed(2) },
      },
      picked.map((tag, i) =>
        m('span.GN-discussionHero-icon', {
          key: tag.id ? tag.id() : i,
          style: tag.color && tag.color() ? { '--gn-deco-color': tag.color() } : null,
        },
          m('i', { className: tag.icon() })
        )
      )
    );

    // Reconstruct the hero vnode with our decoration appended as a
    // direct child of the <header>. We rebuild via m() instead of
    // mutating vdom.children because Mithril's diffing can miss
    // in-place push() mutations on a vnode that was returned from
    // another component's view. Returning a fresh vnode with the
    // children array Mithril already expects guarantees the
    // decoration ends up in the next render.
    const existingChildren = Array.isArray(vdom.children)
      ? vdom.children
      : (vdom.children != null ? [vdom.children] : []);

    return m(vdom.tag, vdom.attrs, [...existingChildren, decoration]);
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
