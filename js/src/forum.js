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

  // ── 1. Remove left sidebar ─────────────────────────────────────────────────
  // IndexSidebar holds nav + new-discussion. We replace it with null and
  // re-introduce the button in the toolbar and nav in the header.
  override(IndexPage.prototype, 'sidebar', function () {
    return null;
  });

  // ── 2. Header navigation ───────────────────────────────────────────────────
  // HeaderPrimary.items() is the correct extension point for adding items to
  // the primary header area. We inject a nav block with tag-based links.
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

  // ── 3. "Start a Discussion" button in toolbar ──────────────────────────────
  // actionItems() populates the right side of the IndexPage toolbar.
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
      }, [m('i.fas.fa-pencil-alt'), '  Start a Discussion']),
      100
    );
  });

  // ── 4. Right widget sidebar ────────────────────────────────────────────────
  extend(IndexPage.prototype, 'contentItems', function (items) {
    items.add('gn-widgets',
      m('.GN-widgetSidebar', [
        m(LiveScoresWidget),
        m(TrendingWidget),
        m(TopRecruitsWidget),
        m(OnlineNowWidget),
      ]),
      -100
    );
  });

  // ── 5. Hero: always visible + stats bar + chips ────────────────────────────
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  extend(WelcomeHero.prototype, 'bodyItems', function (items) {
    items.add('gn-extras', m(GridIronHero), 50);
  });
});
