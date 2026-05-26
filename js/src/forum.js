import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage          from 'flarum/forum/components/IndexPage';
import WelcomeHero        from 'flarum/forum/components/WelcomeHero';
import HeaderPrimary      from 'flarum/forum/components/HeaderPrimary';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';

/**
 * Walk a Mithril vnode tree looking for the first DOM element whose className
 * includes `targetClass`, then push `injectedVnode` into its children.
 * Component vnodes (function tags) are skipped — we only traverse DOM elements.
 */
function injectInto(node, targetClass, injectedVnode) {
  if (!node || typeof node !== 'object') return false;
  // Skip component vnodes — their "children" are attrs/slots, not DOM children.
  if (typeof node.tag === 'function' || typeof node.tag === 'object') return false;

  const cls = (node.attrs && (node.attrs.className || node.attrs['class'])) || '';
  if (typeof cls === 'string' && cls.split(' ').includes(targetClass)) {
    if (Array.isArray(node.children)) {
      node.children.push(injectedVnode);
    } else {
      node.children = node.children != null
        ? [node.children, injectedVnode]
        : [injectedVnode];
    }
    return true;
  }

  if (Array.isArray(node.children)) {
    return node.children.some((child) => injectInto(child, targetClass, injectedVnode));
  }
  return false;
}

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── 1. Always show the WelcomeHero ────────────────────────────────────────
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  // ── 2. Inject GridIronHero stats+chips into the hero's .container ─────────
  // WelcomeHero has no bodyItems() in Flarum 2. We use override(view) so the
  // GridIronHero vnode is part of the vdom tree Mithril renders (not appended
  // to the DOM after-the-fact where reconciliation would wipe it).
  override(WelcomeHero.prototype, 'view', function (original, ...args) {
    const vnode = original(...args);
    if (!vnode) return vnode; // isHidden returned true from another extension
    injectInto(vnode, 'container', m(GridIronHero));
    return vnode;
  });

  // ── 3. Inject right widget sidebar into IndexPage's .sideNavContainer ─────
  // IndexPage has no contentItems() in Flarum 2. We override view() so that
  // .GN-widgetSidebar is in the vdom tree as a sibling of .IndexPage-results.
  // CSS flexbox on .sideNavContainer positions it to the right.
  override(IndexPage.prototype, 'view', function (original, ...args) {
    const vnode = original(...args);
    injectInto(vnode, 'sideNavContainer',
      m('.GN-widgetSidebar', [
        m(LiveScoresWidget),
        m(TrendingWidget),
        m(TopRecruitsWidget),
        m(OnlineNowWidget),
      ])
    );
    return vnode;
  });

  // ── 4. Header navigation ──────────────────────────────────────────────────
  // Add a styled "Discussions" link. Social Groups and other extensions each
  // add their own items (Groups, etc.) via this same hook automatically.
  extend(HeaderPrimary.prototype, 'items', function (items) {
    items.add('gn-discussions',
      m('a.GN-headerNav-link', {
        href:    app.route('index'),
        onclick: (e) => { e.preventDefault(); m.route.set(app.route('index')); },
      }, app.translator.trans('ernestdefoe-fbsfb.forum.nav.discussions')),
      80
    );
  });

  // ── 5. "Start a Discussion" button in toolbar ─────────────────────────────
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
      }, [
        m('i.fas.fa-pencil-alt'),
        ' ',
        app.translator.trans('ernestdefoe-fbsfb.forum.nav.start_discussion'),
      ]),
      100
    );
  });
});
