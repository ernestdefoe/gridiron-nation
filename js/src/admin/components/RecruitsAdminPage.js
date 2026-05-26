import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

const STATUSES = ['committed', 'undecided', 'decommitted'];
const T_PREFIX = 'ernestdefoe-fbsfb.admin.recruits.';

/**
 * RecruitsAdminPage — Phase 5 Admin UI
 *
 * Add / edit / delete recruit entries that appear in the Top Recruits
 * sidebar widget. Talks to the four /api/gn-recruits endpoints, all
 * gated by `$actor->assertAdmin()` server-side.
 *
 * Every visible string flows through app.translator so the page can
 * be localized via the standard Flarum yml pipeline; the canonical
 * English copy lives in locale/en.yml under the matching keys.
 */
export default class RecruitsAdminPage extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.recruits   = [];
    this.loading    = true;
    this.saving     = false;
    this.deletingId = null;
    this.editingId  = null;
    this.error      = null;

    // New recruit form state
    this.form = this.blankForm();
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this.fetch();
  }

  t(key, params) {
    return app.translator.trans(T_PREFIX + key, params);
  }

  blankForm() {
    return { name: '', position: '', height: '', hometown: '', stars: 3, status: 'undecided', school: '', sortOrder: 0 };
  }

  apiBase() {
    return app.forum.attribute('apiUrl') || '/api';
  }

  fetch() {
    this.loading = true;
    fetch(`${this.apiBase()}/gn-recruits`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => { this.recruits = data.data || []; this.loading = false; m.redraw(); })
      .catch(() => { this.loading = false; m.redraw(); });
  }

  save() {
    if (!this.form.name.trim()) {
      this.error = this.t('name_required_error');
      return;
    }
    this.saving = true;
    this.error  = null;

    const url    = this.editingId ? `${this.apiBase()}/gn-recruits/${this.editingId}` : `${this.apiBase()}/gn-recruits`;
    const method = this.editingId ? 'PATCH' : 'POST';

    fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': app.session.csrfToken || '' },
      body: JSON.stringify({ ...this.form }),
    })
      .then((r) => { if (!r.ok) throw new Error('Save failed'); return r.json(); })
      .then((data) => {
        if (this.editingId) {
          const idx = this.recruits.findIndex((r) => r.id === this.editingId);
          if (idx !== -1) this.recruits[idx] = data;
        } else {
          this.recruits.push(data);
        }
        this.form      = this.blankForm();
        this.editingId = null;
        this.saving    = false;
        m.redraw();
      })
      .catch((e) => { this.error = e.message; this.saving = false; m.redraw(); });
  }

  startEdit(r) {
    this.editingId = r.id;
    this.form = {
      name: r.name, position: r.position || '', height: r.height || '',
      hometown: r.hometown || '', stars: r.stars || 3, status: r.status || 'undecided',
      school: r.school || '', sortOrder: r.sortOrder || 0,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
    m.redraw();
  }

  cancelEdit() {
    this.editingId = null;
    this.form      = this.blankForm();
    this.error     = null;
    m.redraw();
  }

  deleteRecruit(r) {
    if (!confirm(this.t('delete_confirm', { name: r.name }))) return;
    this.deletingId = r.id;
    fetch(`${this.apiBase()}/gn-recruits/${r.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': app.session.csrfToken || '' },
    })
      .then(() => { this.recruits = this.recruits.filter((x) => x.id !== r.id); this.deletingId = null; m.redraw(); })
      .catch(() => { this.deletingId = null; m.redraw(); });
  }

  field(key, label, attrs = {}) {
    return m('.Form-group', [
      m('label', label),
      m('input.FormControl', {
        value:   this.form[key],
        oninput: (e) => { this.form[key] = e.target.value; },
        ...attrs,
      }),
    ]);
  }

  view() {
    const ph = (key) => this.t(`placeholders.${key}`);
    const col = (key) => this.t(`columns.${key}`);
    const st = (key) => this.t(`statuses.${key}`);

    return m('.RecruitsAdminPage', [
      m('h2', this.editingId ? this.t('heading_edit') : this.t('heading_add')),

      this.error ? m('.Alert.Alert--error', { style: 'margin-bottom:1rem' }, this.error) : null,

      m('.GN-adminForm', [
        this.field('name',     this.t('name_required'), { placeholder: ph('name'), required: true }),
        this.field('position', this.t('position'),      { placeholder: ph('position'), style: 'width:80px' }),
        this.field('height',   this.t('height'),        { placeholder: ph('height') }),
        this.field('hometown', this.t('hometown'),      { placeholder: ph('hometown') }),

        m('.Form-group', [
          m('label', this.t('stars')),
          m('input.FormControl', {
            type: 'number', min: 1, max: 5,
            value: this.form.stars,
            oninput: (e) => { this.form.stars = parseInt(e.target.value, 10) || 3; },
            style: 'width:70px',
          }),
        ]),

        m('.Form-group', [
          m('label', this.t('status')),
          m('select.FormControl', {
            value:    this.form.status,
            onchange: (e) => { this.form.status = e.target.value; },
          }, STATUSES.map((s) => m('option', { value: s }, st(s)))),
        ]),

        this.field('school',    this.t('school'),     { placeholder: ph('school'), disabled: this.form.status !== 'committed' }),
        this.field('sortOrder', this.t('sort_order'), { type: 'number', style: 'width:80px' }),

        m('.GN-adminForm-actions', [
          m(Button, { class: 'Button Button--primary', onclick: () => this.save(), disabled: this.saving },
            this.saving ? m('i.fas.fa-spinner.fa-spin') : (this.editingId ? this.t('save') : this.t('add'))),
          this.editingId
            ? m(Button, { class: 'Button', onclick: () => this.cancelEdit() }, this.t('cancel'))
            : null,
        ]),
      ]),

      m('h2', { style: 'margin-top:2rem' }, this.t('heading_list', { count: this.recruits.length })),

      this.loading
        ? m(LoadingIndicator, { display: 'block' })
        : !this.recruits.length
        ? m('p', this.t('empty'))
        : m('table.GN-recruitsTable', [
            m('thead', m('tr', [
              m('th', col('name')), m('th', col('pos')), m('th', col('stars')),
              m('th', col('status')), m('th', col('school')), m('th'),
            ])),
            m('tbody', this.recruits.map((r) => m('tr', { key: r.id, class: this.deletingId === r.id ? 'is-deleting' : '' }, [
              m('td', r.name),
              m('td', r.position),
              m('td', '★'.repeat(r.stars || 3)),
              m('td', st(r.status) || r.status),
              m('td', r.school || '—'),
              m('td', [
                m('button.Button.Button--sm', { onclick: () => this.startEdit(r) }, this.t('edit')),
                ' ',
                m('button.Button.Button--sm.Button--danger', { onclick: () => this.deleteRecruit(r) }, this.t('delete')),
              ]),
            ]))),
          ]),
    ]);
  }
}
