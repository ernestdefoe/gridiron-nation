import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * OnlineNowWidget — Phase 4
 *
 * Lists users seen in the last 5 minutes via /api/gn-online.
 * Refreshes every 2 minutes.
 */
export default class OnlineNowWidget extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.count   = 0;
    this.users   = [];
    this.loading = true;
    this._timer  = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this.fetch();
    this._timer = setInterval(() => this.fetch(), 2 * 60_000);
  }

  onremove(vnode) {
    super.onremove(vnode);
    clearInterval(this._timer);
  }

  fetch() {
    const base = app.forum.attribute('apiUrl') || '/api';
    fetch(`${base}/gn-online`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        this.count   = data.count || 0;
        this.users   = data.users || [];
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        m.redraw();
      });
  }

  initial(name) {
    return (name || '?')[0].toUpperCase();
  }

  view() {
    const t = (key) => app.translator.trans(`ernestdefoe-fbsfb.forum.widgets.${key}`);

    return m('.GN-widget.GN-onlineWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-circle', { style: 'color:#4ec46a;font-size:0.6rem;vertical-align:middle' }),
        ' ',
        t('online_now'),
        this.count > 0
          ? m('span.GN-online-count', ` — ${this.count}`)
          : null,
      ]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : !this.users.length
          ? m('.GN-widget-empty', t('online_empty'))
          : this.users.map((u) => this.viewUser(u)),
      ]),
    ]);
  }

  viewUser(u) {
    const href = app.route('user', { username: u.slug });
    return m('a.GN-online-row', {
      key:     u.id,
      href,
      onclick: (e) => { e.preventDefault(); m.route.set(href); },
    }, [
      m('.GN-online-avatar', [
        u.avatarUrl
          ? m('img', { src: u.avatarUrl, alt: u.displayName })
          : m('span.GN-online-initial', this.initial(u.displayName)),
        m('.GN-online-dot'),
      ]),
      m('span.GN-online-name', u.displayName),
    ]);
  }
}
