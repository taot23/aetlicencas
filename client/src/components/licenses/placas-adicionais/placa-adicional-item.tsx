import React from 'react';
import { Button } from "@/components/ui/button";
import { X, Plus, Pencil } from "lucide-react";
import { Vehicle } from "@shared/schema";

interface PlacaAdicionalItemProps {
  plate: string;
  index: number;
  vehicles: Vehicle[] | undefined;
  onRemove: (index: number) => void;
}

export function PlacaAdicionalItem({ plate, index, vehicles, onRemove }: PlacaAdicionalItemProps) {
  // Verificar se a placa está registrada entre os veículos
  const isRegistered = React.useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return false;
    }

    const normalizedPlate = plate.toUpperCase().trim();
    return vehicles.some(vehicle => 
      vehicle.plate.toUpperCase().trim() === normalizedPlate
    );
  }, [plate, vehicles]);

  return (
    <div 
      className={`flex justify-between items-center p-3 rounded-md ${
        isRegistered
          ? 'bg-green-100 border border-green-300'
          : 'bg-red-100 border border-red-300'
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="font-medium">{plate}</span>
          {isRegistered ? (
            <Pencil className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </div>
        <span className={`text-xs ${isRegistered ? 'text-green-600' : 'text-red-600'}`}>
          {isRegistered ? 'Veículo cadastrado' : 'Veículo não cadastrado'}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}