import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import Link from 'flarum/common/components/Link';
import humanTime from 'flarum/common/helpers/humanTime';
import highlight from 'flarum/common/helpers/highlight';
import classList from 'flarum/common/utils/classList';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';

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
  view() {
    const d = this.attrs.discussion;
    const author = d.user();
    const lastPost = d.lastPost && d.lastPost();
    const replyUser = d.lastPostedUser && d.lastPostedUser();
    const tags = (d.tags && d.tags()) || [];
    const jumpTo = this.attrs.jumpTo || d.lastPostNumber() || 0;
    const replyHref = app.route.discussion(d, jumpTo);
    const isUnread = d.isUnread && d.isUnread();
    const isSticky = d.isSticky && d.isSticky();
    const isLocked = d.isLocked && d.isLocked();
    const replyCount = Math.max(0, (d.commentCount && d.commentCount() || 1) - 1);
    const likesCount = (d.likesCount && d.likesCount()) || 0;

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
          // ── Header: avatar, author, date, tag pills, reply button
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
          // The likes/replies trans keys use ICU plural so we pass the
          // raw count — abbreviateNumber renders the visual number
          // separately, but the translator needs the integer to pick
          // singular vs plural.
          m('.GN-showcaseCard-footer', [
            m('span.GN-showcaseCard-stat', [
              m('i.far.fa-thumbs-up', { 'aria-hidden': 'true' }),
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
