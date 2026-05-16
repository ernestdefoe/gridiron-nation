import app from 'flarum/admin/app';
import { extend } from 'flarum/common/extend';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import RecruitsAdminPage from './admin/components/RecruitsAdminPage';

app.initializers.add('ernestdefoe-fbsfb', () => {
  // Inject RecruitsAdminPage as a section on our own extension settings page.
  // We guard by extension ID so we don't affect any other extension's page.
  extend(ExtensionPage.prototype, 'sections', function (items) {
    if (this.attrs.id !== 'ernestdefoe-fbsfb') return;
    items.add('gn-recruits', m(RecruitsAdminPage), 90);
  });
});
