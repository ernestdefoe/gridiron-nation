import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';

app.initializers.add('ernestdefoe-fbsfb', () => {
  // ── Inject sidebar widgets into the forum IndexPage ───────────────────────
  // sidebarItems() returns an ItemList; higher priority = rendered first.
  extend(IndexPage.prototype, 'sidebarItems', function (items) {
    items.add('gn-live-scores',  m(LiveScoresWidget),  110);
    items.add('gn-trending',     m(TrendingWidget),    100);
    items.add('gn-recruits',     m(TopRecruitsWidget),  90);
    items.add('gn-online',       m(OnlineNowWidget),    80);
  });
});
