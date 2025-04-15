import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface LicensePlateButtonsProps {
  plates: string[];
  onSelectPlate: (plate: string) => void;
  selectedPlates: string[];
  className?: string;
}

export function LicensePlateButtons({
  plates,
  onSelectPlate,
  selectedPlates,
  className,
}: LicensePlateButtonsProps) {
  // Verificar se uma placa já está selecionada
  const isSelected = (plate: string) => selectedPlates.includes(plate);

  return (
    <div className={`flex flex-wrap gap-1.5 mt-2 ${className || ''}`}>
      {plates.map((plate) => (
        <Button
          key={plate}
          type="button"
          size="sm"
          variant="outline"
          className={`px-2 py-0.5 h-7 text-xs font-medium ${
            isSelected(plate)
              ? 'bg-cyan-500 hover:bg-cyan-400 text-white border-cyan-500'
              : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200'
          }`}
          onClick={() => onSelectPlate(plate)}
        >
          {plate}
          {isSelected(plate) && (
            <X
              className="w-3 h-3 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlate(plate); // Remove a placa quando clica no X
              }}
            />
          )}
        </Button>
      ))}
    </div>
  );
}