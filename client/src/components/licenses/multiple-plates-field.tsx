import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { LicensePlatesInput } from '@/components/ui/license-plates-input';

interface MultiplePlatesFieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export function MultiplePlatesField({
  name,
  label,
  description,
  required = false,
}: MultiplePlatesFieldProps) {
  const { control, setValue, getValues } = useFormContext();
  const [vehiclePlates, setVehiclePlates] = useState<string[]>([]);
  
  // Buscar todos os veículos para sugestões de placas
  const { data: vehicles = [] } = useQuery({
    queryKey: ['/api/vehicles/all'],
  });
  
  // Extrair placas únicas para sugestões
  const plateSuggestions = vehicles
    ? Array.from(new Set(vehicles.map((vehicle: any) => vehicle.plate)))
    : [];
  
  // Inicializar o valor do campo se já houver placas salvas
  useEffect(() => {
    const currentValue = getValues(name);
    if (currentValue && Array.isArray(currentValue) && currentValue.length > 0) {
      setVehiclePlates(currentValue);
    }
  }, [getValues, name]);
  
  // Atualizar o valor do formulário quando as placas mudarem
  useEffect(() => {
    setValue(name, vehiclePlates, { shouldValidate: true, shouldDirty: true });
  }, [vehiclePlates, setValue, name]);

  return (
    <FormItem>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <FormControl>
        <LicensePlatesInput
          value={vehiclePlates}
          onChange={setVehiclePlates}
          suggestions={plateSuggestions}
          placeholder="Digite ou cole placas (ex: AAA1234, AAA1B34)"
        />
      </FormControl>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <FormMessage />
    </FormItem>
  );
}