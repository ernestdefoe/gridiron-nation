# GridIron Nation 🏈

**A Flarum 2 theme for college football fan forums.**
Crimson palette, DM Sans, stadium-scoreboard hero, showcase-card discussion
list, live ESPN score ticker, recruit board, full dark mode.

> **Renamed from `ernestdefoe/fbsfb`.** v2.x ships as
> `ernestdefoe/gridiron-nation` (kebab-case, matches the rest of the
> `ernestdefoe/*` family). Upgraders: the package rename is handled by a
> settings-table migration that copies the legacy `fbsfb.*` /
> `ernestdefoe-fbsfb.*` rows under the new prefixes on first boot.
> Old rows stay in place so a rollback to v1 keeps working.

---

## Features

### 🏟 Stadium Hero
- **Scoreboard stats row** — MEMBERS, TOPICS, POSTS, ONLINE, NEWEST.
  ONLINE opens a dropdown of who's around right now; NEWEST exposes the
  most recently registered user.
- **Composer trigger** — pill-shaped "Tell everyone what you're working
  on…" that opens the New Discussion composer. Reads as the primary
  affordance on the homepage.
- **Pill nav row** — rendered below the hero gradient (not inside it)
  so the chips read on the page background.
- **Welcome hero forced visible** — the per-visitor dismiss flag is
  honoured by Flarum core; we override it to keep the themed hero on
  for everyone, but the admin's empty-`welcomeTitle` escape hatch still
  hides it.

### 🃏 Showcase Discussion List
Standalone reimplementation built from Flarum 2 primitives — **no
ramon/avocado dependency required**.

Each row renders as a card with:
- Author avatar + name + relative time + tag pills + Reply button
- Bold title (highlighted on search hits)
- Two-line excerpt pulled from the OP
- Embedded last-reply preview chip (avatar + author + snippet)
- "See N other replies" overflow link
- Footer stats row (likes + replies, ICU-pluralised)
- Crimson **yard-line accent strip** down the left edge for unread /
  sticky rows; muted strip on read rows
- Locked rows get a subtle treatment so they don't disappear

### 📝 Post Playcard
Posts on the discussion page get card chrome with the same yard-line
accent — crimson on the OP, muted on replies. Built **on top of Flarum
2's native Post grid** (no layout overrides), so it survives core
updates and plays nicely with any extension that injects controls,
reactions, or social-groups extras into the Post body.

### 📺 Live Scores Ticker
- Proxies ESPN's public college-football scoreboard endpoint — no API
  key required.
- Renders as a **horizontal scrolling ticker** above the discussion
  list, with up to 6 game cards sorted **Live → Scheduled → Final**.
- Pulsing green **LIVE** badge with quarter + clock detail.
- Winning score highlighted in crimson.
- Server-side cache: 60 seconds (visitors don't hammer ESPN).
- Refreshes client-side every 60 seconds.
- Graceful fallback — shows "Scores unavailable" if ESPN times out.

### ⭐ Top Recruits Widget
- Pulls live recruiting data from the
  [ernestdefoe/recruiting](https://github.com/ernestdefoe/recruiting)
  extension when installed. Without that extension, the widget hides
  itself.
- Headshots via On3 photo enrichment.
- CollegeFootballData.com is the source of truth — set your API key in
  the GridIron Nation Recruiting admin panel.
- Crimson position badge (QB, WR, DT …), star rating, school slot.

### 🔥 Trending Widget
- Five most-recently-active discussions straight from Flarum's store
  (no extra API round-trip).
- Rank 1–2 in crimson, rest in muted grey.
- Reply count + relative time per row.

### 🎯 Hero Tag Decoration
- Anchors up to two large, semi-transparent FontAwesome glyphs to the
  right side of every tagged discussion's hero, pulled from the
  secondary tag's icon (set per-tag in the Flarum Tags admin panel).
- Falls back to any tag with an icon if no secondary candidates exist
  — flat tag setups still get decoration.
- All three knobs (enabled, icon count, opacity 0–100) are
  admin-configurable.

### 🌙 Dark Mode
- Full `[data-theme^="dark"]` + system `prefers-color-scheme: dark`
  support.
- Surfaces shift from `#0c0d10` through `#16171c` cards to `#0f1013`
  inset areas (inputs, blockquotes, code blocks).
- Primary shifts to `#e05c5c` for legibility on dark backgrounds.
- Cascade-correct: dark block lives last in the stylesheet, no
  specificity fights.

### 🎨 Design System
- **Crimson primary** (`#B22222`) with `#8B0000` dark + `#d94f4f` light
  variants.
- **DM Sans Variable** loaded from Google Fonts, replaces Flarum's
  default font throughout.
- **14 px organic border-radius** on cards, dropdowns, modals,
  buttons, and inputs.
- **CSS custom properties** for `--primary-color`, `--body-bg`,
  `--control-bg`, `--border-color`, etc. — overlaying themes and
  ramon/colored compose cleanly.

---

## Installation

### Via Composer
```bash
composer require ernestdefoe/gridiron-nation
php flarum migrate
php flarum cache:clear
```

### Manual
1. Download or clone this repo into `extensions/ernestdefoe-gridiron-nation/`
2. Run `composer install` in the Flarum root
3. Run `php flarum migrate`
4. Run `php flarum cache:clear`
5. Enable **GridIron Nation** in the Flarum admin panel

> **JS is pre-compiled.** `js/dist/forum.js` and `js/dist/admin.js` are
> committed — no local build step needed for a vanilla install.

---

## Requirements

| Dependency | Version |
|---|---|
| PHP | `^8.3` |
| Flarum | `^2.0` |
| guzzlehttp/guzzle | `^7.0` |

### Optional, but recommended

| Extension | Why |
|---|---|
| [`ernestdefoe/recruiting`](https://github.com/ernestdefoe/recruiting) | Powers the Top Recruits widget with live CFBD data + On3 photo headshots. Without it, the widget hides. |
| [`ramon/colored`](https://github.com/ramon-1106/colored) | Per-tag color tinting on hero + discussion-list borders. GridIron Nation wires `data-colored-border=left/full` cleanly against the showcase card and yard-line accent. |
| [`flarum/realtime`](https://github.com/flarum/realtime) | Live discussion-list / notification / typing-indicator updates over a websocket. We hide the "N updates available" banner so the list refreshes silently. |

---

## Admin Settings

Under **Extensions → GridIron Nation** in the Flarum admin panel:

| Setting | Default | Purpose |
|---|---|---|
| `widget_live_scores` | `true` | Show the Live Scores ticker |
| `widget_trending` | `true` | Show the Trending sidebar widget |
| `widget_top_recruits` | `true` | Show the Top Recruits sidebar widget |
| `hero_deco_enabled` | `true` | Render FontAwesome glyph decoration on discussion heroes |
| `hero_deco_icon_count` | `2` | 1 or 2 icons (2-icon mode requires ≥ 768 px viewport) |
| `hero_deco_opacity` | `35` | Glyph opacity, 0–100 (set to `0` to hide without disabling) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/gn-live-scores` | ESPN scoreboard proxy (public, 60 s cache) |
| `GET` | `/api/gn-online` | Users online in last 5 min (auth-aware, per-actor cache) |

The retired `/api/gn-recruits` endpoints from v1.x have been removed —
recruit data now comes from `ernestdefoe/recruiting`'s
`/api/cfbd-recruits` endpoint when that extension is installed.

---

## Building JS from source

```bash
cd js
npm install
npm run build   # production
npm run dev     # watch mode
```

---

## Upgrading from `ernestdefoe/fbsfb` (v1.x)

The composer rename forces Flarum to treat this as a fresh extension
ID. To upgrade:

```bash
composer remove ernestdefoe/fbsfb
composer require ernestdefoe/gridiron-nation
php flarum migrate           # runs the settings copy migration
php flarum cache:clear
php flarum extension:enable ernestdefoe-gridiron-nation
```

The settings migration copies every `fbsfb.*` and `ernestdefoe-fbsfb.*`
row in your settings table to the new `gridiron-nation.*` and
`ernestdefoe-gridiron-nation.*` prefixes. Legacy rows stay in place so
a downgrade picks them back up cleanly.

---

## License

MIT © [ernestdefoe](https://github.com/ernestdefoe)
