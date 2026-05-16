import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

const STATUSES = ['committed', 'undecided', 'decommitted'];

/**
 * RecruitsAdminPage — Phase 5 Admin UI
 *
 * Allows admins to add, edit, and delete recruit entries that appear
 * in the Top Recruits sidebar widget.
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
    if (!this.form.name.trim()) { this.error = 'Name is required.'; return; }
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
    if (!confirm(`Delete ${r.name}?`)) return;
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
    return m('.RecruitsAdminPage', [
      m('h2', this.editingId ? 'Edit Recruit' : 'Add Recruit'),

      this.error ? m('.Alert.Alert--error', { style: 'margin-bottom:1rem' }, this.error) : null,

      m('.GN-adminForm', [
        this.field('name',     'Name *',     { placeholder: 'Jalen Smith', required: true }),
        this.field('position', 'Position',   { placeholder: 'QB', style: 'width:80px' }),
        this.field('height',   'Height',     { placeholder: "6'3\"" }),
        this.field('hometown', 'Hometown',   { placeholder: 'Dallas, TX' }),

        m('.Form-group', [
          m('label', 'Stars (1–5)'),
          m('input.FormControl', {
            type: 'number', min: 1, max: 5,
            value: this.form.stars,
            oninput: (e) => { this.form.stars = parseInt(e.target.value, 10) || 3; },
            style: 'width:70px',
          }),
        ]),

        m('.Form-group', [
          m('label', 'Commit Status'),
          m('select.FormControl', {
            value:    this.form.status,
            onchange: (e) => { this.form.status = e.target.value; },
          }, STATUSES.map((s) => m('option', { value: s }, s.charAt(0).toUpperCase() + s.slice(1)))),
        ]),

        this.field('school',    'School',     { placeholder: 'Alabama', disabled: this.form.status !== 'committed' }),
        this.field('sortOrder', 'Sort Order', { type: 'number', style: 'width:80px' }),

        m('.GN-adminForm-actions', [
          m(Button, { class: 'Button Button--primary', onclick: () => this.save(), disabled: this.saving },
            this.saving ? m('i.fas.fa-spinner.fa-spin') : (this.editingId ? 'Save Changes' : 'Add Recruit')),
          this.editingId
            ? m(Button, { class: 'Button', onclick: () => this.cancelEdit() }, 'Cancel')
            : null,
        ]),
      ]),

      m('h2', { style: 'margin-top:2rem' }, `Recruits (${this.recruits.length})`),

      this.loading
        ? m(LoadingIndicator, { display: 'block' })
        : !this.recruits.length
        ? m('p', 'No recruits added yet.')
        : m('table.GN-recruitsTable', [
            m('thead', m('tr', [
              m('th', 'Name'), m('th', 'Pos'), m('th', 'Stars'),
              m('th', 'Status'), m('th', 'School'), m('th'),
            ])),
            m('tbody', this.recruits.map((r) => m('tr', { key: r.id, class: this.deletingId === r.id ? 'is-deleting' : '' }, [
              m('td', r.name),
              m('td', r.position),
              m('td', '★'.repeat(r.stars || 3)),
              m('td', r.status),
              m('td', r.school || '—'),
              m('td', [
                m('button.Button.Button--sm', { onclick: () => this.startEdit(r) }, 'Edit'),
                ' ',
                m('button.Button.Button--sm.Button--danger', { onclick: () => this.deleteRecruit(r) }, 'Delete'),
              ]),
            ]))),
          ]),
    ]);
  }
}
