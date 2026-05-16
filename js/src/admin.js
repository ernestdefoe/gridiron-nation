import app from 'flarum/admin/app';
import RecruitsAdminPage from './admin/components/RecruitsAdminPage';

app.initializers.add('ernestdefoe-fbsfb', () => {
  // Register the recruits manager as the extension's admin settings page
  app.extensionData
    .for('ernestdefoe-fbsfb')
    .registerPage(RecruitsAdminPage);
});
