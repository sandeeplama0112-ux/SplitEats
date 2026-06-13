import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ProgressSteps } from '../components/ProgressSteps';
import { StepCard } from '../components/StepCard';
import { ThreeDButton } from '../components/ThreeDButton';
import type { Person } from '../types/models';

const createPerson = (name = ''): Person => ({ id: crypto.randomUUID(), name });

export function PeoplePage() {
  const [title, setTitle] = useState('Friday dinner');
  const [people, setPeople] = useState<Person[]>([createPerson('John'), createPerson('Sarah'), createPerson('Mike')]);
  const navigate = useNavigate();
  const validPeople = useMemo(() => people.filter((p) => p.name.trim().length > 0), [people]);
  const isValid = title.trim().length > 0 && validPeople.length >= 2;

  const updatePerson = (id: string, name: string) => {
    setPeople((current) => current.map((person) => person.id === id ? { ...person, name } : person));
  };

  const removePerson = (id: string) => {
    setPeople((current) => current.filter((person) => person.id !== id));
  };

  const next = () => {
    if (!isValid) return;
    sessionStorage.setItem('draft_title', title.trim());
    sessionStorage.setItem('draft_people', JSON.stringify(validPeople));
    navigate('/items');
  };

  return (
    <AppShell>
      <StepCard title="Add people" subtitle="Enter the people who are sharing the bill. At least two names are needed for a fair split.">
        <ProgressSteps step={1} />
        <div className="form-stack">
          <label>
            Split title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday dinner" />
          </label>
          <div className="dynamic-list">
            {people.map((person, index) => (
              <div className="inline-row" key={person.id}>
                <label>
                  Person {index + 1}
                  <input value={person.name} onChange={(e) => updatePerson(person.id, e.target.value)} placeholder="Friend name" />
                </label>
                <button className="icon-action" onClick={() => removePerson(person.id)} aria-label={`Remove person ${index + 1}`}>×</button>
              </div>
            ))}
          </div>
          <button className="link-button" onClick={() => setPeople((current) => [...current, createPerson()])}>+ Add another person</button>
          {!isValid && <div className="alert warning">Add a title and at least two people to continue.</div>}
          <div className="button-row right">
            <ThreeDButton variant="secondary" onClick={() => navigate('/dashboard')}>Back</ThreeDButton>
            <ThreeDButton onClick={next} disabled={!isValid}>Next: assign items</ThreeDButton>
          </div>
        </div>
      </StepCard>
    </AppShell>
  );
}
