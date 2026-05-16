import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * GridIronHero
 *
 * Renders the stats bar + conference-tag filter chips that appear on the
 * RIGHT side of the hero. Injected via WelcomeHero.prototype.bodyItems.
 */
export default class GridIronHero extends Component {
  view() {
    const forum = app.forum;

    // Flarum 2 forum attributes served from /api (ForumSerializer)
    const memberCount    = this.fmt(forum.attribute('userCount')      || 0);
    const discussionCount = this.fmt(forum.attribute('discussionCount') || 0);
    const postCount      = this.fmt(forum.attribute('postCount')      || 0);

    // Online count from our widget state (set by OnlineNowWidget once it loads)
    const onlineCount = window._gnOnlineCount || 0;

    // Conference / tag chips — first 7 tags from the store
    const tags = (app.store.all('tags') || []).slice(0, 7);

    return m('.GN-hero-extras', [

      // ── Stats row ────────────────────────────────────────────────────────
      m('.GN-hero-stats', [
        this.stat(memberCount,     'MEMBERS'),
        m('.GN-hero-statDivider'),
        this.stat(discussionCount, 'TOPICS'),
        m('.GN-hero-statDivider'),
        this.stat(postCount,       'POSTS'),
        onlineCount > 0
          ? [m('.GN-hero-statDivider'), this.stat(onlineCount, 'ONLINE')]
          : null,
      ]),

      // ── Conference / tag chips ───────────────────────────────────────────
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
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'k';
    return String(n);
  }
}
