import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import Link from 'flarum/common/components/Link';
import Dropdown from 'flarum/common/components/Dropdown';
import humanTime from 'flarum/common/helpers/humanTime';
import highlight from 'flarum/common/helpers/highlight';
import classList from 'flarum/common/utils/classList';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';

/**
 * GNDiscussionCard — GridIron Nation's showcase card.
 *
 * Rendered in place of Flarum's stock DiscussionListItem layout via
 * an override in forum.js. The structure is football-forum native —
 * built from Flarum primitives, no upstream theme dependency:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ ▌ avatar  name · date · tag pills                  Reply │
 *   │ ▌ Title (bold)                                            │
 *   │ ▌ Excerpt from OP body (2 lines, muted)                   │
 *   │ ▌ ┌─────────────────────────────────────────────────────┐ │
 *   │ ▌ │ ◯ replyUser   "snippet of the most recent reply..." │ │
 *   │ ▌ └─────────────────────────────────────────────────────┘ │
 *   │ ▌ See other N replies                                     │
 *   │ ▌ 👍 N likes      💬 N replies                            │
 *   └──────────────────────────────────────────────────────────┘
 *
 * The left edge has a primary-color vertical accent strip (the "yard
 * line" marker) when the row is unread or pinned; default rows have a
 * subtle muted strip so the card silhouette is consistent.
 *
 * Attrs match what Flarum's DiscussionListItem already receives:
 *   - discussion         the Discussion model
 *   - params             list params (sort, filter)
 *   - jumpTo             optional post number to link to
 *   - highlightRegExp    used for search hit highlighting
 */
export default class GNDiscussionCard extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    // In-flight latch: prevents stacking like requests if the user
    // clicks the thumbs faster than the API can respond.
    this.likeBusy = false;
  }

  view() {
    const d = this.attrs.discussion;
    const author = d.user();
    const firstPost = d.firstPost && d.firstPost();
    const lastPost = d.lastPost && d.lastPost();
    const replyUser = d.lastPostedUser && d.lastPostedUser();
    const tags = (d.tags && d.tags()) || [];
    const jumpTo = this.attrs.jumpTo || d.lastPostNumber() || 0;
    const replyHref = app.route.discussion(d, jumpTo);
    const isUnread = d.isUnread && d.isUnread();
    const isSticky = d.isSticky && d.isSticky();
    const isLocked = d.isLocked && d.isLocked();
    const replyCount = Math.max(0, (d.commentCount && d.commentCount() || 1) - 1);

    // Total likes across every post in the discussion. Maintained by
    // the SyncDiscussionLikesCount PHP listener — read here via the
    // Schema field exposed in extend.php. Falls back to 0 if the
    // attribute isn't loaded (older API responses or flarum/likes
    // disabled).
    const likesCount = (d.likesCount && d.likesCount()) || 0;

    // Whether the OP (first post) is currently liked by the actor.
    // Click target for the thumbs button — toggling like state on the
    // OP is the closest single-action analogue to "like the discussion"
    // since likes are scoped per-post in flarum/likes.
    const isOpLiked = !!(firstPost && firstPost.isLiked && firstPost.isLiked());
    const canLikeOp = !!(firstPost && firstPost.canLike && firstPost.canLike()) && !!app.session.user;

    // Build the moderation 3-dot dropdown from DiscussionControls. Returns
    // an ItemList of <Button>s (Reply, Edit, Move, Delete, Restore,
    // Pin/Unpin, Lock/Unlock, Hide, etc.) gated by the actor's permissions.
    // Empty for guests / users without any controls — in that case we just
    // skip rendering the Dropdown entirely.
    const controls = DiscussionControls.controls(d, this).toArray();

    // No need to forward style/onclick here — the outer
    // `<li class="DiscussionListItem">` wrapper rendered by forum.js
    // receives ramon/colored's `vdom.attrs.style['--item-tag-color']`
    // mutation and the `onclick` color-apply handler. The custom prop
    // cascades to descendants via standard CSS inheritance, so the
    // showcase card and its accent strip can read it via
    // `var(--item-tag-color, …)`.
    return m(
      'article.GN-showcaseCard',
      {
        className: classList({
          'GN-showcaseCard--unread': isUnread,
          'GN-showcaseCard--sticky': isSticky,
          'GN-showcaseCard--locked': isLocked,
        }),
      },
      [
        // ── Accent strip down the left edge — primary color for
        //    unread/sticky rows, muted for the default read state.
        m('.GN-showcaseCard-accent', { 'aria-hidden': 'true' }),

        m('.GN-showcaseCard-body', [
          // ── Header: avatar, author, date, tag pills, reply button, 3-dot
          m('.GN-showcaseCard-header', [
            author
              ? m(Link, { className: 'GN-showcaseCard-avatar', href: app.route.user(author) },
                  m(Avatar, { user: author }))
              : m('span.GN-showcaseCard-avatar', m(Avatar, { user: null })),

            m('.GN-showcaseCard-meta', [
              m('span.GN-showcaseCard-author', author ? author.displayName() : '—'),
              m('span.GN-showcaseCard-dot', '·'),
              m('span.GN-showcaseCard-time', humanTime(d.createdAt())),
              tags.length
                ? m('span.GN-showcaseCard-tags', tags.map((t) => this.tagPill(t)))
                : null,
            ]),

            m(Link, {
              className: 'Button GN-showcaseCard-replyBtn',
              href: replyHref,
            }, [
              m('i.fas.fa-reply', { 'aria-hidden': 'true' }),
              ' ',
              app.translator.trans('ernestdefoe-gridiron-nation.forum.discussion.reply'),
            ]),

            controls.length
              ? m(Dropdown, {
                  icon: 'fas fa-ellipsis-v',
                  className: 'GN-showcaseCard-controls',
                  buttonClassName: 'Button Button--icon Button--flat',
                  accessibleToggleLabel: app.translator.trans(
                    'core.forum.discussion_controls.toggle_dropdown_accessible_label'
                  ),
                }, controls)
              : null,
          ]),

          // ── Title (links to the discussion)
          m(Link, {
            className: 'GN-showcaseCard-titleLink',
            href: app.route.discussion(d),
          }, m('h2.GN-showcaseCard-title',
            highlight(d.title(), this.attrs.highlightRegExp)
          )),

          // ── Body excerpt (first ~180 chars of the OP, plain text)
          this.viewExcerpt(d),

          // ── Best/last reply preview
          replyUser && replyCount > 0
            ? this.viewReplyPreview(replyUser, lastPost, replyHref)
            : null,

          // ── "See other N replies" overflow link
          replyCount > 1
            ? m(Link, {
                className: 'GN-showcaseCard-more',
                href: replyHref,
              }, app.translator.trans('ernestdefoe-gridiron-nation.forum.discussion.see_other_replies', {
                count: replyCount - 1,
              }))
            : null,

          // ── Footer: like count + reply count
          // The likes stat is a real button — clicking it toggles a
          // like on the OP (first post). The count refreshes both
          // optimistically and after the API responds, since the
          // SyncDiscussionLikesCount listener bumps the discussion-
          // level total in lockstep.
          m('.GN-showcaseCard-footer', [
            m('button.GN-showcaseCard-stat.GN-showcaseCard-stat--likes', {
              type: 'button',
              className: classList({
                'GN-showcaseCard-stat--liked':    isOpLiked,
                'GN-showcaseCard-stat--disabled': !canLikeOp,
              }),
              disabled: !canLikeOp || this.likeBusy,
              title: canLikeOp
                ? null
                : (app.session.user
                    ? null
                    : 'Sign in to like'),
              onclick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleOpLike();
              },
            }, [
              m('i', {
                className: classList(isOpLiked ? 'fas fa-thumbs-up' : 'far fa-thumbs-up'),
                'aria-hidden': 'true',
              }),
              ' ',
              abbreviateNumber(likesCount),
              ' ',
              app.translator.trans('ernestdefoe-gridiron-nation.forum.discussion.likes', { count: likesCount }),
            ]),
            m('span.GN-showcaseCard-stat', [
              m('i.far.fa-comment', { 'aria-hidden': 'true' }),
              ' ',
              abbreviateNumber(replyCount),
              ' ',
              app.translator.trans('ernestdefoe-gridiron-nation.forum.discussion.replies', { count: replyCount }),
            ]),
          ]),
        ]),
      ]
    );
  }

  /**
   * Toggle a like on the OP (first post) when the showcase card's
   * thumbs button is clicked. Updates the model optimistically so the
   * count flips immediately, then persists via the standard Flarum
   * `model.save()` path which targets the post's `isLiked` attribute
   * (provided by flarum/likes). On the backend, our SyncDiscussion-
   * LikesCount listener picks up the PostWasLiked / PostWasUnliked
   * event and bumps `discussions.likes_count` accordingly — that flows
   * back into the discussion attribute on the next API touch.
   *
   * Optimistic refresh: we manually patch `discussion.likesCount` AND
   * the post's `isLiked` so Mithril re-renders with the new values
   * before the round-trip completes. If the save fails, we revert.
   */
  async toggleOpLike() {
    const d = this.attrs.discussion;
    const firstPost = d.firstPost && d.firstPost();

    if (!firstPost) return;
    if (!firstPost.canLike || !firstPost.canLike()) return;
    if (!app.session.user) return;
    if (this.likeBusy) return;

    this.likeBusy = true;

    const wasLiked = !!firstPost.isLiked();
    const willBeLiked = !wasLiked;
    const delta = willBeLiked ? 1 : -1;
    const currentTotal = (d.likesCount && d.likesCount()) || 0;

    // Optimistic patch — store reaches inside the model's data, so we
    // also push the new attribute through pushAttributes so the model's
    // .isLiked() reader returns the new value immediately.
    firstPost.pushAttributes({ isLiked: willBeLiked });
    d.pushAttributes({ likesCount: Math.max(0, currentTotal + delta) });
    m.redraw();

    try {
      await firstPost.save({ isLiked: willBeLiked });
    } catch (err) {
      // Revert on failure — restore the original isLiked + total.
      firstPost.pushAttributes({ isLiked: wasLiked });
      d.pushAttributes({ likesCount: currentTotal });
      m.redraw();
      app.alerts.show(
        { type: 'error' },
        (err && err.response && err.response.errors && err.response.errors[0] && err.response.errors[0].detail)
        || 'Could not save like'
      );
    } finally {
      this.likeBusy = false;
      m.redraw();
    }
  }

  /**
   * Render a single tag chip with the tag's color (if set) tinting the
   * background. Click routes to the tag's discussion list.
   */
  tagPill(tag) {
    if (!tag || !tag.id) return null;

    const color = tag.color && tag.color();
    const href = app.route('tag', { tags: tag.slug ? tag.slug() : '' });

    return m(Link, {
      key: tag.id(),
      href,
      className: 'GN-showcaseCard-tagPill',
      style: color
        ? { '--gn-tag-color': color, '--gn-tag-color-tint': hexToRgba(color, 0.14) }
        : null,
    }, [
      tag.icon && tag.icon() ? m('i', { className: tag.icon() }) : null,
      ' ',
      tag.name ? tag.name() : '',
    ]);
  }

  /**
   * Pull a short excerpt from the OP for the card body. The first post
   * is usually eager-loaded with the discussion (Flarum's standard
   * include list); if it's not loaded yet, just skip the excerpt block
   * rather than firing an extra request.
   */
  viewExcerpt(d) {
    const post = d.firstPost && d.firstPost();
    if (!post) return null;

    const content = post.contentPlain ? post.contentPlain() : null;
    if (!content) return null;

    const trimmed = content.length > 220 ? content.slice(0, 220).trimEnd() + '…' : content;
    return m('p.GN-showcaseCard-excerpt', trimmed);
  }

  /**
   * The embedded "most recent reply" preview chip — avatar + author +
   * snippet. Clicking it jumps to that post inside the discussion.
   */
  viewReplyPreview(replyUser, lastPost, href) {
    const snippet = lastPost && lastPost.contentPlain
      ? lastPost.contentPlain()
      : null;
    const trimmed = snippet && snippet.length > 110
      ? snippet.slice(0, 110).trimEnd() + '…'
      : snippet;

    return m(Link, {
      className: 'GN-showcaseCard-reply',
      href,
    }, [
      m(Avatar, { user: replyUser, className: 'GN-showcaseCard-replyAvatar' }),
      m('span.GN-showcaseCard-replyAuthor', replyUser.displayName()),
      trimmed ? m('span.GN-showcaseCard-replySnippet', trimmed) : null,
    ]);
  }
}

/**
 * Convert a #RRGGBB hex to an `rgba(r, g, b, a)` string. Used to tint
 * the tag-pill background from the tag's hex color without losing
 * theme-controlled text contrast.
 */
function hexToRgba(hex, alpha) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
