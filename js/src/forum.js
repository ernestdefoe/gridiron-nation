import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage          from 'flarum/forum/components/IndexPage';
import WelcomeHero        from 'flarum/forum/components/WelcomeHero';

import LiveScoresWidget  from './forum/components/LiveScoresWidget';
import TrendingWidget    from './forum/components/TrendingWidget';
import OnlineNowWidget   from './forum/components/OnlineNowWidget';
import TopRecruitsWidget from './forum/components/TopRecruitsWidget';
import GridIronHero      from './forum/components/GridIronHero';
import GNHeroNav         from './forum/components/GNHeroNav';
import GNComposerTrigger from './forum/components/GNComposerTrigger';

/**
 * Walk a Mithril vnode tree looking for the first DOM element whose className
 * includes `targetClass`, then insert `injectedVnode` into its children.
 *
 * Position controls placement:
 *   - 'append'  (default) — added at the end of children (renders below
 *     the existing content of that element).
 *   - 'prepend'           — added at the start (renders above).
 *
 * Component vnodes (function tags) are skipped — we only traverse DOM
 * elements, because component vnode `children` are attrs/slots, not DOM
 * children.
 */
function injectInto(node, targetClass, injectedVnode, position = 'append') {
  if (!node || typeof node !== 'object') return false;
  if (typeof node.tag === 'function' || typeof node.tag === 'object') return false;

  const cls = (node.attrs && (node.attrs.className || node.attrs['class'])) || '';
  if (typeof cls === 'string' && cls.split(' ').includes(targetClass)) {
    if (Array.isArray(node.children)) {
      if (position === 'prepend') node.children.unshift(injectedVnode);
      else                        node.children.push(injectedVnode);
    } else {
      node.children = node.children != null
        ? (position === 'prepend' ? [injectedVnode, node.children] : [node.children, injectedVnode])
        : [injectedVnode];
    }
    return true;
  }

  if (Array.isArray(node.children)) {
    return node.children.some((child) => injectInto(child, targetClass, injectedVnode, position));
  }
  return false;
}

app.initializers.add('ernestdefoe-fbsfb', () => {

  // ── 1. Always show the WelcomeHero ────────────────────────────────────────
  extend(WelcomeHero.prototype, 'isHidden', function () {
    return false;
  });

  // ── 2. Inject GridIronHero stats + hero nav pills into the hero ───────────
  // WelcomeHero has no bodyItems() in Flarum 2 — we override view() so the
  // injected vnodes are part of the vdom tree Mithril renders (not appended
  // to the DOM after-the-fact where reconciliation would wipe them).
  //
  // Both GridIronHero (stats + tag chips) and GNHeroNav (extension nav
  // pills, replacing the old header link) live inside the hero's
  // `.container` so they share the gradient backdrop.
  override(WelcomeHero.prototype, 'view', function (original, ...args) {
    const vnode = original(...args);
    if (!vnode) return vnode;
    injectInto(vnode, 'container', m(GridIronHero));
    injectInto(vnode, 'container', m(GNHeroNav));
    return vnode;
  });

  // ── 3. Inject right widget sidebar into IndexPage's .sideNavContainer ─────
  // IndexPage has no contentItems() in Flarum 2. We override view() so that
  // .GN-widgetSidebar is in the vdom tree as a sibling of .IndexPage-results.
  // CSS flexbox on .sideNavContainer positions it to the right.
  //
  // The composer trigger card sits at the TOP of .IndexPage-results, above
  // the discussion list. It replaces the old `gn-new-discussion` actionItems
  // button — clicking the card delegates to Flarum's hidden
  // `.IndexPage-newDiscussion` button, so we get the async composer chunk
  // load + guest→LogInModal branch for free.
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
    injectInto(vnode, 'IndexPage-results', m(GNComposerTrigger), 'prepend');
    return vnode;
  });
});
