import { useEffect, useState } from 'react';
import api from '../lib/api.js';

const emptyResident = {
  name: '',
  email: '',
  password: '',
  flatNumber: '',
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [residentForm, setResidentForm] = useState(emptyResident);
  const [flatDrafts, setFlatDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadResidents() {
    const response = await api.get('/admin/users');
    const residents = response.users.filter((user) => user.role === 'user');
    setUsers(residents);
    setFlatDrafts(Object.fromEntries(residents.map((resident) => [resident._id, resident.flatNumber || ''])));
  }

  useEffect(() => {
    loadResidents().catch((loadError) => setError(loadError.message));
  }, []);

  function updateForm(event) {
    setResidentForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function addResident(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.post('/admin/users', { ...residentForm, role: 'user' });
      setResidentForm(emptyResident);
      setMessage('Resident created successfully.');
      await loadResidents();
    } catch (createError) {
      setError(createError.message);
    }
  }

  async function updateFlatNumber(userId) {
    setMessage('');
    setError('');

    try {
      await api.put(`/admin/users/${userId}`, { flatNumber: flatDrafts[userId] || '' });
      setMessage('Flat number updated.');
      await loadResidents();
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function deleteResident(userId) {
    setMessage('');
    setError('');

    try {
      await api.delete(`/admin/users/${userId}`);
      setMessage('Resident removed successfully.');
      await loadResidents();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <>
      <section className="panel-card span-two">
        <div className="panel-header">
          <div>
            <span className="eyebrow">User Management</span>
            <h4>Add resident</h4>
          </div>
        </div>

        <form className="visitor-form" onSubmit={addResident}>
          <label>
            Name
            <input name="name" value={residentForm.name} onChange={updateForm} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={residentForm.email} onChange={updateForm} required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={residentForm.password} onChange={updateForm} required />
          </label>
          <label>
            Flat Number
            <input name="flatNumber" value={residentForm.flatNumber} onChange={updateForm} required />
          </label>
          <button type="submit" className="primary-button full-span">Add User</button>
        </form>
      </section>

      <section className="panel-card span-two">
        <div className="panel-header">
          <div>
            <span className="eyebrow">User Management</span>
            <h4>Residents list</h4>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        <div className="mini-list">
          {users.map((user) => (
            <div key={user._id} className="mini-row">
              <div>
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>
              <div className="row-actions">
                <input
                  value={flatDrafts[user._id] || ''}
                  onChange={(event) => setFlatDrafts((current) => ({ ...current, [user._id]: event.target.value }))}
                  placeholder="Flat number"
                />
                <button type="button" className="ghost-button" onClick={() => updateFlatNumber(user._id)}>Save Flat</button>
                <button type="button" className="ghost-button reject" onClick={() => deleteResident(user._id)}>Delete User</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default AdminUsers;
