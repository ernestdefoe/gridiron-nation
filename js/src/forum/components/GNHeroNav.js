import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import extractText from 'flarum/common/utils/extractText';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

/**
 * GNHeroNav — pill-row navigation rendered under the WelcomeHero.
 *
 * Mirrors the MosaicHeroNav pattern: pull items from Flarum's canonical
 * IndexSidebar.navItems() ItemList. That's the same list flarum/tags,
 * flarum/subscriptions, and the social-groups extension push entries
 * into — anything installed extension contributes appears in the pill
 * row automatically, no per-extension wiring.
 *
 * Hidden on phone: Flarum's stock .App-titleControl SelectDropdown
 * escapes via position:absolute next to the page title and already
 * carries the same items. Duplicating the pills on phone would just
 * clutter the hero.
 */
export default class GNHeroNav extends Component {
  view() {
    // Collect IndexSidebar's navItems ItemList WITHOUT constructing the
    // component (which would run Component's constructor + lifecycle hooks
    // outside Mithril's control). Core's navItems() — and every extension
    // extender chained onto its prototype (flarum/tags, subscriptions, …) —
    // reads `app` globals rather than `this`, so invoking the prototype
    // method against a minimal `{ attrs: {} }` context yields the same
    // ItemList safely. try/catch keeps a breaking upstream change from
    // taking down the whole hero render — we just hide the nav instead.
    let itemList;
    try {
      itemList = IndexSidebar.prototype.navItems.call({ attrs: {} });
    } catch (e) {
      return null;
    }

    // Drop entries that don't belong in a horizontal pill row:
    //   - 'allDiscussions' — implicit; we ARE on the home page.
    //   - 'loading'        — placeholder.
    //   - 'moreTags'       — overflow link from flarum/tags.
    //   - 'separator'      — divider between tag groups.
    //
    // The top-level 'tags' link IS kept (it routes to /tags, the
    // browse-all-tags page) since the hero no longer carries tag chips
    // — operators wanted a single "Tags" pill in the nav instead.
    // Per-tag rows ARE still stripped via the .model attr / `/t/` href
    // filter below so the row stays terse rather than ballooning to
    // every individual tag.
    ['allDiscussions', 'loading', 'moreTags', 'separator'].forEach((k) =>
      itemList.remove(k)
    );

    const items = itemList.toArray().filter((vnode) => {
      if (!vnode || typeof vnode.tag === 'string') return false;
      const attrs = vnode.attrs || {};
      // Strip per-tag entries — they ship with a `model` attr.
      if ('model' in attrs) return false;
      const href = String(attrs.href || '');
      if (/\/t\//.test(href)) return false;
      return true;
    });

    if (!items.length) return null;

    return m('nav.GN-heroNav', {
      'aria-label': extractText(app.translator.trans('ernestdefoe-gridiron-nation.forum.nav.sections_label')),
    }, items);
  }
}
