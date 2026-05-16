import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * TopRecruitsWidget — Phase 5
 *
 * Reads recruits entered by admins via /api/gn-recruits and displays them
 * with position badge, star rating, commit status pill.
 * Refreshes every 10 minutes.
 */
export default class TopRecruitsWidget extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.recruits = [];
    this.loading  = true;
    this._timer   = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this.fetch();
    this._timer = setInterval(() => this.fetch(), 10 * 60_000);
  }

  onremove(vnode) {
    super.onremove(vnode);
    clearInterval(this._timer);
  }

  fetch() {
    const base = app.forum.attribute('apiUrl') || '/api';
    fetch(`${base}/gn-recruits`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        this.recruits = data.data || [];
        this.loading  = false;
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        m.redraw();
      });
  }

  stars(n) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  }

  view() {
    return m('.GN-widget.GN-recruitsWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-star'),
        ' Top Recruits',
      ]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : !this.recruits.length
          ? m('.GN-widget-empty', 'No recruits added yet')
          : this.recruits.map((r) => this.viewRecruit(r)),
      ]),
    ]);
  }

  viewRecruit(r) {
    const statusClass = {
      committed:   'GN-recruit-commit--committed',
      undecided:   'GN-recruit-commit--undecided',
      decommitted: 'GN-recruit-commit--decommitted',
    }[r.status] || 'GN-recruit-commit--undecided';

    const statusLabel = {
      committed:   r.school ? `→ ${r.school}` : 'Committed',
      undecided:   'Undecided',
      decommitted: 'Decommitted',
    }[r.status] || 'Undecided';

    return m('.GN-recruit', { key: r.id }, [
      r.position
        ? m('.GN-recruit-pos', r.position)
        : null,
      m('.GN-recruit-info', [
        m('.GN-recruit-name', r.name),
        m('.GN-recruit-meta', [
          r.height ? `${r.height}` : null,
          r.height && r.hometown ? ' · ' : null,
          r.hometown || null,
        ]),
        m('.GN-recruit-stars', this.stars(r.stars || 3)),
      ]),
      m('span.GN-recruit-commit', { class: statusClass }, statusLabel),
    ]);
  }
}
