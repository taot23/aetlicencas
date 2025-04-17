import React from 'react';
import { Button } from "@/components/ui/button";
import { X, Plus, Pencil } from "lucide-react";
import { Vehicle } from "@shared/schema";

interface PlacaAdicionalItemProps {
  plate: string;
  index: number;
  vehicles: Vehicle[] | undefined;
  onRemove: (index: number) => void;
  onEdit?: (plate: string) => void;
}

export function PlacaAdicionalItem({ plate, index, vehicles, onRemove, onEdit }: PlacaAdicionalItemProps) {
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

  // Função para abrir o formulário de veículos em modal (sem redirecionar)
  // Esta função será implementada pelo componente pai
  const handleEditVehicle = () => {
    // Chama a função onEdit passada pelo componente pai, enviando a placa
    if (onEdit) {
      onEdit(plate);
    }
  };

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
        </div>
        <span className={`text-xs ${isRegistered ? 'text-green-600' : 'text-red-600'}`}>
          {isRegistered ? 'Veículo cadastrado' : 'Veículo não cadastrado'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* Botão para editar (se cadastrado) ou adicionar (se não cadastrado) */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleEditVehicle}
          className="h-8 w-8 p-0"
          title={isRegistered ? "Editar veículo" : "Cadastrar veículo"}
        >
          {isRegistered ? (
            <Pencil className="h-4 w-4 text-green-600" />
          ) : (
            <Plus className="h-4 w-4 text-red-600" />
          )}
        </Button>
        
        {/* Botão para remover */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-8 w-8 p-0"
          title="Remover placa"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}