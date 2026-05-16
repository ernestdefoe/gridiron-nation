import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage          from 'flarum/forum/components/IndexPage';
import WelcomeHero        from 'flarum/forum/components/WelcomeHero';
import HeaderPrimary      from 'flarum/forum/components/HeaderPrimary';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── 1. Always show the WelcomeHero ────────────────────────────────────────
  // Default isHidden() returns true when welcomeTitle is not set in admin.
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  // ── 2. Mount GridIronHero stats+chips INTO the hero's .container ──────────
  // WelcomeHero has no bodyItems() in Flarum 2. We use oncreate to append
  // a mount point into .container so our flex CSS places it on the right.
  extend(WelcomeHero.prototype, 'oncreate', function (vnode) {
    const container = vnode.dom.querySelector('.container, .containerNarrow');
    if (!container) return;
    const el = document.createElement('div');
    container.appendChild(el);
    this._heroExtrasEl = el;
    m.mount(el, { view: () => m(GridIronHero) });
  });

  extend(WelcomeHero.prototype, 'onremove', function () {
    if (this._heroExtrasEl) {
      m.mount(this._heroExtrasEl, null);
      this._heroExtrasEl = null;
    }
  });

  // ── 3. Mount right widget sidebar into IndexPage's .sideNavContainer ──────
  // IndexPage has no contentItems() in Flarum 2. We append .GN-widgetSidebar
  // to .sideNavContainer in oncreate. CSS flexbox (on .sideNavContainer)
  // places it to the right of .IndexPage-results.
  extend(IndexPage.prototype, 'oncreate', function (vnode) {
    const sideNavContainer = vnode.dom.querySelector('.sideNavContainer');
    if (!sideNavContainer) return;
    const el = document.createElement('div');
    el.className = 'GN-widgetSidebar';
    sideNavContainer.appendChild(el);
    this._widgetEl = el;
    m.mount(el, {
      view: () => [
        m(LiveScoresWidget),
        m(TrendingWidget),
        m(TopRecruitsWidget),
        m(OnlineNowWidget),
      ],
    });
  });

  extend(IndexPage.prototype, 'onremove', function () {
    if (this._widgetEl) {
      m.mount(this._widgetEl, null);
      this._widgetEl = null;
    }
  });

  // ── 4. Header navigation ──────────────────────────────────────────────────
  // Add a styled "Discussions" link. Other extensions (social-groups, etc.)
  // each add their own items via this same hook — no need to list them here.
  extend(HeaderPrimary.prototype, 'items', function (items) {
    items.add('gn-discussions',
      m('a.GN-headerNav-link', {
        href:    app.route('index'),
        onclick: (e) => { e.preventDefault(); m.route.set(app.route('index')); },
      }, 'Discussions'),
      80
    );
  });

  // ── 5. "Start a Discussion" button in toolbar ─────────────────────────────
  // actionItems() exists in Flarum 2's IndexPage — safe to extend.
  extend(IndexPage.prototype, 'actionItems', function (items) {
    if (!app.session.user) return;

    items.add('gn-new-discussion',
      m('button.Button.Button--primary.GN-startDiscBtn', {
        onclick: () => {
          app.composer.load(
            () => DiscussionComposer,
            { user: app.session.user }
          ).then(() => app.composer.show());
        },
      }, [m('i.fas.fa-pencil-alt'), ' Start a Discussion']),
      100
    );
  });
});
