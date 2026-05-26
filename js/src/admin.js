import app from 'flarum/admin/app';

// The recruits admin CRUD page that used to live here has been
// removed — recruit data now comes from the ernestdefoe/recruiting
// extension via /api/cfbd-recruits, which carries its own admin
// settings panel for the CFBD API key, year, and team filters. The
// theme has no admin UI of its own at this point; this initializer
// stays as a hook for any future per-theme settings.
app.initializers.add('ernestdefoe-fbsfb', () => {
  // No-op for now.
});
