import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import feed from '../feed';
import humanTime from 'flarum/common/helpers/humanTime';

/**
 * TrendingWidget — Phase 3
 *
 * Shows the 5 most recently active discussions from the Flarum API.
 * Refreshes every 5 minutes while the tab is visible, through a
 * page-level feed shared by every mount (see ../feed.js).
 */
// The store API handles model deserialization; we keep a plain snapshot
// of the attributes the widget renders.
const trending = feed(
  () =>
    app.store
      .find('discussions', { sort: '-lastPostedAt', 'page[limit]': 5 })
      .then((discussions) => ({
        value: (discussions || []).map((d) => ({
          id: d.id(),
          title: d.title() || '',
          commentCount: d.commentCount() || 0,
          lastPostedAt: d.lastPostedAt(),
          slug: d.slug(),
        })),
      }))
      .catch(() => ({ value: [] })),
  5 * 60_000
);

export default class TrendingWidget extends Component {
  oncreate(vnode) {
    super.oncreate(vnode);
    trending.attach();
  }

  onremove(vnode) {
    super.onremove(vnode);
    trending.detach();
  }

  get loading() {
    return !trending.loaded();
  }

  get discussions() {
    return trending.get() || [];
  }

  view() {
    const t = (key) => app.translator.trans(`ernestdefoe-gridiron-nation.forum.widgets.${key}`);

    return m('.GN-widget.GN-trendingWidget', [
      m('.GN-widget-header', [m('i.fas.fa-fire'), ' ', t('trending')]),
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
    return m(
      'a.GN-trending-item',
      {
        key: d.id,
        href: app.route('discussion', { id: d.slug || d.id }),
        onclick: (e) => {
          e.preventDefault();
          m.route.set(app.route('discussion', { id: d.slug || d.id }));
        },
      },
      [
        m('span.GN-trending-rank', { class: rank <= 2 ? 'is-top' : '' }, rank),
        m('.GN-trending-info', [
          m('.GN-trending-title', d.title),
          m('.GN-trending-meta', [m('i.fas.fa-comment-alt'), ' ', d.commentCount, d.lastPostedAt ? [' · ', humanTime(d.lastPostedAt)] : null]),
        ]),
      ]
    );
  }
}
