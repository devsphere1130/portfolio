import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../authContext';
import { Drawer, ErrorState, Spinner } from '../components/Feedback';
import { FormGrid } from '../components/ResourcePage';
import { useToast } from '../toastContext';

const ROLE_OPTIONS = [{ value: 'editor', label: 'Editor — content and media' }, { value: 'admin', label: 'Admin — everything, including users and settings' }];

export const UsersPage = () => {
  const { user: me } = useAuth();
  const { notify, confirm } = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => api('/admin/users/').then((d) => setUsers(d.results)).catch(setError), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!users) return <Spinner />;

  const remove = async (user) => {
    if (!(await confirm({ title: `Delete ${user.email}?`, message: 'They will be signed out and lose access immediately.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await api(`/admin/users/${user.id}/`, { method: 'DELETE' });
      notify('User deleted.');
      setEditing(null);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-slate-400">Only admins can add people. There is no public sign-up.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing('new')}><Plus size={16} />Add user</button>
      </header>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="text-right">Last sign-in</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><button type="button" className="font-semibold hover:text-sky-200" onClick={() => setEditing(u)}>{u.name || '—'}</button>{u.id === me.id && <span className="admin-badge admin-badge-muted ml-2">You</span>}</td>
                <td>{u.email}</td>
                <td className="capitalize">{u.role}</td>
                <td>{u.is_active ? <span className="admin-badge admin-badge-published">Active</span> : <span className="admin-badge admin-badge-muted">Disabled</span>}</td>
                <td className="text-right text-xs text-slate-400">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <UserEditor user={editing === 'new' ? null : editing} isSelf={editing !== 'new' && editing.id === me.id}
                              onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} onDelete={remove} />}
    </section>
  );
};

const UserEditor = ({ user, isSelf, onClose, onSaved, onDelete }) => {
  const { notify } = useToast();
  const [values, setValues] = useState(user ? { ...user, password: '' } : { name: '', email: '', role: 'editor', is_active: true, password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const fields = [
    { name: 'name', label: 'Name', required: true, full: false },
    { name: 'email', label: 'Email', type: 'email', required: true, full: false },
    { name: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
    { name: 'password', label: user ? 'Set a new password' : 'Initial password', type: 'text', required: !user,
      hint: 'At least 12 characters, not a common password. Share it privately; they can change it under Account.' },
    ...(isSelf ? [] : [{ name: 'is_active', label: 'Active', type: 'boolean', checkboxLabel: 'Account can sign in' }]),
  ];

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { name: values.name, email: values.email, role: values.role, is_active: values.is_active };
    if (values.password) body.password = values.password;
    try {
      await api(user ? `/admin/users/${user.id}/` : '/admin/users/', { method: user ? 'PATCH' : 'POST', body });
      notify(user ? 'User updated.' : 'User created.');
      onSaved();
    } catch (e) {
      setErrors(e.fieldErrors);
      notify(e.status === 400 && e.data?.detail ? e.data.detail : 'Please fix the highlighted fields.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer title={user ? user.email : 'Add user'} onClose={onClose} footer={(
      <>
        {user && !isSelf && <button type="button" className="admin-btn admin-btn-danger mr-auto" onClick={() => onDelete(user)}>Delete</button>}
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </>
    )}>
      <FormGrid fields={fields} values={values} errors={errors} onChange={(name, value) => setValues({ ...values, [name]: value })} />
    </Drawer>
  );
};
