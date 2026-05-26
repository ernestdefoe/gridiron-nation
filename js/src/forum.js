import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage          from 'flarum/forum/components/IndexPage';
import IndexSidebar       from 'flarum/forum/components/IndexSidebar';
import WelcomeHero        from 'flarum/forum/components/WelcomeHero';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';
import GNHeroNav         from './forum/components/GNHeroNav';
import GNComposerTrigger from './forum/components/GNComposerTrigger';

/**
 * Forum-frontend wiring.
 *
 * Earlier iterations of this file tried to inject components by walking
 * the Mithril vnode tree returned from `override(view)` and pushing
 * children into elements that matched a target classname. That worked
 * for the hero (Hero.view() returns a real `<header>`) but silently
 * failed for IndexPage — its `view()` returns `<PageStructure>`, a
 * Component vnode, and the walker correctly skips component vnodes
 * because their `children` are attrs/slots, not DOM children. The
 * widget sidebar and composer trigger never had a target to land in,
 * which is why none of them appeared on the rendered page.
 *
 * The canonical Flarum 2 pattern is ItemList-based extension. Every
 * one of IndexPage / WelcomeHero / IndexSidebar exposes a typed
 * extension point (`contentItems`, `sidebar`, `navItems`) that other
 * extensions and tags push into. We mirror Mosaic's wiring here:
 *   - WelcomeHero.contentItems() — hero stats + tag chips + nav pills
 *   - IndexPage.contentItems()   — composer trigger above the toolbar
 *   - IndexPage.sidebar()        — keep IndexSidebar, append widget stack
 *   - WelcomeHero.isHidden       — force-show even with a dismissed flag
 *   - WelcomeHero.bodyItems      — strip the X-close button so the
 *                                  decoration is genuinely permanent
 */
app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── 1. Force the WelcomeHero to always render ─────────────────────────────
  // Core's isHidden() returns true when welcomeTitle is empty OR when
  // localStorage has a dismissed flag. We honor the empty-title escape
  // hatch (operator can blank the title in admin to opt out) but ignore
  // the per-visitor dismissal so the hero is genuinely permanent.
  override(WelcomeHero.prototype, 'isHidden', function () {
    const title = app.forum.attribute('welcomeTitle');
    return !title || !String(title).trim();
  });

  // ── 2. Strip the dismiss-button + add hero extras + pill nav ──────────────
  // bodyItems() carries the dismiss-button and the title/subtitle block.
  // Remove the close button so the decoration matches the permanent
  // intent. contentItems() is the inner ItemList nested inside
  // .containerNarrow — that's where we add the right-side stats panel
  // and the pill nav row.
  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.remove('dismiss-button');
  });

  extend(WelcomeHero.prototype, 'contentItems', function (items) {
    // GridIronHero renders the stats bar + tag chips + ONLINE dropdown.
    // Priority 50 puts it BELOW title (100) and subtitle (default ~10).
    // The hero stylesheet flexes title/subtitle on one side and these
    // extras on the other via flexbox on .Hero-content.
    items.add('gn-hero-extras', m(GridIronHero), 50);

    // Section nav pills (Discussions, Tags, Subscriptions, etc.) live
    // below the stats so they read as the natural next step after
    // "here's what's going on, here are the sections to dive into".
    items.add('gn-hero-nav', m(GNHeroNav), 40);
  });

  // ── 3. Composer trigger above the discussion list toolbar ─────────────────
  // IndexPage.contentItems() carries 'toolbar' (100) and 'discussionList'
  // (90). We add the composer card at 110 so it lands above both —
  // visually it's the first thing in the main column.
  extend(IndexPage.prototype, 'contentItems', function (items) {
    items.add('gn-composer-trigger', m(GNComposerTrigger), 110);
  });

  // ── 4. Sidebar: keep IndexSidebar, append our widget stack ────────────────
  // IndexPage.sidebar() returns the IndexSidebar component. override()
  // gives us its return value (`original()`) so we can return a fragment
  // of [IndexSidebar, our widgets]. IndexSidebar carries the nav items
  // which still feed our hero pill row (GNHeroNav reads from
  // IndexSidebar.navItems), so it has to stay mounted — CSS hides its
  // visual chrome on desktop and lets the hero pills be the nav.
  override(IndexPage.prototype, 'sidebar', function (original) {
    return [
      original(),
      m('.GN-widgetSidebar', [
        m(LiveScoresWidget),
        m(TrendingWidget),
        m(TopRecruitsWidget),
        m(OnlineNowWidget),
      ]),
    ];
  });
});
