import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { LicensePlateButtons } from '@/components/ui/license-plate-buttons';

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

// Função para validar o formato da placa
const isValidLicensePlate = (plate: string): boolean => {
  // Validar formato Mercosul (AAA1A11) ou formato antigo (AAA1111)
  return /^[A-Z]{3}\d[A-Z0-9]\d\d$/.test(plate);
};

// Função para formatar a placa (tudo em maiúsculo)
const formatLicensePlate = (plate: string): string => {
  return plate.toUpperCase().trim();
};

export function MultiplePlatesField({
  name,
  label,
  description,
  required = false,
}: MultiplePlatesFieldProps) {
  const { control, setValue, getValues } = useFormContext();
  const [vehiclePlates, setVehiclePlates] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  
  // Buscar sugestões de placas usando a nova rota pública
  const { data: plateSuggestions = [], isLoading, isError } = useQuery<string[]>({
    queryKey: ['/api/public/vehicle-plates'],
    refetchOnMount: true,
    staleTime: 30000, // Considerar dados frescos por 30 segundos
    refetchOnWindowFocus: true
  });
  
  // Logar as sugestões de placas para debug
  useEffect(() => {
    console.log("Sugestões de placas recebidas:", plateSuggestions);
    console.log("Número total de sugestões:", plateSuggestions.length);
    
    if (isError) {
      console.error("Erro ao carregar sugestões de placas");
    } else if (isLoading) {
      console.log("Carregando sugestões de placas...");
    } else if (plateSuggestions.length === 0) {
      console.warn("Nenhuma sugestão de placa disponível");
    }
  }, [plateSuggestions, isError, isLoading]);
  
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

  // Manipular adição de nova placa
  const handleAddPlate = () => {
    if (!inputValue) return;
    
    const formatted = formatLicensePlate(inputValue);
    
    if (!isValidLicensePlate(formatted)) {
      setError('Formato de placa inválido. Use AAA1A11 ou AAA1111.');
      return;
    }
    
    if (vehiclePlates.includes(formatted)) {
      setError('Esta placa já foi adicionada.');
      return;
    }
    
    setVehiclePlates([...vehiclePlates, formatted]);
    setInputValue('');
    setError('');
  };

  // Alternar a seleção da placa (adicionar ou remover)
  const togglePlateSelection = (plate: string) => {
    if (vehiclePlates.includes(plate)) {
      setVehiclePlates(vehiclePlates.filter(p => p !== plate));
    } else {
      setVehiclePlates([...vehiclePlates, plate]);
    }
  };

  // Lidar com a pressão da tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPlate();
    }
  };

  return (
    <FormItem>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      
      {/* Campo de entrada com botão de adicionar */}
      <div className="flex gap-2 mb-2">
        <FormControl>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma placa (ex: AAA1234, AAA1B34)"
            maxLength={7}
            autoComplete="off"
          />
        </FormControl>
        <Button 
          type="button" 
          size="sm" 
          onClick={handleAddPlate}
          className="whitespace-nowrap"
        >
          Adicionar
        </Button>
      </div>
      
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      
      {/* Exibir placas disponíveis como botões */}
      {plateSuggestions.length > 0 && (
        <div className="mt-4 border p-3 rounded-md bg-gray-50">
          <p className="text-sm font-medium mb-2">Placas disponíveis ({plateSuggestions.length}):</p>
          <div className="flex flex-wrap gap-1.5">
            {plateSuggestions.map((plate) => (
              <Button
                key={plate}
                type="button"
                size="sm"
                variant="outline"
                className={`px-2 py-0.5 h-7 text-xs font-medium ${
                  vehiclePlates.includes(plate)
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-white border-cyan-500'
                    : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200'
                }`}
                onClick={() => togglePlateSelection(plate)}
              >
                {plate}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Exibir placas selecionadas */}
      {vehiclePlates.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Placas selecionadas:</p>
          <div className="flex flex-wrap gap-1.5">
            {vehiclePlates.map((plate) => (
              <Button
                key={plate}
                type="button"
                size="sm"
                variant="outline"
                className="px-2 py-0.5 h-7 text-xs font-medium bg-cyan-500 hover:bg-cyan-400 text-white border-cyan-500"
                onClick={() => {}}
              >
                {plate}
                <X
                  className="w-3 h-3 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlateSelection(plate);
                  }}
                />
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {description ? (
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">
          Clique nas placas acima para selecionar veículos ou adicione manualmente
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}