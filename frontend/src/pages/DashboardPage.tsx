import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ThreeDButton } from '../components/ThreeDButton';
import { api } from '../services/api';
import type { SavedSplit } from '../types/models';

export function DashboardPage() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<SavedSplit[]>([]);

  useEffect(() => {
    api.listSplits().then((splits) => setRecent(splits.slice(0, 3))).catch(() => setRecent([]));
  }, []);

  return (
    <AppShell>
      <section className="hero-card card">
        <div>
          <p className="eyebrow">Smart bill splitting MVP</p>
          <h1>Split a dining bill fairly and save the result to Supabase.</h1>
          <p className="lead">Add friends, add bill items, choose equal or smart split, then confirm a saved record through the backend database.</p>
          <div className="button-row">
            <ThreeDButton onClick={() => navigate('/people')}>Start a new split</ThreeDButton>
            <ThreeDButton variant="secondary" onClick={() => navigate('/records')}>View saved splits</ThreeDButton>
          </div>
        </div>
        <div className="feature-grid">
          <article><strong>React</strong><span>Clean screens and user workflow</span></article>
          <article><strong>Python</strong><span>FastAPI backend and validation</span></article>
          <article><strong>Supabase</strong><span>Persistent user and bill data</span></article>
          <article><strong>Secure</strong><span>Keys kept in environment variables</span></article>
        </div>
      </section>
      <section className="card list-card">
        <h2>Recent saved splits</h2>
        {recent.length === 0 ? (
          <p>No saved split yet. Complete the workflow to create one.</p>
        ) : (
          <div className="record-list">
            {recent.map((split) => (
              <button key={split.id} className="record-row" onClick={() => navigate(`/summary/${split.id}`)}>
                <span><strong>{split.title}</strong><small>{split.mode} split</small></span>
                <strong>${Number(split.total_amount).toFixed(2)}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
