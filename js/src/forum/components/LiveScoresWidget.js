import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * LiveScoresWidget — Phase 2
 *
 * Fetches college football scores from our ESPN proxy (/api/gn-live-scores)
 * and auto-refreshes every 60 seconds while mounted.
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
    return m('.GN-widget.GN-liveScoresWidget', [
      m('.GN-widget-header', [
        m('i.fas.fa-tv'),
        ' Live Scores',
      ]),
      m('.GN-widget-body', [
        this.loading
          ? m('.GN-widget-loading', m('i.fas.fa-spinner.fa-spin'))
          : this.error
          ? m('.GN-widget-empty', 'Scores unavailable')
          : !this.games.length
          ? m('.GN-widget-empty', 'No games today')
          : this.games.map((g) => this.viewGame(g)),
      ]),
    ]);
  }

  viewGame(g) {
    return m('.GN-scorecard', { key: g.id }, [
      m('.GN-scorecard-teams', [
        m('.GN-scorecard-team', { class: g.awayWins ? 'is-winning' : '' }, [
          m('span.GN-scorecard-abbr', g.away.abbr),
          m('span.GN-scorecard-score', g.away.score),
        ]),
        m('.GN-scorecard-team', { class: g.homeWins ? 'is-winning' : '' }, [
          m('span.GN-scorecard-abbr', g.home.abbr),
          m('span.GN-scorecard-score', g.home.score),
        ]),
      ]),
      m('.GN-scorecard-status', [
        g.isLive
          ? m('span.GN-liveBadge', 'LIVE')
          : null,
        m('span.GN-scorecard-detail', g.status),
      ]),
    ]);
  }
}
