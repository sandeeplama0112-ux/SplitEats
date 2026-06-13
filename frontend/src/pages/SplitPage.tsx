import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ProgressSteps } from '../components/ProgressSteps';
import { StepCard } from '../components/StepCard';
import { ThreeDButton } from '../components/ThreeDButton';
import { api } from '../services/api';
import type { BillItem, Person, SplitItem, SplitPerson } from '../types/models';

type Mode = 'equal' | 'smart';

function calculateSplit(people: Person[], items: BillItem[], mode: Mode): SplitPerson[] {
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  if (people.length === 0) return [];
  if (mode === 'equal') {
    return people.map((person) => ({ name: person.name, amount: Number((total / people.length).toFixed(2)), paid: false }));
  }
  const amounts = new Map(people.map((person) => [person.id, 0]));
  const sharedItems = items.filter((item) => !item.assignedTo || item.assignedTo === 'shared');
  const sharedTotal = sharedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  for (const item of items) {
    if (item.assignedTo && item.assignedTo !== 'shared') {
      amounts.set(item.assignedTo, (amounts.get(item.assignedTo) || 0) + Number(item.price || 0));
    }
  }
  return people.map((person) => ({
    name: person.name,
    amount: Number(((amounts.get(person.id) || 0) + sharedTotal / people.length).toFixed(2)),
    paid: false
  }));
}

export function SplitPage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [mode, setMode] = useState<Mode>('smart');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = sessionStorage.getItem('draft_title') || 'Group bill';

  useEffect(() => {
    const savedPeople = JSON.parse(sessionStorage.getItem('draft_people') || '[]') as Person[];
    const savedItems = JSON.parse(sessionStorage.getItem('draft_items') || '[]') as BillItem[];
    if (savedPeople.length < 2 || savedItems.length === 0) {
      navigate('/people');
    } else {
      setPeople(savedPeople);
      setItems(savedItems);
    }
  }, [navigate]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0), 0), [items]);
  const splitPeople = useMemo(() => calculateSplit(people, items, mode), [people, items, mode]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const itemPayload: SplitItem[] = items.map((item) => ({
        item_name: item.name,
        price: Number(item.price),
        assigned_to: item.assignedTo === 'shared' ? null : people.find((person) => person.id === item.assignedTo)?.name || null
      }));
      const saved = await api.createSplit({
        title,
        total_amount: total,
        mode,
        people: splitPeople,
        items: itemPayload
      });
      sessionStorage.clear();
      localStorage.setItem('last_split_id', saved.id);
      navigate(`/summary/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save split.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <StepCard title="Smart split suggestion" subtitle="Choose a simple equal split or a fairer item-aware split before saving the bill.">
        <ProgressSteps step={3} />
        <div className="toggle-group" role="group" aria-label="Split mode">
          <button className={mode === 'equal' ? 'selected' : ''} onClick={() => setMode('equal')}>Equal split</button>
          <button className={mode === 'smart' ? 'selected' : ''} onClick={() => setMode('smart')}>Smart split ✓</button>
        </div>
        <div className="summary-grid">
          <article><span>Total bill</span><strong>${total.toFixed(2)}</strong></article>
          <article><span>People</span><strong>{people.length}</strong></article>
          <article><span>Mode</span><strong>{mode === 'smart' ? 'Item-aware' : 'Equal'}</strong></article>
        </div>
        <div className="breakdown-list">
          {splitPeople.map((person) => (
            <div key={person.name} className="breakdown-row">
              <span><strong>{person.name}</strong><small>{mode === 'smart' ? 'shared + assigned items' : 'equal share'}</small></span>
              <strong>${person.amount.toFixed(2)}</strong>
            </div>
          ))}
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="button-row right">
          <ThreeDButton variant="secondary" onClick={() => navigate('/items')}>Back</ThreeDButton>
          <ThreeDButton onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save to database'}</ThreeDButton>
        </div>
      </StepCard>
    </AppShell>
  );
}
