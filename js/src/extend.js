import { Admin } from 'flarum/common/extenders';

// No saved settings — recruits are managed via their own API.
// RecruitsAdminPage is injected into the extension page via sections() in admin.js.
export default [
  new Admin(),
];
