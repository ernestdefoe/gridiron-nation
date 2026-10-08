import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import feed from '../feed';

/**
 * TopRecruitsWidget — Phase 5
 *
 * Reads the recruiting list from the ernestdefoe/recruiting extension
 * via /api/cfbd-recruits. That endpoint is itself backed by the
 * CollegeFootballData.com API + an On3 photo enricher, with a
 * stale-while-revalidate cache so the widget reload doesn't pay the
 * upstream cost.
 *
 * Three "empty" states surface here:
 *   - 401 unauthenticated  → recruiting extension requires login. We
 *                            hide the widget entirely for guests so
 *                            they don't see "locked".
 *   - 404 not found        → recruiting extension isn't installed.
 *                            Hide entirely.
 *   - JSON `error: 'api_key_missing'` → recruiting is installed but
 *                            the admin hasn't set the CFBD API key.
 *                            Surface a friendly "not configured" line
 *                            so the operator notices.
 *
 * The widget refreshes every 10 minutes while the tab is visible,
 * through a page-level feed shared by every mount (../feed.js) — recruiting data moves
 * roughly weekly, so a 10-minute frontend poll plus the extension's
 * 6-hour cache TTL gives near-instant updates after the admin reloads
 * data without hammering the backend.
 */
// 401 / 404 are answers that will not change while the page is open, so
// they end the feed (`final`) instead of being asked again every visit.
const recruitsFeed = feed(() => {
  const base = app.forum.attribute('apiUrl') || '/api';
  return fetch(`${base}/cfbd-recruits`, { credentials: 'same-origin' })
    .then((r) => {
      if (r.status === 401) return { value: { recruits: [], year: null, error: 'unauthenticated' }, final: true };
      if (r.status === 404) return { value: { recruits: [], year: null, error: 'not_installed' }, final: true };

      return r.json().then((data) => ({
        value: {
          recruits: Array.isArray(data.data) ? data.data : [],
          year: data.year || null,
          // The extension surfaces "API key missing" as 200 + error
          // field so the operator's admin UI can render config guidance.
          // Mirror that shape here.
          error: data.error === 'api_key_missing' ? 'api_key_missing' : null,
        },
      }));
    })
    .catch(() => ({ value: { recruits: [], year: null, error: 'fetch_failed' } }));
}, 10 * 60_000);

export default class TopRecruitsWidget extends Component {
  oncreate(vnode) {
    super.oncreate(vnode);

    // Guests can't reach /api/cfbd-recruits — recruiting requires
    // authentication. Skip the fetch so we don't ping the endpoint
    // for every anonymous page-view.
    if (!app.session.user) return;

    this.attached = true;
    recruitsFeed.attach();
  }

  onremove(vnode) {
    super.onremove(vnode);
    if (this.attached) recruitsFeed.detach();
  }

  get loading() {
    return !!app.session.user && !recruitsFeed.loaded();
  }

  get error() {
    if (!app.session.user) return 'unauthenticated';
    return recruitsFeed.get()?.error || null;
  }

  get recruits() {
    return recruitsFeed.get()?.recruits || [];
  }

  get year() {
    return recruitsFeed.get()?.year || null;
  }

  // Hide the whole widget for guests + when the recruiting extension
  // isn't installed. Better than showing an empty card on every page.
  shouldRender() {
    return this.error !== 'unauthenticated' && this.error !== 'not_installed';
  }

  stars(n) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  }

  view() {
    if (!this.shouldRender()) return null;

    const t = (key) => app.translator.trans(`ernestdefoe-gridiron-nation.forum.widgets.${key}`);

    // Header label respects the admin-set widget_title from the
    // recruiting extension if present, falling back to our localized
    // "Top Recruits". The year suffix only shows once we have real
    // data so the title doesn't flicker between empty and configured.
    const customTitle = app.forum.attribute('ernestdefoe-recruiting.widget_title');
    const baseLabel = typeof customTitle === 'string' && customTitle.trim() ? customTitle : t('recruits');
    const headerLabel = this.year && this.recruits.length ? `${baseLabel} · ${this.year}` : baseLabel;

    return m('.GN-widget.GN-recruitsWidget', [
      m('.GN-widget-header', [m('i.fas.fa-star'), ' ', headerLabel]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : this.error === 'api_key_missing'
            ? m('.GN-widget-empty', t('recruits_unconfigured'))
            : this.error === 'fetch_failed'
              ? m('.GN-widget-empty', t('recruits_unavailable'))
              : !this.recruits.length
                ? m('.GN-widget-empty', t('recruits_empty'))
                : this.recruits.slice(0, 8).map((r) => this.viewRecruit(r)),
      ]),
    ]);
  }

  viewRecruit(r) {
    const trans = (key, params) => app.translator.trans(`ernestdefoe-gridiron-nation.forum.recruits.status.${key}`, params);

    const statusClass =
      {
        committed: 'GN-recruit-commit--committed',
        undecided: 'GN-recruit-commit--undecided',
        decommitted: 'GN-recruit-commit--decommitted',
      }[r.status] || 'GN-recruit-commit--undecided';

    const statusLabel = (() => {
      if (r.status === 'committed') {
        return r.school ? trans('committed_to', { school: r.school }) : trans('committed');
      }
      return trans(r.status || 'undecided');
    })();

    // Photo > position badge > nothing. The recruiting extension's
    // On3PhotoEnricher fills photoUrl when an On3 headshot is found;
    // when not, we fall back to the position label (QB / WR / etc.)
    // so the card still has a left-rail anchor.
    const leading = r.photoUrl
      ? m('img.GN-recruit-photo', { src: r.photoUrl, alt: r.name, loading: 'lazy' })
      : r.position
        ? m('.GN-recruit-pos', r.position)
        : null;

    // Hometown line with high-school fallback so the meta row always
    // has something — CFBD sometimes ships rows without city/state.
    const metaPieces = [r.height, r.hometown, r.highSchool].filter(Boolean);

    return m('.GN-recruit', { key: r.id || r.name }, [
      leading,
      m('.GN-recruit-info', [
        m('.GN-recruit-name', r.name),
        metaPieces.length ? m('.GN-recruit-meta', metaPieces.join(' · ')) : null,
        m('.GN-recruit-stars', this.stars(r.stars || 0)),
      ]),
      m('span.GN-recruit-commit', { class: statusClass }, statusLabel),
    ]);
  }
}
