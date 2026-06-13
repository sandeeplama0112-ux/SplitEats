const labels = ['People', 'Items', 'Split', 'Save'];

export function ProgressSteps({ step }: { step: number }) {
  return (
    <ol className="progress" aria-label="Split workflow progress">
      {labels.map((label, index) => (
        <li key={label} className={index + 1 <= step ? 'active' : ''}>
          <span>{index + 1}</span>{label}
        </li>
      ))}
    </ol>
  );
}
