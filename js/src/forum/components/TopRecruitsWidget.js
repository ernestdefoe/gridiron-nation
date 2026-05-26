import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

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
 * The widget refreshes every 10 minutes — recruiting data moves
 * roughly weekly, so a 10-minute frontend poll plus the extension's
 * 6-hour cache TTL gives near-instant updates after the admin reloads
 * data without hammering the backend.
 */
export default class TopRecruitsWidget extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.recruits = [];
    this.year     = null;
    this.loading  = true;
    this.error    = null;          // 'unauthenticated' | 'not_installed' | 'api_key_missing' | 'fetch_failed'
    this._timer   = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);

    // Guests can't reach /api/cfbd-recruits — recruiting requires
    // authentication. Skip the fetch so we don't ping the endpoint
    // for every anonymous page-view + render the locked-state empty
    // tile faster.
    if (!app.session.user) {
      this.loading = false;
      this.error   = 'unauthenticated';
      m.redraw();
      return;
    }

    this.fetch();
    this._timer = setInterval(() => this.fetch(), 10 * 60_000);
  }

  onremove(vnode) {
    super.onremove(vnode);
    clearInterval(this._timer);
  }

  fetch() {
    const base = app.forum.attribute('apiUrl') || '/api';
    fetch(`${base}/cfbd-recruits`, { credentials: 'same-origin' })
      .then((r) => {
        if (r.status === 401) { this.error = 'unauthenticated'; return null; }
        if (r.status === 404) { this.error = 'not_installed';   return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) { this.loading = false; m.redraw(); return; }

        // The extension surfaces "API key missing" as 200 + error
        // field so the operator's admin UI can render config guidance.
        // Mirror that shape here.
        if (data.error === 'api_key_missing') {
          this.error = 'api_key_missing';
        } else {
          this.error = null;
        }

        this.recruits = Array.isArray(data.data) ? data.data : [];
        this.year     = data.year || null;
        this.loading  = false;
        m.redraw();
      })
      .catch(() => {
        this.error   = 'fetch_failed';
        this.loading = false;
        m.redraw();
      });
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

    const t = (key) => app.translator.trans(`ernestdefoe-fbsfb.forum.widgets.${key}`);

    // Header label respects the admin-set widget_title from the
    // recruiting extension if present, falling back to our localized
    // "Top Recruits". The year suffix only shows once we have real
    // data so the title doesn't flicker between empty and configured.
    const customTitle = app.forum.attribute('ernestdefoe-recruiting.widget_title');
    const baseLabel   = (typeof customTitle === 'string' && customTitle.trim()) ? customTitle : t('recruits');
    const headerLabel = this.year && this.recruits.length
      ? `${baseLabel} · ${this.year}`
      : baseLabel;

    return m('.GN-widget.GN-recruitsWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-star'),
        ' ',
        headerLabel,
      ]),
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
    const trans = (key, params) => app.translator.trans(`ernestdefoe-fbsfb.forum.recruits.status.${key}`, params);

    const statusClass = {
      committed:   'GN-recruit-commit--committed',
      undecided:   'GN-recruit-commit--undecided',
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
    const metaPieces = [
      r.height,
      r.hometown,
      r.highSchool,
    ].filter(Boolean);

    return m('.GN-recruit', { key: r.id || r.name }, [
      leading,
      m('.GN-recruit-info', [
        m('.GN-recruit-name', r.name),
        metaPieces.length
          ? m('.GN-recruit-meta', metaPieces.join(' · '))
          : null,
        m('.GN-recruit-stars', this.stars(r.stars || 0)),
      ]),
      m('span.GN-recruit-commit', { class: statusClass }, statusLabel),
    ]);
  }
}
