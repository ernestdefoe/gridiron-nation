import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';

/**
 * GNComposerTrigger — "what's on your mind" card above the discussion
 * list. Ported from MosaicComposerTrigger.
 *
 * Renders the actor's avatar (or a fallback edit-pencil for guests),
 * a localized prompt ("Tell everyone what you're working on…"), and a
 * primary "+ Start a Discussion" CTA. Clicking anywhere on the card
 * opens the stock DiscussionComposer for logged-in users, or the
 * LogInModal for guests.
 *
 * Implementation: programmatically clicks the hidden
 * `.IndexPage-newDiscussion` button that IndexSidebar renders on every
 * index page. CSS hides the sidebar nav block, but the button itself
 * remains in the DOM and Flarum's own handler covers the async chunk
 * import for DiscussionComposer, the guest → LogInModal branch, and
 * focus management. No prototype reach-arounds, so a future Flarum
 * release rewiring the action keeps the click target working — it's
 * just a DOM event.
 */
export default class GNComposerTrigger extends Component {
  view() {
    const t = (key, fallback) => safeTrans(key, fallback);

    const user = app.session.user;
    const placeholder = user
      ? t('ernestdefoe-fbsfb.forum.composer.prompt', "Tell everyone what you're working on…")
      : t('ernestdefoe-fbsfb.forum.composer.guest_prompt', 'Sign in to start a discussion…');
    const ctaLabel = t('ernestdefoe-fbsfb.forum.nav.start_discussion', 'Start a Discussion');

    return m(
      '.GN-composerTrigger',
      {
        role: 'button',
        tabindex: '0',
        onclick: () => this.open(),
        onkeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.open();
          }
        },
      },
      m('.GN-composerTrigger-inner', [
        user
          ? m(Avatar, { user, className: 'GN-composerTrigger-avatar' })
          : m('.GN-composerTrigger-logo', { 'aria-hidden': 'true' }, m('i.fas.fa-edit')),
        m('span.GN-composerTrigger-placeholder', placeholder),
        m(
          'button.GN-composerTrigger-newBtn',
          {
            type: 'button',
            onclick: (e) => {
              e.stopPropagation();
              this.open();
            },
          },
          [
            m('i.fas.fa-plus', { 'aria-hidden': 'true' }),
            m('span.GN-composerTrigger-newBtn-label', ctaLabel),
          ]
        ),
      ])
    );
  }

  open() {
    // IndexSidebar renders .IndexPage-newDiscussion as part of its
    // items list; CSS hides the surrounding nav block on desktop but
    // the button is still in the DOM. Click it to reuse Flarum's
    // own composer-open flow.
    const btn = document.querySelector('.IndexPage-newDiscussion');
    if (btn instanceof HTMLElement) {
      btn.click();
    }
  }
}

// Safe translator wrapper — returns the supplied fallback when the key
// is missing from the locale file. Mirrors the helper in Mosaic.
function safeTrans(key, fallback) {
  try {
    const out = app.translator.trans(key);
    if (out == null) return fallback;
    if (typeof out === 'string' && out === key) return fallback;
    return out;
  } catch (e) {
    return fallback;
  }
}
