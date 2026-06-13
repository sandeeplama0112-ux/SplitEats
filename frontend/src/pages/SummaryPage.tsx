import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ThreeDButton } from '../components/ThreeDButton';
import { api } from '../services/api';
import type { SavedSplit } from '../types/models';

export function SummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [split, setSplit] = useState<SavedSplit | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getSplit(id).then(setSplit).catch((err) => setError(err instanceof Error ? err.message : 'Split could not be loaded.'));
  }, [id]);

  return (
    <AppShell>
      <section className="card confirmation-card">
        {error && <div className="alert error">{error}</div>}
        {!split ? (
          <p>Loading saved split...</p>
        ) : (
          <>
            <div className="success-icon">✓</div>
            <p className="eyebrow">Saved successfully</p>
            <h1>{split.title}</h1>
            <p className="lead">This record was saved by the Python backend and can be retrieved from the database board.</p>
            <div className="summary-grid compact">
              <article><span>Total</span><strong>${Number(split.total_amount).toFixed(2)}</strong></article>
              <article><span>Mode</span><strong>{split.mode}</strong></article>
              <article><span>People</span><strong>{split.people.length}</strong></article>
            </div>
            <h2>Payment summary</h2>
            <div className="breakdown-list">
              {split.people.map((person) => (
                <div className="breakdown-row success" key={person.name}>
                  <span><strong>{person.name}</strong><small>amount confirmed</small></span>
                  <strong>${Number(person.amount).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <h2>Bill items</h2>
            <div className="mini-list">
              {split.items.map((item, index) => (
                <div key={`${item.item_name}-${index}`}><span>{item.item_name}</span><strong>${Number(item.price).toFixed(2)}</strong></div>
              ))}
            </div>
            <div className="button-row center-row">
              <ThreeDButton onClick={() => navigate('/people')}>New split</ThreeDButton>
              <ThreeDButton variant="secondary" onClick={() => navigate('/records')}>Open database board</ThreeDButton>
            </div>
            <p className="small-text">Record ID: <code>{split.id}</code></p>
            <Link to="/dashboard" className="link-button center">Return to dashboard</Link>
          </>
        )}
      </section>
    </AppShell>
  );
}
