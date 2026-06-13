import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ThreeDButton } from '../components/ThreeDButton';
import { api, type HealthResponse } from '../services/api';
import type { SavedSplit } from '../types/models';

export function RecordsPage() {
  const navigate = useNavigate();
  const [splits, setSplits] = useState<SavedSplit[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [healthResult, splitResult] = await Promise.all([api.health(), api.listSplits()]);
      setHealth(healthResult);
      setSplits(splitResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retrieve records.');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <section className="card list-card wide">
        <div className="board-heading">
          <div>
            <p className="eyebrow">Database board</p>
            <h1>Saved SplitEats+ records</h1>
            <p className="lead">This screen retrieves saved user data from the backend database endpoint.</p>
          </div>
          <ThreeDButton variant="secondary" onClick={load}>Refresh</ThreeDButton>
        </div>
        {health && <div className={`database-badge ${health.supabase_configured ? 'live' : 'mock'}`}>Backend status: {health.status} | Database: {health.database}</div>}
        {error && <div className="alert error">{error}</div>}
        {splits.length === 0 ? (
          <div className="empty-state"><p>No records yet.</p><ThreeDButton onClick={() => navigate('/people')}>Create a split</ThreeDButton></div>
        ) : (
          <div className="records-table">
            <div className="records-head"><span>Title</span><span>Total</span><span>Mode</span><span>People</span><span></span></div>
            {splits.map((split) => (
              <div className="records-row" key={split.id}>
                <span><strong>{split.title}</strong><small>{split.created_at ? new Date(split.created_at).toLocaleString() : 'recently saved'}</small></span>
                <strong>${Number(split.total_amount).toFixed(2)}</strong>
                <span>{split.mode}</span>
                <span>{split.people.map((person) => person.name).join(', ')}</span>
                <button className="link-button" onClick={() => navigate(`/summary/${split.id}`)}>Open</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
