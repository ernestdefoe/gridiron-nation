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
 * open() replicates core IndexSidebar.newDiscussionAction() directly —
 * loading the (lazy) DiscussionComposer / LogInModal core chunks through
 * the export registry — rather than reaching for a core DOM node by class
 * name, so a core markup refactor can't silently break the trigger.
 */
export default class GNComposerTrigger extends Component {
  view() {
    const t = (key, fallback) => safeTrans(key, fallback);

    const user = app.session.user;
    const placeholder = user
      ? t('ernestdefoe-gridiron-nation.forum.composer.prompt', "Tell everyone what you're working on…")
      : t('ernestdefoe-gridiron-nation.forum.composer.guest_prompt', 'Sign in to start a discussion…');
    const ctaLabel = t('ernestdefoe-gridiron-nation.forum.nav.start_discussion', 'Start a Discussion');

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
    // Mirror core IndexSidebar.newDiscussionAction(): logged-in users get
    // the DiscussionComposer, guests get the LogInModal. Both are lazy core
    // chunks, loaded via the export registry's async importer (core
    // namespace → core's own webpack runtime), so no hard-coded DOM target.
    if (app.session.user) {
      app.composer
        .load(() => flarum.reg.asyncModuleImport('flarum/forum/components/DiscussionComposer'), { user: app.session.user })
        .then(() => app.composer.show());
    } else {
      app.modal.show(() => flarum.reg.asyncModuleImport('flarum/forum/components/LogInModal'));
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
