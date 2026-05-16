import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage   from 'flarum/forum/components/IndexPage';
import WelcomeHero from 'flarum/forum/components/WelcomeHero';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── Right widget sidebar ───────────────────────────────────────────────────
  // Flarum 2 has no built-in right sidebar on IndexPage. We inject a
  // .GN-widgetSidebar as an extra PageStructure content child, then use
  // CSS Grid on .Page-content to place it in column 2 (right side).
  extend(IndexPage.prototype, 'view', function (vnode) {
    if (!vnode) return;
    // Normalise children to an array (Mithril may store a single child directly)
    if (!Array.isArray(vnode.children)) {
      vnode.children = vnode.children != null ? [vnode.children] : [];
    }
    vnode.children.push(
      m('.GN-widgetSidebar', [
        m(LiveScoresWidget),
        m(TrendingWidget),
        m(TopRecruitsWidget),
        m(OnlineNowWidget),
      ])
    );
  });

  // ── Hero: always visible + stats/chips ────────────────────────────────────
  // WelcomeHero.isHidden() returns true when no welcomeTitle is set in admin,
  // suppressing the entire hero. For a theme we always want the hero shown.
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  // Inject GridIronHero (stats bar + conference chips) into the hero body
  // at priority 50 — below the content block (80) and dismiss button (100).
  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.add('gn-extras', m(GridIronHero), 50);
  });
});
