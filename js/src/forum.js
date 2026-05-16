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
  // Add via contentItems() — the proper Flarum 2 API for IndexPage content.
  // This ensures our sidebar is in the contentItems() array from the start,
  // avoiding the fragile vnode.children mutation approach.
  // CSS Grid on .Page-content with `> * { grid-column: 1 }` forces every
  // other child to column 1, while .GN-widgetSidebar overrides to column 2.
  extend(IndexPage.prototype, 'contentItems', function (items) {
    items.add('gn-widgets',
      m('.GN-widgetSidebar', [
        m(LiveScoresWidget),
        m(TrendingWidget),
        m(TopRecruitsWidget),
        m(OnlineNowWidget),
      ]),
      -100   // very low priority → rendered last, placed in col 2 by CSS
    );
  });

  // ── Hero: always visible + stats/chips ────────────────────────────────────
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.add('gn-extras', m(GridIronHero), 50);
  });
});
