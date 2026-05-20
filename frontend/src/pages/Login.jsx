import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setLoginForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await login(loginForm);
      navigate('/');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      setOtpEmail(forgotEmail);
      setOtp('');
      setMode('verify');
      setMessage(response.message || 'OTP sent to your email.');

      if (response.devOtp) {
        setMessage(`OTP generated for development: ${response.devOtp}`);
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/verify-otp', { email: otpEmail, otp });
      setResetToken(response.resetToken);
      setNewPassword('');
      setConfirmPassword('');
      setMode('reset');
      setMessage(response.message || 'OTP verified. Set your new password.');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/reset-password', {
        resetToken,
        password: newPassword,
        confirmPassword,
      });

      setMessage(response.message || 'Password reset successfully. Please sign in.');
      setMode('login');
      setLoginForm({ email: otpEmail, password: '' });
      setForgotEmail('');
      setOtpEmail('');
      setOtp('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div>
          <span className="eyebrow">Visitor management system</span>
          {mode === 'login' ? <h1>Secure entry control for teams that need structure.</h1> : null}
          {mode === 'login' ? <p>Sign in to manage visitors, approvals, and daily activity from one workspace.</p> : null}
          {mode === 'forgot' ? <h1>Reset your password.</h1> : null}
          {mode === 'forgot' ? <p>Enter your email and we will send you a one-time code.</p> : null}
          {mode === 'verify' ? <h1>Verify the OTP.</h1> : null}
          {mode === 'verify' ? <p>Enter the code sent to your email to continue.</p> : null}
          {mode === 'reset' ? <h1>Create a new password.</h1> : null}
          {mode === 'reset' ? <p>Set a new password and confirm it to finish the reset.</p> : null}
        </div>

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input name="email" type="email" value={loginForm.email} onChange={updateField} placeholder="admin@company.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" value={loginForm.password} onChange={updateField} placeholder="••••••••" required />
            </label>

            {message ? <div className="success-banner">{message}</div> : null}
            {error ? <div className="error-banner">{error}</div> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <button type="button" className="ghost-button full-span" onClick={() => setMode('forgot')}>
              Forgot password?
            </button>

            <p className="form-footer">
              Need an account? <Link to="/register">Create one</Link>
            </p>
          </form>
        ) : null}

        {mode === 'forgot' ? (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <label>
              Email
              <input name="forgotEmail" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} placeholder="you@example.com" required />
            </label>

            {message ? <div className="success-banner">{message}</div> : null}
            {error ? <div className="error-banner">{error}</div> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <button type="button" className="ghost-button full-span" onClick={() => setMode('login')}>
              Back to sign in
            </button>
          </form>
        ) : null}

        {mode === 'verify' ? (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <label>
              Email
              <input type="email" value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} required />
            </label>
            <label>
              OTP
              <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter 6-digit code" required />
            </label>

            {message ? <div className="success-banner">{message}</div> : null}
            {error ? <div className="error-banner">{error}</div> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button type="button" className="ghost-button full-span" onClick={() => setMode('forgot')}>
              Resend OTP
            </button>
          </form>
        ) : null}

        {mode === 'reset' ? (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <label>
              New password
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Create a new password" required />
            </label>
            <label>
              Re-enter password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter the password" required />
            </label>

            {message ? <div className="success-banner">{message}</div> : null}
            {error ? <div className="error-banner">{error}</div> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Reset password'}
            </button>

            <button type="button" className="ghost-button full-span" onClick={() => setMode('login')}>
              Back to sign in
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export default Login;
