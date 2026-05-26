import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * GridIronHero
 *
 * Renders the stats bar + conference-tag filter chips on the RIGHT side of
 * the WelcomeHero. Injected via the WelcomeHero.view() override in
 * forum.js, which targets the hero's `.container` so the chips/stats sit
 * in the same flex layout as the hero copy.
 *
 * Counts come from `app.forum` attributes when the bootstrap payload
 * carries them, with a `/api` fallback for installs that don't ship
 * the totals in the initial payload. The "online" stat reads from the
 * same `/api/gn-online` endpoint that powers the sidebar widget — the
 * proxy is cached for 30s server-side so two consumers on one page
 * don't double the load.
 */
export default class GridIronHero extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.users       = app.forum.attribute('userCount')       || 0;
    this.discussions = app.forum.attribute('discussionCount') || 0;
    this.posts       = app.forum.attribute('postCount')       || 0;
    this.online      = 0;
  }

  oncreate(vnode) {
    super.oncreate(vnode);

    // If any of the forum-payload stats is still 0 after bootstrap,
    // hit /api directly. Flarum 2 may not always include them.
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

    // Online-now is a separate endpoint — fire-and-forget. We only
    // surface the tile when count > 0, so any error / empty response
    // simply leaves the tile hidden.
    fetch(`${app.forum.attribute('apiUrl') || '/api'}/gn-online`, {
      credentials: 'same-origin',
    })
      .then((r) => r.json())
      .then((data) => {
        this.online = data?.count || 0;
        m.redraw();
      })
      .catch(() => {});
  }

  view() {
    const t = (key) => app.translator.trans(`ernestdefoe-fbsfb.forum.hero.${key}`);
    const tags = (app.store.all('tags') || []).slice(0, 7);

    return m('.GN-hero-extras', [

      // ── Stats row ─────────────────────────────────────────────────────────
      m('.GN-hero-stats', [
        this.stat(this.fmt(this.users),       t('stats.members')),
        m('.GN-hero-statDivider'),
        this.stat(this.fmt(this.discussions), t('stats.topics')),
        m('.GN-hero-statDivider'),
        this.stat(this.fmt(this.posts),       t('stats.posts')),
        this.online > 0
          ? [m('.GN-hero-statDivider'), this.stat(this.online, t('stats.online'))]
          : null,
      ]),

      // ── Conference / tag chips ─────────────────────────────────────────────
      tags.length > 0
        ? m('.GN-hero-chips', [
            m('button.GN-hero-chip.is-active', {
              onclick: () => m.route.set(app.route('index')),
            }, t('chips.all')),
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
