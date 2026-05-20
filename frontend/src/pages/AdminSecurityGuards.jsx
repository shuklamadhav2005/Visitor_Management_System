import { useEffect, useState } from 'react';
import api from '../lib/api.js';

const emptyGuard = {
  name: '',
  email: '',
  password: '',
};

function AdminSecurityGuards() {
  const [guards, setGuards] = useState([]);
  const [guardForm, setGuardForm] = useState(emptyGuard);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadGuards() {
    const response = await api.get('/admin/users');
    const securityUsers = response.users.filter((user) => user.role === 'security');
    setGuards(securityUsers);
  }

  useEffect(() => {
    let active = true;

    async function loadGuards() {
      try {
        const response = await api.get('/admin/users');
        if (!active) {
          return;
        }

        const securityUsers = response.users.filter((user) => user.role === 'security');
        setGuards(securityUsers);
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      }
    }

    loadGuards();

    return () => {
      active = false;
    };
  }, []);

  function updateGuardForm(event) {
    setGuardForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function addGuard(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.post('/admin/users', { ...guardForm, role: 'security' });
      setGuardForm(emptyGuard);
      setMessage('Security guard added successfully.');
      await loadGuards();
    } catch (createError) {
      setError(createError.message);
    }
  }

  async function removeGuard(userId) {
    setMessage('');
    setError('');

    try {
      await api.delete(`/admin/users/${userId}`);
      setMessage('Security guard removed successfully.');
      await loadGuards();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <>
      <section className="panel-card span-two">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Security Guard Management</span>
            <h4>Add security guard</h4>
          </div>
        </div>

        <form className="visitor-form" onSubmit={addGuard}>
          <label>
            Name
            <input name="name" value={guardForm.name} onChange={updateGuardForm} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={guardForm.email} onChange={updateGuardForm} required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={guardForm.password} onChange={updateGuardForm} required />
          </label>
          <button type="submit" className="primary-button full-span">Add Security Guard</button>
        </form>
      </section>

      <section className="panel-card span-two">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Security Guard Management</span>
            <h4>Security guards list</h4>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        <div className="mini-list">
          {guards.length ? (
            guards.map((guard) => (
              <div key={guard._id} className="mini-row">
                <div>
                  <strong>{guard.name}</strong>
                  <p>{guard.email}</p>
                </div>
                <div className="row-actions">
                  <span className="status-chip security">Security</span>
                  <button type="button" className="ghost-button reject" onClick={() => removeGuard(guard._id)}>Remove Guard</button>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No security guards found.</p>
          )}
        </div>
      </section>
    </>
  );
}

export default AdminSecurityGuards;
