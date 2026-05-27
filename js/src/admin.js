import app from 'flarum/admin/app';

// Re-export the Admin extender so flarum-webpack-config's bootExtensions
// hook applies it at the right point in the boot sequence — the place
// where app.extensionData IS already populated. Doing this in
// app.initializers.add('...', () => app.extensionData.for(...)) races
// the core initializer that registers extensionData and surfaces as
// `TypeError: undefined is not an object (evaluating 'app.extensionData.for')`.
import extend from './extend';
export { extend };

app.initializers.add('ernestdefoe-gridiron-nation', () => {
  // No imperative admin work — settings are declarative via extend.js
  // above. This empty initializer is kept as a hook for future
  // per-theme admin UI (preview pane, palette editor, etc.).
});
