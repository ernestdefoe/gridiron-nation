import app from 'flarum/admin/app';
import { Admin } from 'flarum/common/extenders';
import RecruitsAdminPage from './admin/components/RecruitsAdminPage';

// Required stub — Flarum 2 boot calls all initializers
app.initializers.add('ernestdefoe-fbsfb', () => {});

// Admin extender array — must be the default export so Flarum's bootExtensions
// picks it up. The root js/admin.js re-exports both * and { default }.
export default [
  new Admin()
    .setting(() => m(RecruitsAdminPage)),
];
