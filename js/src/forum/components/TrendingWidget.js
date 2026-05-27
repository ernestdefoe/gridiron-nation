import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import humanTime from 'flarum/common/utils/humanTime';

/**
 * TrendingWidget — Phase 3
 *
 * Shows the 5 most recently active discussions from the Flarum API.
 * Refreshes every 5 minutes.
 */
export default class TrendingWidget extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.discussions = [];
    this.loading     = true;
    this._timer      = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this.fetch();
    this._timer = setInterval(() => this.fetch(), 5 * 60_000);
  }

  onremove(vnode) {
    super.onremove(vnode);
    clearInterval(this._timer);
  }

  fetch() {
    // Use the canonical store API instead of a raw fetch+JSON:API unpack.
    // The store handles model deserialization, relationship hydration,
    // and the client-side cache for us; we just read attributes off the
    // returned Discussion models below.
    app.store
      .find('discussions', { sort: '-lastPostedAt', 'page[limit]': 5 })
      .then((discussions) => {
        this.discussions = (discussions || []).map((d) => ({
          id:           d.id(),
          title:        d.title() || '',
          commentCount: d.commentCount() || 0,
          lastPostedAt: d.lastPostedAt(),
          slug:         d.slug(),
        }));
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        m.redraw();
      });
  }

  view() {
    const t = (key) => app.translator.trans(`ernestdefoe-gridiron-nation.forum.widgets.${key}`);

    return m('.GN-widget.GN-trendingWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-fire'),
        ' ',
        t('trending'),
      ]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : !this.discussions.length
          ? m('.GN-widget-empty', t('trending_empty'))
          : this.discussions.map((d, i) => this.viewItem(d, i + 1)),
      ]),
    ]);
  }

  viewItem(d, rank) {
    return m('a.GN-trending-item', {
      key:  d.id,
      href: app.route('discussion', { id: d.slug || d.id }),
      onclick: (e) => { e.preventDefault(); m.route.set(app.route('discussion', { id: d.slug || d.id })); },
    }, [
      m('span.GN-trending-rank', { class: rank <= 2 ? 'is-top' : '' }, rank),
      m('.GN-trending-info', [
        m('.GN-trending-title', d.title),
        m('.GN-trending-meta', [
          m('i.fas.fa-comment-alt'),
          ' ',
          d.commentCount,
          d.lastPostedAt
            ? [' · ', humanTime(d.lastPostedAt)]
            : null,
        ]),
      ]),
    ]);
  }
}
