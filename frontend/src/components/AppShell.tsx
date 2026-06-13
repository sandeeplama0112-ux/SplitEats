import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const email = localStorage.getItem('spliteats_email');
  const logout = () => {
    localStorage.removeItem('spliteats_token');
    localStorage.removeItem('spliteats_email');
    localStorage.removeItem('last_split_id');
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/dashboard" className="brand" aria-label="SplitEats dashboard">
          <span className="brand-mark">SE</span>
          <span>
            <strong>SplitEats+</strong>
            <small>Fair bill splitting</small>
          </span>
        </Link>
        <nav className="topnav" aria-label="Main navigation">
          {email && <span className="user-chip">{email}</span>}
          <Link to="/records">Saved splits</Link>
          {email && <button onClick={logout} className="link-button">Logout</button>}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">BUS4012 Assignment 03 - React frontend, Python backend and Supabase-ready persistence.</footer>
    </div>
  );
}
