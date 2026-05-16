import app from 'flarum/admin/app';
import { Admin } from 'flarum/common/extenders';
import RecruitsAdminPage from './admin/components/RecruitsAdminPage';

// Flarum 2 canonical pattern — Admin extender, not app.extensionData
export default [
  new Admin()
    .setting(() => m(RecruitsAdminPage)),
];
