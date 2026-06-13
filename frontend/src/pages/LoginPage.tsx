import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type HealthResponse } from '../services/api';
import { ThreeDButton } from '../components/ThreeDButton';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('student@example.com');
  const [password, setPassword] = useState('Password123!');
  const [confirmPassword, setConfirmPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = isRegister ? await api.register(email, password) : await api.login(email, password);
      localStorage.setItem('spliteats_token', response.token);
      localStorage.setItem('spliteats_email', response.user.email);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel card">
        <div className="logo-circle">SE</div>
        <h1>SplitEats+</h1>
        <p className="lead">No more awkward bill moments. Split meals fairly, save the result, and retrieve it later.</p>
        <form onSubmit={submit} className="form-stack">
          <label>
            Email address
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required />
          </label>
          {isRegister && (
            <label>
              Confirm password
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" required />
            </label>
          )}
          {error && <div className="alert error" role="alert">{error}</div>}
          <ThreeDButton type="submit" disabled={loading}>{loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</ThreeDButton>
        </form>
        <button className="link-button center" onClick={() => setIsRegister((value) => !value)}>
          {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register here'}
        </button>
        <div className="security-note">
          <strong>Privacy note:</strong> passwords are sent only to the Python backend. The frontend stores only a session token, not the password.
        </div>
        {health && (
          <div className={`database-badge ${health.supabase_configured ? 'live' : 'mock'}`}>
            Database mode: {health.database}
          </div>
        )}
      </section>
    </div>
  );
}
