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
    const base = app.forum.attribute('apiUrl') || '/api';
    fetch(`${base}/discussions?sort=-lastPostedAt&page[limit]=5`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/vnd.api+json' },
    })
      .then((r) => r.json())
      .then((data) => {
        this.discussions = (data.data || []).map((d) => ({
          id:           d.id,
          title:        d.attributes?.title || '',
          commentCount: d.attributes?.commentCount || 0,
          lastPostedAt: d.attributes?.lastPostedAt,
          slug:         d.attributes?.slug,
          tags:         [],
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
    return m('.GN-widget.GN-trendingWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-fire'),
        ' Trending',
      ]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : !this.discussions.length
          ? m('.GN-widget-empty', 'No discussions yet')
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
            ? [' · ', humanTime(new Date(d.lastPostedAt))]
            : null,
        ]),
      ]),
    ]);
  }
}
