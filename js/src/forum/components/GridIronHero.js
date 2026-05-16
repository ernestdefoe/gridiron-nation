import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * GridIronHero
 *
 * Renders the stats bar + conference-tag filter chips on the RIGHT side of
 * the hero. Injected via WelcomeHero.prototype.bodyItems at priority 50.
 *
 * Stats are fetched directly from /api so we always get real values even if
 * app.forum attributes aren't populated in the initial bootstrap payload.
 */
export default class GridIronHero extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.users       = app.forum.attribute('userCount')       || 0;
    this.discussions = app.forum.attribute('discussionCount') || 0;
    this.posts       = app.forum.attribute('postCount')       || 0;
  }

  oncreate(vnode) {
    super.oncreate(vnode);

    // If any stat is still 0 after bootstrap, fetch from /api directly.
    // Flarum 2 may not always include stats in the initial payload.
    if (!this.users || !this.discussions || !this.posts) {
      fetch(app.forum.attribute('apiUrl') || '/api', {
        credentials: 'same-origin',
        headers: { Accept: 'application/vnd.api+json' },
      })
        .then((r) => r.json())
        .then((data) => {
          const a = data?.data?.attributes || {};
          this.users       = a.userCount       || a.usersCount       || this.users;
          this.discussions = a.discussionCount || a.discussionsCount || this.discussions;
          this.posts       = a.postCount       || a.postsCount       || this.posts;
          m.redraw();
        })
        .catch(() => {});
    }
  }

  view() {
    const onlineCount = window._gnOnlineCount || 0;
    const tags        = (app.store.all('tags') || []).slice(0, 7);

    return m('.GN-hero-extras', [

      // ── Stats row ─────────────────────────────────────────────────────────
      m('.GN-hero-stats', [
        this.stat(this.fmt(this.users),       'MEMBERS'),
        m('.GN-hero-statDivider'),
        this.stat(this.fmt(this.discussions), 'TOPICS'),
        m('.GN-hero-statDivider'),
        this.stat(this.fmt(this.posts),       'POSTS'),
        onlineCount > 0
          ? [m('.GN-hero-statDivider'), this.stat(onlineCount, 'ONLINE')]
          : null,
      ]),

      // ── Conference / tag chips ─────────────────────────────────────────────
      tags.length > 0
        ? m('.GN-hero-chips', [
            m('button.GN-hero-chip.is-active', {
              onclick: () => m.route.set(app.route('index')),
            }, 'All'),
            tags.map((tag) =>
              m('button.GN-hero-chip', {
                key:     tag.id(),
                onclick: () => m.route.set(app.route('tag', { slug: tag.attribute('slug') })),
              }, tag.attribute('name'))
            ),
          ])
        : null,
    ]);
  }

  stat(value, label) {
    return m('.GN-hero-stat', [
      m('span.GN-hero-statNum',   value),
      m('span.GN-hero-statLabel', label),
    ]);
  }

  fmt(n) {
    n = Number(n) || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'k';
    return String(n);
  }
}
