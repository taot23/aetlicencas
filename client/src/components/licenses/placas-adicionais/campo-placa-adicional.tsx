import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Vehicle } from "@shared/schema";
import { PlacaAdicionalItem } from './placa-adicional-item';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface CampoPlacaAdicionalProps {
  form: UseFormReturn<any>;
  vehicles: Vehicle[] | undefined;
  isLoadingVehicles: boolean;
}

// Validador para formato de placa
const isValidPlateFormat = (plate: string): boolean => {
  // Aceita formato Mercosul (AAA1A11) ou formato antigo (AAA1111)
  return /^[A-Z]{3}\d[A-Z0-9]\d\d$/.test(plate);
};

export function CampoPlacaAdicional({ form, vehicles, isLoadingVehicles }: CampoPlacaAdicionalProps) {
  const [plateInput, setPlateInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAddPlate = () => {
    // Normalizar e validar a placa
    const normalizedPlate = plateInput.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    
    if (!normalizedPlate) {
      setInputError("Digite uma placa");
      return;
    }
    
    if (!isValidPlateFormat(normalizedPlate)) {
      setInputError("Formato de placa inválido. Use AAA1A11 ou AAA1111.");
      return;
    }
    
    // Verificar se a placa já foi adicionada
    const currentPlates = form.getValues('additionalPlates') || [];
    if (currentPlates.includes(normalizedPlate)) {
      setInputError("Esta placa já foi adicionada");
      return;
    }
    
    // Adicionar placa ao formulário
    const newPlates = [...currentPlates, normalizedPlate];
    form.setValue('additionalPlates', newPlates, {
      shouldValidate: true,
      shouldDirty: true
    });
    
    // Adicionar documento vazio para a placa
    const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
    newDocs.push('');
    form.setValue('additionalPlatesDocuments', newDocs);
    
    // Limpar input e erro
    setPlateInput("");
    setInputError(null);
  };

  const handleRemovePlate = (index: number) => {
    // Remover a placa
    const plates = form.getValues('additionalPlates') || [];
    const newPlates = [...plates];
    newPlates.splice(index, 1);
    form.setValue('additionalPlates', newPlates, {
      shouldValidate: true,
      shouldDirty: true
    });
    
    // Remover documento associado
    const docs = form.getValues('additionalPlatesDocuments') || [];
    const newDocs = [...docs];
    newDocs.splice(index, 1);
    form.setValue('additionalPlatesDocuments', newDocs);
  };

  return (
    <FormField
      control={form.control}
      name="additionalPlates"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Placas Adicionais</FormLabel>
          <div className="space-y-4">
            {/* Lista de placas adicionadas */}
            {field.value && field.value.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {field.value.map((plate: string, index: number) => (
                  <PlacaAdicionalItem
                    key={`${plate}-${index}`}
                    plate={plate}
                    index={index}
                    vehicles={vehicles}
                    onRemove={handleRemovePlate}
                  />
                ))}
              </div>
            )}
            
            {/* Campo para adicionar nova placa */}
            <div className="flex items-center space-x-2">
              <Input
                value={plateInput}
                onChange={(e) => {
                  setPlateInput(e.target.value.toUpperCase());
                  setInputError(null);
                }}
                placeholder="Digite a placa e pressione Enter"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPlate();
                  }
                }}
                maxLength={7}
              />
            </div>
            
            {/* Mensagem de erro */}
            {inputError && (
              <p className="text-sm text-red-500 mt-1">{inputError}</p>
            )}
            
            <p className="text-xs text-gray-500">
              Digite a placa e pressione Enter para adicionar.
              Formatos válidos: Mercosul (AAA1A11) ou antigo (AAA1111)
            </p>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}