import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

/**
 * LiveScoresWidget — Phase 2
 *
 * Horizontal auto-scrolling ticker of NCAA football scores. The full
 * scoreboard (up to 25 games) is duplicated in the DOM and the row is
 * animated leftward via @keyframes so the loop is seamless — when the
 * first copy slides out of view the second copy is already in place
 * at the same position. Pauses on hover so a visitor can read a
 * specific score.
 *
 * Data source: /api/gn-live-scores (our ESPN proxy, 60s server-side
 * cache). We poll every 60s while the widget is mounted, which lines
 * up with the cache TTL and avoids hammering ESPN.
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
        this.games   = Array.isArray(data.games) ? data.games : [];
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
    const t = (key) => app.translator.trans(`ernestdefoe-gridiron-nation.forum.widgets.${key}`);

    // The marquee track holds TWO copies of the game list back-to-back.
    // CSS animates `translateX(-50%)` from 0 to -50% so each copy
    // takes the full duration to slide off, then snaps back when the
    // second copy reaches the leftmost position. Result: seamless
    // infinite scroll without JS doing per-frame layout work.
    //
    // Tune duration by game count: longer lists need a longer cycle
    // so any one game gets ~15 seconds of legibility. We cap at 360s
    // (6 minutes) so a 25-game scoreboard doesn't drag past the
    // half-cycle mark for a typical short visit. Slower than the
    // initial 3s/game pace AND the subsequent 6s/game tweak — both
    // still felt rushed to the operator. 15s lets a visitor read the
    // matchup, score, and clock without it sliding off-screen.
    const games = this.games.slice(0, 25);
    const cycleSeconds = Math.min(360, Math.max(90, games.length * 15));

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
          : !games.length
          ? m('.GN-widget-empty', t('live_scores_empty'))
          : m('.GN-tickerViewport', [
              m('.GN-tickerTrack', {
                style: { 'animation-duration': `${cycleSeconds}s` },
              }, [
                ...games.map((g, i) => this.viewGame(g, t, `a-${i}`)),
                // Second copy of the list — invisible from the user's
                // POV because it occupies the same animated slot as
                // the first copy shifted one cycle later. aria-hidden
                // because the screen reader gets the names once from
                // copy A.
                ...games.map((g, i) =>
                  this.viewGame(g, t, `b-${i}`, /* aria */ true)
                ),
              ]),
            ]),
      ]),
    ]);
  }

  viewGame(g, t, key, ariaHidden = false) {
    return m('.GN-scorecard', {
      key,
      'aria-hidden': ariaHidden ? 'true' : null,
    }, [
      m('.GN-scorecard-teams', [
        m('.GN-scorecard-team', { class: g.awayWins ? 'is-winning' : '' }, [
          g.away.logo ? m('img.GN-scorecard-logo', { src: g.away.logo, alt: '' }) : null,
          m('span.GN-scorecard-name', g.away.abbr),
          m('span.GN-scorecard-score', g.away.score),
        ]),
        m('.GN-scorecard-team', { class: g.homeWins ? 'is-winning' : '' }, [
          g.home.logo ? m('img.GN-scorecard-logo', { src: g.home.logo, alt: '' }) : null,
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
