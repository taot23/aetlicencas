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

interface Vehicle {
  id: number;
  plate: string;
  type: string;
}

export function MultiplePlatesField({
  name,
  label,
  description,
  required = false,
}: MultiplePlatesFieldProps) {
  const { control, setValue, getValues } = useFormContext();
  const [vehiclePlates, setVehiclePlates] = useState<string[]>([]);
  
  // Buscar sugestões de placas usando a nova rota pública
  const { data: plateSuggestions = [], isLoading, isError } = useQuery<string[]>({
    queryKey: ['/api/public/vehicle-plates'],
  });
  
  // Logar as sugestões de placas para debug
  useEffect(() => {
    console.log("Sugestões de placas recebidas:", plateSuggestions);
    if (isError) console.error("Erro ao carregar sugestões de placas");
  }, [plateSuggestions, isError]);
    
  // Logar as sugestões de placas disponíveis
  useEffect(() => {
    console.log("Sugestões de placas disponíveis:", plateSuggestions);
  }, [plateSuggestions]);
  
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
          placeholder="Digite as placas e pressione Enter (ex: AAA1234, AAA1B34)"
        />
      </FormControl>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Adicione placas de veículos que fazem parte da composição mas não foram selecionados acima
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}