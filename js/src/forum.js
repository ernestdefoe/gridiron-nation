import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import WelcomeHero  from 'flarum/forum/components/WelcomeHero';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── Sidebar widgets ────────────────────────────────────────────────────────
  // In Flarum 2 the sidebar lives in IndexSidebar.items(), not
  // IndexPage.sidebarItems() (which no longer exists).
  extend(IndexSidebar.prototype, 'items', function (items) {
    items.add('gn-live-scores',  m(LiveScoresWidget),  110);
    items.add('gn-trending',     m(TrendingWidget),    100);
    items.add('gn-recruits',     m(TopRecruitsWidget),  90);
    items.add('gn-online',       m(OnlineNowWidget),    80);
  });

  // ── Hero: always show + inject stats/chips ─────────────────────────────────
  // WelcomeHero.isHidden() returns true when no welcomeTitle is set in admin,
  // suppressing the entire hero. For a theme the hero is always desired.
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  // Inject our stats bar + conference chips into the hero body.
  // bodyItems() priority 50 puts it below the content block (80) and
  // dismiss button (100).
  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.add('gn-extras', m(GridIronHero), 50);
  });
});
