import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ProgressSteps } from '../components/ProgressSteps';
import { StepCard } from '../components/StepCard';
import { ThreeDButton } from '../components/ThreeDButton';
import type { BillItem, Person } from '../types/models';

const createItem = (name = '', price = 0, assignedTo = ''): BillItem => ({ id: crypto.randomUUID(), name, price, assignedTo });

export function ItemsPage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<BillItem[]>([
    createItem('Pizza', 32, 'shared'),
    createItem('Pasta', 18, ''),
    createItem('Dessert', 12, 'shared')
  ]);

  useEffect(() => {
    const savedPeople = JSON.parse(sessionStorage.getItem('draft_people') || '[]') as Person[];
    if (savedPeople.length < 2) {
      navigate('/people');
    } else {
      setPeople(savedPeople);
      setItems((current) => current.map((item, index) => index === 1 ? { ...item, assignedTo: savedPeople[0]?.id || 'shared' } : item));
    }
  }, [navigate]);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [items]);
  const validItems = useMemo(() => items.filter((item) => item.name.trim().length > 0 && Number(item.price) > 0), [items]);
  const isValid = validItems.length > 0 && total > 0;

  const updateItem = (id: string, patch: Partial<BillItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const next = () => {
    if (!isValid) return;
    sessionStorage.setItem('draft_items', JSON.stringify(validItems));
    sessionStorage.setItem('draft_total', String(total));
    navigate('/split');
  };

  return (
    <AppShell>
      <StepCard title="Assign items" subtitle="Add each bill item. Mark items as shared or assign them to the person who ordered them.">
        <ProgressSteps step={2} />
        <div className="items-table" role="table" aria-label="Bill items">
          <div className="items-header" role="row">
            <span>Item</span><span>Price</span><span>Who had it?</span><span></span>
          </div>
          {items.map((item) => (
            <div className="items-row" role="row" key={item.id}>
              <input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} placeholder="Item name" />
              <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} placeholder="0.00" />
              <select value={item.assignedTo || 'shared'} onChange={(e) => updateItem(item.id, { assignedTo: e.target.value })}>
                <option value="shared">Shared item</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              <button className="icon-action" onClick={() => removeItem(item.id)} aria-label="Remove item">×</button>
            </div>
          ))}
        </div>
        <button className="link-button" onClick={() => setItems((current) => [...current, createItem('', 0, 'shared')])}>+ Add another item</button>
        <div className="total-bar"><span>Total bill</span><strong>${total.toFixed(2)}</strong></div>
        {!isValid && <div className="alert warning">Add at least one item name and a valid price.</div>}
        <div className="button-row right">
          <ThreeDButton variant="secondary" onClick={() => navigate('/people')}>Back</ThreeDButton>
          <ThreeDButton onClick={next} disabled={!isValid}>Next: smart split</ThreeDButton>
        </div>
      </StepCard>
    </AppShell>
  );
}
