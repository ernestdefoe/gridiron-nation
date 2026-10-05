/**
 * A page-lifetime store for one sidebar widget's data.
 *
 * The sidebar widgets used to fetch in oncreate and run their own
 * setInterval. That meant every visit back to the index page fetched
 * again (the widgets are re-created on each visit), and a tab left open
 * in the background kept polling the forum every minute, forever.
 *
 * Here the data, the timer and the in-flight promise live at module
 * level and the component is only a reader:
 *  - a remount inside the TTL reuses what is already loaded;
 *  - one in-flight request is shared by every reader;
 *  - the poll skips while the tab is hidden and catches up once when
 *    it becomes visible again;
 *  - readers are refcounted, so the timer stops when the last one leaves.
 *
 * `load()` must resolve (never reject) with the value to hold.
 * Returning `{ final: true }` alongside the value stops further loads for
 * the page lifetime (e.g. the endpoint does not exist on this forum).
 */
export default function feed(load, ttlMs) {
  const s = { value: undefined, at: 0, inflight: null, readers: 0, timer: null, final: false };

  const stale = () => Date.now() - s.at >= ttlMs;

  function refresh(force = false) {
    if (s.final || s.inflight || (!force && s.value !== undefined && !stale())) return;

    s.inflight = Promise.resolve()
      .then(load)
      .then((result) => {
        s.value = result?.value;
        s.final = !!result?.final;
        s.at = Date.now();
      })
      .catch(() => {})
      .finally(() => {
        s.inflight = null;
        m.redraw();
      });
  }

  // The timer forces a reload on schedule; coming back to the tab (or a
  // remount) only reloads when what is held has gone stale.
  function onTick() {
    if (!document.hidden) refresh(true);
  }

  function onVisible() {
    if (!document.hidden) refresh();
  }

  return {
    get: () => s.value,
    loaded: () => s.value !== undefined,

    attach() {
      s.readers++;
      if (s.readers === 1) {
        s.timer = setInterval(onTick, ttlMs);
        document.addEventListener('visibilitychange', onVisible);
      }
      refresh();
    },

    detach() {
      s.readers = Math.max(0, s.readers - 1);
      if (s.readers === 0) {
        clearInterval(s.timer);
        s.timer = null;
        document.removeEventListener('visibilitychange', onVisible);
      }
    },
  };
}
