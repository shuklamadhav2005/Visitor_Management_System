import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', flatNumber: '', adminCode: '', securityCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(form);
      navigate('/');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card auth-card-wide">
        <div>
          <span className="eyebrow">Create account</span>
          <h1>Set up a User or Admin profile for the visitor desk.</h1>
          <p>Users can log visitors. Admins can manage the full workspace and team activity.</p>
        </div>

        <form className="auth-form two-column" onSubmit={handleSubmit}>
          <label>
            Full name
            <input name="name" value={form.name} onChange={updateField} placeholder="Ava Stone" required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} placeholder="ava@company.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={updateField} placeholder="Create a secure password" required />
          </label>
          <label>
            Role
            <select name="role" value={form.role} onChange={updateField}>
              <option value="user">User</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {form.role === 'user' ? (
            <label>
              Flat number
              <input name="flatNumber" value={form.flatNumber} onChange={updateField} placeholder="A-204" required />
            </label>
          ) : null}
          {form.role === 'admin' ? (
            <label className="full-span">
              Admin code
              <input name="adminCode" value={form.adminCode} onChange={updateField} placeholder="Enter the admin invite code" />
            </label>
          ) : null}
          {form.role === 'security' ? (
            <label className="full-span">
              Security code
              <input name="securityCode" value={form.securityCode} onChange={updateField} placeholder="Enter the security invite code" />
            </label>
          ) : null}

          {error ? <div className="error-banner full-span">{error}</div> : null}

          <button className="primary-button full-span" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="form-footer full-span">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
