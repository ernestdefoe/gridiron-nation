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
    const t = (key) => app.translator.trans(`ernestdefoe-gridiron-nation.forum.hero.${key}`);

    // Stats render as ONE unified Jumbotron-style scoreboard panel —
    // dark gradient bg with four slots separated by thin vertical
    // dividers, like the home/away splits on a stadium scoreboard.
    // Each slot stacks an FA icon, a big condensed-digit value, and
    // a small uppercase label. The ONLINE slot is interactive
    // (button + dropdown of online users).
    // Newest registered member — comes from the ForumResource extender
    // in extend.php as `app.forum.attribute('gridironNewestMember')`. When
    // present, renders a 5th slot in the scoreboard showing the user's
    // display name with their avatar, click-routable to the profile.
    const newest = app.forum.attribute('gridironNewestMember');

    // Whether there's anything in the social-side group (NEWEST + ONLINE)
    // worth rendering — if both are empty we skip the separator too so we
    // don't ship a lone colon hanging off the right side of the panel.
    const hasSocial = !!newest || this.online > 0 || !!app.session.user;

    return m('.GN-hero-extras', [
      m('.GN-scoreboard', [
        this.scoreSlot('fa-solid fa-users',       this.fmt(this.users),       t('stats.members')),
        this.scoreSlot('fa-solid fa-football',    this.fmt(this.discussions), t('stats.topics')),
        this.scoreSlot('fa-solid fa-clipboard',   this.fmt(this.posts),       t('stats.posts')),
        // Blinking-colon separator between the static forum stats
        // (members/topics/posts) and the social stats (newest member +
        // online now) — mimics the period/quarter colon on a stadium
        // scoreboard. Animation lives in less/forum.less under
        // `@keyframes gn-scoreboard-blink`.
        hasSocial
          ? m('span.GN-scoreboard-sep', { 'aria-hidden': 'true' }, ':')
          : null,
        newest ? this.newestScoreSlot(newest, t('stats.newest')) : null,
        this.online > 0 || app.session.user
          ? this.onlineScoreSlot(t('stats.online'))
          : null,
      ]),
    ]);
  }

  /**
   * NEWEST member slot — small avatar in place of the FA icon, the
   * user's display name as the "value", "NEWEST" label below. Click
   * routes to the user's profile.
   */
  newestScoreSlot(user, label) {
    const href = app.route('user', { username: user.username });

    return m('a.GN-scoreSlot.GN-newestWrap', {
      href,
      onclick: (e) => { e.preventDefault(); m.route.set(href); },
      'aria-label': `${label}: ${user.displayName}`,
    }, [
      user.avatarUrl
        ? m('img.GN-scoreSlot-avatar', { src: user.avatarUrl, alt: '' })
        : m('span.GN-scoreSlot-avatar.GN-scoreSlot-avatar--initial',
            (user.displayName || '?')[0].toUpperCase()),
      m('span.GN-scoreSlot-value.GN-scoreSlot-value--name', user.displayName),
      m('span.GN-scoreSlot-label', label),
    ]);
  }

  /**
   * One slot inside the scoreboard — icon, value, label stacked
   * vertically. Slots share a dark surface so the row reads as a
   * single Jumbotron rather than four floating cards.
   */
  scoreSlot(iconClass, value, label) {
    return m('.GN-scoreSlot', [
      m('i.GN-scoreSlot-icon', { className: iconClass }),
      m('span.GN-scoreSlot-value', value),
      m('span.GN-scoreSlot-label', label),
    ]);
  }

  /**
   * Interactive ONLINE slot — same scoreboard-slot shape as the static
   * slots but wrapped in a button so clicking opens the popover
   * listing online users. The pulsing green dot replaces the static
   * FA icon so it visually reads as a live indicator.
   */
  onlineScoreSlot(label) {
    return m('.GN-scoreSlot.GN-onlineWrap', {
      class: this.onlineOpen ? 'is-open' : '',
    }, [
      m('button.GN-scoreSlot-trigger', {
        type: 'button',
        'aria-expanded': this.onlineOpen ? 'true' : 'false',
        'aria-haspopup': 'true',
        onclick: (e) => {
          e.stopPropagation();
          if (!this.onlineOpen && app.session.user) {
            this.fetchOnline();
          }
          this.onlineOpen = !this.onlineOpen;
        },
      }, [
        m('span.GN-scoreSlot-pulse', { 'aria-hidden': 'true' }),
        m('span.GN-scoreSlot-value', this.online),
        m('span.GN-scoreSlot-label', [
          label,
          ' ',
          m('i.fas.fa-chevron-down.GN-scoreSlot-chev', {
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
          app.translator.trans('ernestdefoe-gridiron-nation.forum.widgets.online_empty')
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
