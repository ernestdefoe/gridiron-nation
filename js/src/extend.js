import { Admin } from 'flarum/common/extenders';
import RecruitsAdminPage from './admin/components/RecruitsAdminPage';

export default [
  new Admin()
    .setting(() => m(RecruitsAdminPage)),
];
