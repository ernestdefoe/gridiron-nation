import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── Sidebar widgets ────────────────────────────────────────────────────────
  extend(IndexPage.prototype, 'sidebarItems', function (items) {
    items.add('gn-live-scores',  m(LiveScoresWidget),  110);
    items.add('gn-trending',     m(TrendingWidget),    100);
    items.add('gn-recruits',     m(TopRecruitsWidget),  90);
    items.add('gn-online',       m(OnlineNowWidget),    80);
  });

  // ── Hero extras: stats bar + conference tag chips ──────────────────────────
  // Flarum 2's IndexPage renders hero() → WelcomeHero. We extend heroProps to
  // inject our extras below the subtitle. If heroProps doesn't exist we fall
  // back to extending the hero vnode directly.
  try {
    extend(IndexPage.prototype, 'hero', function (vnode) {
      if (!vnode || !vnode.children) return;
      // Append extras after existing hero children
      if (Array.isArray(vnode.children)) {
        vnode.children.push(m(GridIronHero));
      } else {
        // Hero children may be nested — find the inner container
        const inner = vnode.children;
        if (inner && inner.children) {
          if (Array.isArray(inner.children)) {
            inner.children.push(m(GridIronHero));
          }
        }
      }
    });
  } catch (e) {
    // Hero extension not critical — silently skip if structure differs
  }
});
