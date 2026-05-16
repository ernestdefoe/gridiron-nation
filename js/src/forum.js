import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage        from 'flarum/forum/components/IndexPage';
import WelcomeHero      from 'flarum/forum/components/WelcomeHero';
import HeaderPrimary    from 'flarum/forum/components/HeaderPrimary';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── 1. Always show the WelcomeHero ────────────────────────────────────────
  // isHidden() returns true when no welcomeTitle is set — override to false.
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  // ── 2. Inject GridIronHero stats+chips INTO the WelcomeHero vnode ─────────
  // WelcomeHero.view() returns <header class="Hero WelcomeHero">
  //   <div class="container">...</div>
  // </header>
  // We push GridIronHero into .container so it appears as a flex sibling
  // to the title/subtitle, placed on the right by justify-content: space-between.
  // NOTE: WelcomeHero has no bodyItems() in Flarum 2 — vnode mutation is safe.
  extend(WelcomeHero.prototype, 'view', function (vnode) {
    if (!vnode) return; // hero returned null (would be hidden)
    try {
      // vnode         = <header class="Hero WelcomeHero">
      // vnode.children[0] = <div class="container"> (or only child)
      const children  = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
      const container = children[0];
      if (!container) return;

      if (Array.isArray(container.children)) {
        container.children.push(m(GridIronHero));
      } else {
        container.children = [container.children, m(GridIronHero)].filter(Boolean);
      }
    } catch (e) {
      // Structure didn't match — skip hero extras silently.
    }
  });

  // ── 3. Inject right widget sidebar via IndexPage view() vnode mutation ─────
  // IndexPage.view() renders:
  //   div.IndexPage
  //     {hero}                                   ← children[0]
  //     div.container                            ← children[1]
  //       div.sideNavContainer
  //         nav.IndexPage-nav.sideNav            ← left nav (hidden via CSS)
  //         div.IndexPage-results.sideNavOffset  ← main content
  //
  // We push .GN-widgetSidebar as a 3rd child of .sideNavContainer.
  // CSS (flexbox on .sideNavContainer) places it to the right of .IndexPage-results.
  // NOTE: IndexPage has no contentItems() in Flarum 2 — vnode mutation is correct.
  extend(IndexPage.prototype, 'view', function (vnode) {
    try {
      // children[1] = div.container, .children[0] = div.sideNavContainer
      const sideNavContainer = vnode.children[1].children[0];
      if (!Array.isArray(sideNavContainer.children)) return;
      sideNavContainer.children.push(
        m('.GN-widgetSidebar', [
          m(LiveScoresWidget),
          m(TrendingWidget),
          m(TopRecruitsWidget),
          m(OnlineNowWidget),
        ])
      );
    } catch (e) {
      // Structure didn't match — skip widget sidebar silently.
    }
  });

  // ── 4. Header navigation ──────────────────────────────────────────────────
  // HeaderPrimary.items() is the correct extension point for header nav.
  extend(HeaderPrimary.prototype, 'items', function (items) {
    const tags = (app.store.all('tags') || [])
      .filter((t) => !t.attribute('parentId'))
      .slice(0, 6);

    items.add('gn-nav',
      m('nav.GN-headerNav', [
        m('a.GN-headerNav-link', {
          href:    app.route('index'),
          onclick: (e) => { e.preventDefault(); m.route.set(app.route('index')); },
        }, 'Discussions'),
        ...tags.map((tag) =>
          m('a.GN-headerNav-link', {
            key:     tag.id(),
            href:    app.route('tag', { slug: tag.attribute('slug') }),
            onclick: (e) => {
              e.preventDefault();
              m.route.set(app.route('tag', { slug: tag.attribute('slug') }));
            },
          }, tag.attribute('name'))
        ),
      ]),
      80
    );
  });

  // ── 5. "Start a Discussion" button in toolbar ─────────────────────────────
  // actionItems() exists in IndexPage — safe to extend.
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
