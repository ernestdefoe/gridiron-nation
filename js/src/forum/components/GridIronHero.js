import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import User from 'flarum/common/models/User';

/**
 * GridIronHero
 *
 * Right-hand panel of the WelcomeHero: stats bar (MEMBERS / TOPICS /
 * POSTS / ONLINE) plus a row of conference / tag filter chips. Injected
 * via the WelcomeHero.view() override in forum.js.
 *
 * The ONLINE tile is interactive (Mosaic-style): clicking it toggles a
 * popover listing the active users — avatar + display name + a green
 * presence dot. The list is sourced from `/api/gn-online`, which is
 * itself auth-gated (registered users only), visibility-scoped
 * (`whereVisibleTo`), and honors per-user `discloseOnline`. Users that
 * the actor isn't allowed to see — or that opted out of presence —
 * simply don't appear in the popover.
 *
 * Forum-payload counts (userCount / discussionCount / postCount) come
 * from `app.forum.attribute(...)`; we hit `/api` as a fallback for
 * installs where the bootstrap payload doesn't carry them.
 */
export default class GridIronHero extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.users       = app.forum.attribute('userCount')       || 0;
    this.discussions = app.forum.attribute('discussionCount') || 0;
    this.posts       = app.forum.attribute('postCount')       || 0;

    // Online state
    this.online      = 0;
    this.onlineUsers = [];
    this.onlineOpen  = false;

    // Memoize User-model construction per render-cycle so toggling the
    // popover doesn't rebuild the avatars from scratch every redraw.
    this._userCache = new Map();

    // Outside-click / Escape close handlers. Bound here so we can
    // attach/detach the same reference in oncreate/onremove.
    this.onDocumentClick = (e) => {
      if (!this.onlineOpen) return;
      const popoverRoot = this.element && this.element.querySelector('.GN-onlineWrap');
      if (popoverRoot && !popoverRoot.contains(e.target)) {
        this.onlineOpen = false;
        m.redraw();
      }
    };

    this.onKeydown = (e) => {
      if (e.key === 'Escape' && this.onlineOpen) {
        this.onlineOpen = false;
        m.redraw();
      }
    };
  }

  oncreate(vnode) {
    super.oncreate(vnode);

    // Forum-payload stats fallback
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

    // Online-now state — fetch only for logged-in users (the endpoint
    // returns 401 to guests, no point firing the request).
    if (app.session.user) {
      this.fetchOnline();
    }

    document.addEventListener('click', this.onDocumentClick, true);
    document.addEventListener('keydown', this.onKeydown);
  }

  onremove(vnode) {
    super.onremove(vnode);
    document.removeEventListener('click', this.onDocumentClick, true);
    document.removeEventListener('keydown', this.onKeydown);
  }

  fetchOnline() {
    const base = app.forum.attribute('apiUrl') || '/api';
    fetch(`${base}/gn-online`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { count: 0, users: [] }))
      .then((data) => {
        this.online      = data?.count || 0;
        this.onlineUsers = Array.isArray(data?.users) ? data.users : [];
        m.redraw();
      })
      .catch(() => {});
  }

  /**
   * Resolve one online-user payload to a Mithril-renderable User model.
   * Prefers the store's hydrated record (other parts of the SPA may
   * have already fetched it for the discussion list); falls back to a
   * standalone model built from the API payload.
   *
   * Why bother instead of just `<img src={u.avatarUrl}>`: when
   * `avatarUrl` is null (most accounts don't upload an image), Flarum's
   * stock Avatar component paints a stringToColor()-derived circle
   * with the user's initials — matches every other avatar in the SPA
   * for that user. A raw <img> with no src falls through to a neutral
   * gray box that breaks visual consistency.
   */
  userFor(u) {
    if (this._userCache.has(u.id)) return this._userCache.get(u.id);

    const fromStore = app.store.getById('users', String(u.id));
    const user = fromStore || new User({
      id: String(u.id),
      type: 'users',
      attributes: {
        username:    u.slug,
        displayName: u.displayName || u.slug,
        avatarUrl:   u.avatarUrl || null,
      },
    });
    this._userCache.set(u.id, user);
    return user;
  }

  view() {
    const t = (key) => app.translator.trans(`ernestdefoe-fbsfb.forum.hero.${key}`);

    // Tag chips were removed from the hero — they now live in the pill
    // nav row below the hero (see GNHeroNav). Keeps the hero focused
    // on stats + the composer trigger card.
    return m('.GN-hero-extras', [
      m('.GN-hero-stats', [
        this.stat(this.fmt(this.users),       t('stats.members')),
        m('.GN-hero-statDivider'),
        this.stat(this.fmt(this.discussions), t('stats.topics')),
        m('.GN-hero-statDivider'),
        this.stat(this.fmt(this.posts),       t('stats.posts')),
        this.online > 0 || app.session.user
          ? [m('.GN-hero-statDivider'), this.onlineStat(t('stats.online'))]
          : null,
      ]),
    ]);
  }

  stat(value, label) {
    return m('.GN-hero-stat', [
      m('span.GN-hero-statNum',   value),
      m('span.GN-hero-statLabel', label),
    ]);
  }

  /**
   * Interactive ONLINE tile: button-shaped stat with a chevron, paired
   * with an absolutely-positioned popover listing the live users.
   * Pops below the stat row, right-aligned to the tile.
   */
  onlineStat(label) {
    const count = this.online;

    return m('.GN-hero-stat.GN-onlineWrap', { class: this.onlineOpen ? 'is-open' : '' }, [
      m('button.GN-hero-statTrigger', {
        type:           'button',
        'aria-expanded': this.onlineOpen ? 'true' : 'false',
        'aria-haspopup': 'true',
        onclick: (e) => {
          e.stopPropagation();
          // Refresh on each open so the dropdown reflects who's online
          // *now*, not when the component first mounted 5 minutes ago.
          if (!this.onlineOpen && app.session.user) {
            this.fetchOnline();
          }
          this.onlineOpen = !this.onlineOpen;
        },
      }, [
        m('span.GN-hero-statNum', count),
        m('span.GN-hero-statLabel', [
          label,
          ' ',
          m('i.fas.fa-chevron-down.GN-hero-statChev', {
            style: { transform: this.onlineOpen ? 'rotate(180deg)' : 'none' },
          }),
        ]),
      ]),

      this.onlineOpen ? this.onlinePopover() : null,
    ]);
  }

  onlinePopover() {
    if (!app.session.user) {
      // Guest tile shouldn't even open, but defensive empty state in
      // case `app.session.user` flips between render and click.
      return m('.GN-onlinePopover', m('.GN-onlinePopover-empty', '—'));
    }

    if (this.onlineUsers.length === 0) {
      return m('.GN-onlinePopover',
        m('.GN-onlinePopover-empty',
          app.translator.trans('ernestdefoe-fbsfb.forum.widgets.online_empty')
        )
      );
    }

    return m('.GN-onlinePopover', { role: 'menu' }, [
      m('ul.GN-onlineList', this.onlineUsers.map((u) => {
        const userModel = this.userFor(u);
        const href      = app.route('user', { username: u.slug });

        return m('li', { key: u.id }, [
          m('a.GN-onlineRow', {
            href,
            role: 'menuitem',
            onclick: (e) => {
              e.preventDefault();
              this.onlineOpen = false;
              m.route.set(href);
            },
          }, [
            m(Avatar, { user: userModel, className: 'GN-onlineAvatar' }),
            m('span.GN-onlineName', u.displayName),
            m('span.GN-onlineDot', { 'aria-hidden': 'true' }),
          ]),
        ]);
      })),
    ]);
  }

  fmt(n) {
    n = Number(n) || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'k';
    return String(n);
  }
}
