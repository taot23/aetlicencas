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
  
  // Buscar veículos para validação - usando API pública para garantir acesso
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/vehicles', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error('Erro ao buscar veículos:', response.status);
          return [];
        }
        
        return await response.json();
      } catch (error) {
        console.error('Erro ao buscar veículos:', error);
        return [];
      }
    },
    refetchOnMount: true,
    staleTime: 30000
  });
  
  // Função para verificar se a placa pertence a um veículo cadastrado
  const isRegisteredVehicle = (plate: string): boolean => {
    if (!plate || !vehicles || vehicles.length === 0) {
      console.log(`Nenhum veículo cadastrado para verificar placa ${plate}`);
      return false;
    }
    
    // Verifica diretamente nos veículos carregados por correspondência exata
    const result = vehicles.some(vehicle => vehicle.plate === plate);
    
    // Se não encontrar por correspondência exata, tenta uma correspondência parcial
    // (útil para quando o usuário digita uma placa similar a uma existente)
    if (!result && plate.length >= 5) {
      const partialMatch = vehicles.some(vehicle => 
        vehicle.plate.includes(plate.substring(0, 5)) || 
        plate.includes(vehicle.plate.substring(0, 5))
      );
      
      if (partialMatch) {
        console.log(`Placa ${plate} possui correspondência parcial com veículo cadastrado`);
      }
    }
    
    console.log(`Verificando placa ${plate}: ${result ? 'Registrada' : 'Não registrada'}`);
    return result;
  };
  
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
  
  // Logar os veículos carregados
  useEffect(() => {
    console.log("Veículos carregados:", vehicles);
    console.log("Total de veículos:", vehicles.length);
    if (vehicles.length > 0) {
      console.log("Placas dos veículos:", vehicles.map(v => v.plate));
    }
  }, [vehicles]);
  
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
    
    // Se a placa não está nas sugestões, verificamos se é de um veículo cadastrado
    if (!plateSuggestions.includes(formatted) && !isRegisteredVehicle(formatted)) {
      // Adicionamos mesmo assim, mas alertamos o usuário
      console.warn(`Placa ${formatted} não encontrada entre os veículos cadastrados.`);
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
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <FormControl className="w-full">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma placa (ex: AAA1234)"
            maxLength={7}
            autoComplete="off"
            className="mobile-input h-10"
            // Ajuste para dispositivos móveis - usar teclado específico
            inputMode="text"
            pattern="[A-Za-z0-9]*"
          />
        </FormControl>
        <Button 
          type="button" 
          size="sm" 
          onClick={handleAddPlate}
          className="whitespace-nowrap sm:w-auto w-full h-10"
        >
          Adicionar
        </Button>
      </div>
      
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      
      {/* Exibir placas disponíveis como botões */}
      {plateSuggestions.length > 0 && (
        <div className="mt-4 border p-3 rounded-md bg-gray-50">
          <p className="text-sm font-medium mb-2">Placas disponíveis ({plateSuggestions.length}):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {plateSuggestions.map((plate) => {
              // Verifica se a placa é de um veículo cadastrado
              const isRegistered = isRegisteredVehicle(plate);
              
              return (
                <Button
                  key={plate}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`px-2 py-0.5 h-7 text-xs font-medium ${
                    vehiclePlates.includes(plate)
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-white border-cyan-500' // Placa selecionada (sempre azul)
                      : isRegistered
                        ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' // Veículo cadastrado (verde)
                        : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' // Veículo não cadastrado (vermelho)
                  }`}
                  onClick={() => togglePlateSelection(plate)}
                >
                  {plate}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Exibir placas selecionadas */}
      {vehiclePlates.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Placas selecionadas:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {vehiclePlates.map((plate) => {
              // Verifica se a placa é de um veículo cadastrado
              const isRegistered = isRegisteredVehicle(plate);
              
              return (
                <Button
                  key={plate}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`px-2 py-0.5 h-7 text-xs font-medium ${
                    isRegistered
                      ? 'bg-green-600 hover:bg-green-500 text-white border-green-600' // Veículo cadastrado (verde)
                      : 'bg-red-600 hover:bg-red-500 text-white border-red-600' // Veículo não cadastrado (vermelho)
                  } flex justify-between`}
                  onClick={() => {}}
                >
                  <span className="truncate mr-1">{plate}</span>
                  <X
                    className="w-3 h-3 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlateSelection(plate);
                    }}
                  />
                </Button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Legenda explicativa das cores */}
      <div className="mt-4 flex flex-col gap-1">
        <p className="text-xs font-medium">Legenda:</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-600"></div>
            <span>Veículo cadastrado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-600"></div>
            <span>Veículo não cadastrado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-cyan-500"></div>
            <span>Placa selecionada</span>
          </div>
        </div>
      </div>
      
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