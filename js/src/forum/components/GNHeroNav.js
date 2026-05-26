import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
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
    // Instantiate a real IndexSidebar to collect its navItems list.
    // navItems() today doesn't touch `this`, but `new IndexSidebar()`
    // + explicit `.attrs = {}` gives any future Flarum implementation
    // a valid component instance to read from. Wrapped in try/catch
    // so a constructor side-effect or a breaking change in
    // navItems()'s signature yields a hidden nav rather than a broken
    // hero render.
    let itemList;
    try {
      const sidebar = new IndexSidebar();
      sidebar.attrs = {};
      itemList = sidebar.navItems();
    } catch (e) {
      return null;
    }

    // Drop entries that don't belong in a horizontal pill row:
    //   - 'allDiscussions' — implicit; we ARE on the home page.
    //   - 'loading'        — placeholder.
    //   - 'tags'           — the top-level "Tags" link from flarum/tags;
    //                        excluded so the pill row stays terse and
    //                        the tag chips inside GridIronHero are the
    //                        canonical tag-browse surface.
    //   - 'moreTags'       — overflow link from flarum/tags.
    //   - 'separator'      — divider between tag groups.
    ['allDiscussions', 'loading', 'tags', 'moreTags', 'separator'].forEach((k) =>
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

    return m('nav.GN-heroNav', { 'aria-label': 'Sections' }, items);
  }
}
