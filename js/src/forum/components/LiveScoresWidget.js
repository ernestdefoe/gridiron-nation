import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * LiveScoresWidget — Phase 2
 *
 * Fetches college football scores from our ESPN proxy (/api/gn-live-scores)
 * and auto-refreshes every 60 seconds while mounted. The proxy caches the
 * upstream ESPN response for 60s server-side, so the polling cadence here
 * effectively matches the cache TTL.
 */
export default class LiveScoresWidget extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.games   = [];
    this.loading = true;
    this.error   = false;
    this._timer  = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this.fetch();
    this._timer = setInterval(() => this.fetch(), 60_000);
  }

  onremove(vnode) {
    super.onremove(vnode);
    clearInterval(this._timer);
  }

  fetch() {
    const base = app.forum.attribute('apiUrl') || '/api';
    fetch(`${base}/gn-live-scores`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        this.games   = data.games || [];
        this.loading = false;
        this.error   = false;
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        this.error   = true;
        m.redraw();
      });
  }

  view() {
    const t = (key) => app.translator.trans(`ernestdefoe-fbsfb.forum.widgets.${key}`);

    return m('.GN-widget.GN-liveScoresWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-tv'),
        ' ',
        t('live_scores'),
      ]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : this.error
          ? m('.GN-widget-empty', t('live_scores_unavailable'))
          : !this.games.length
          ? m('.GN-widget-empty', t('live_scores_empty'))
          : this.games.map((g) => this.viewGame(g, t)),
      ]),
    ]);
  }

  viewGame(g, t) {
    return m('.GN-scorecard', { key: g.id }, [
      m('.GN-scorecard-teams', [
        m('.GN-scorecard-team', { class: g.awayWins ? 'is-winning' : '' }, [
          g.away.logo ? m('img.GN-scorecard-logo', { src: g.away.logo, alt: g.away.abbr }) : null,
          m('span.GN-scorecard-name', g.away.abbr),
          m('span.GN-scorecard-score', g.away.score),
        ]),
        m('.GN-scorecard-team', { class: g.homeWins ? 'is-winning' : '' }, [
          g.home.logo ? m('img.GN-scorecard-logo', { src: g.home.logo, alt: g.home.abbr }) : null,
          m('span.GN-scorecard-name', g.home.abbr),
          m('span.GN-scorecard-score', g.home.score),
        ]),
      ]),
      m('.GN-scorecard-status', [
        g.isLive
          ? m('span.GN-liveBadge', t('live_badge'))
          : null,
        m('span.GN-scorecard-detail', g.status),
      ]),
    ]);
  }
}
