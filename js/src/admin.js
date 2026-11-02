// Re-export the Admin extender so flarum-webpack-config's bootExtensions
// hook applies it at the right point in the boot sequence — the place
// where app.extensionData IS already populated. Doing this in
// app.initializers.add('...', () => app.extensionData.for(...)) races
// the core initializer that registers extensionData and surfaces as
// `TypeError: undefined is not an object (evaluating 'app.extensionData.for')`.
// Settings are declarative, so there is no admin initializer.
import extend from './extend';
export { extend };
