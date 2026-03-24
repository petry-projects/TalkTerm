import { type ReactElement, useState, useCallback } from 'react';
import { ActionCard, type ActionCardData } from './ActionCard';

interface ActionPanelProps {
  title: string;
  cards: ActionCardData[];
  onSelect: (label: string) => void;
}

export function ActionPanel({ title, cards, onSelect }: ActionPanelProps): ReactElement {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const handleSelect = useCallback(
    (label: string): void => {
      setSelectedLabel(label);
      onSelect(label);
    },
    [onSelect],
  );

  return (
    <div className="flex h-full w-[240px] flex-col gap-3 overflow-y-auto bg-surface-muted p-4">
      <h2 className="text-subtitle text-text-on-dark">{title}</h2>
      <div className="flex flex-col gap-3" role="listbox">
        {cards.map((card) => (
          <ActionCard
            key={card.label}
            card={card}
            selected={selectedLabel === card.label}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
