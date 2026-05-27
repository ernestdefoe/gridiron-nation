import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage          from 'flarum/forum/components/IndexPage';
import IndexSidebar       from 'flarum/forum/components/IndexSidebar';
import WelcomeHero        from 'flarum/forum/components/WelcomeHero';
import DiscussionHero     from 'flarum/forum/components/DiscussionHero';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';
import GNHeroNav         from './forum/components/GNHeroNav';
import GNComposerTrigger from './forum/components/GNComposerTrigger';
import GNDiscussionCard  from './forum/components/GNDiscussionCard';

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
app.initializers.add('ernestdefoe-gridiron-nation', () => {

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
  // Use the canonical items() ItemList extender — the SAME hook
  // flarum/tags uses to add tag pills to the hero. Items are wrapped
  // in <li> via listItems(), which we then absolute-position via CSS
  // (.GN-discussionHero-deco-li). This is more reliable than
  // mutating the returned vdom in place — Mithril's diff sees the
  // ItemList output the moment the hero re-renders.
  extend(DiscussionHero.prototype, 'items', function (items) {
    if (app.forum.attribute('gridiron-nation.hero_deco_enabled') === false) return;

    const discussion = this.attrs.discussion;
    if (!discussion) return;

    const tags = (discussion.tags && discussion.tags()) || [];
    if (!tags.length) return;

    const withIcon = tags.filter((t) => t && typeof t.icon === 'function' && t.icon());
    if (!withIcon.length) return;

    // Prefer secondary tags (those with a parent). Fall back to ANY
    // tag with an icon so flat tag setups still get decoration.
    const secondary = withIcon.filter((t) => {
      if (typeof t.parent !== 'function') return false;
      const p = t.parent();
      return !!p;
    });
    const candidates = secondary.length ? secondary : withIcon;

    const wideEnoughForTwo = typeof window !== 'undefined' && window.innerWidth > 767;
    const requestedCount   = Math.min(2, Math.max(1,
      parseInt(app.forum.attribute('gridiron-nation.hero_deco_icon_count'), 10) || 2
    ));
    const renderCount = wideEnoughForTwo ? requestedCount : 1;

    const picked = candidates.slice(0, renderCount);
    if (!picked.length) return;

    // Default opacity bumped to 35% — the original 12% was so faint on
    // a real install that operators thought the feature wasn't firing.
    // Admin can dial it down via the hero_deco_opacity setting.
    const opacityRaw = parseInt(app.forum.attribute('gridiron-nation.hero_deco_opacity'), 10);
    const opacity = isNaN(opacityRaw) ? 35 : Math.min(100, Math.max(0, opacityRaw));
    if (opacity === 0) return;

    items.add(
      'gn-hero-deco-icons',
      m('.GN-discussionHero-icons',
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
      ),
      -100   // negative priority pushes it after every other item — it's decoration, not content
    );
  });

  // ── 5. Discussion list rows → GNDiscussionCard showcase layout ───────────
  // Override DiscussionListItem.view() to render our showcase card
  // instead of Flarum's stock row. We keep ALL the host machinery
  // (state, subtree retention, slidable behavior, isUnread/isRead
  // calculations) — only the rendered vdom changes.
  //
  // The original `view()` also wires `attrs.className` and Slidable
  // — we reproduce just enough of that wrapper to keep `.active`
  // routing highlighting working.
  override(DiscussionListItem.prototype, 'view', function () {
    return m(GNDiscussionCard, {
      discussion:      this.attrs.discussion,
      params:          this.attrs.params,
      jumpTo:          this.attrs.jumpTo,
      author:          this.attrs.author,
      highlightRegExp: this.highlightRegExp,
    });
  });

  // ── 6. Sidebar: keep IndexSidebar (hidden), append widget stack ───────────
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
    const showLive     = app.forum.attribute('gridiron-nation.widget_live_scores')  !== false;
    const showTrending = app.forum.attribute('gridiron-nation.widget_trending')     !== false;
    const showRecruits = app.forum.attribute('gridiron-nation.widget_top_recruits') !== false;

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
