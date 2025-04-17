import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Vehicle } from "@shared/schema";
import { PlacaAdicionalItem } from './placa-adicional-item';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { Check } from 'lucide-react';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CampoPlacaAdicionalProps {
  form: UseFormReturn<any>;
  vehicles: Vehicle[] | undefined;
  isLoadingVehicles: boolean;
  licenseType?: string;
}

// Validador para formato de placa
const isValidPlateFormat = (plate: string): boolean => {
  // Aceita formato Mercosul (AAA1A11) ou formato antigo (AAA1111)
  return /^[A-Z]{3}\d[A-Z0-9]\d\d$/.test(plate);
};

export function CampoPlacaAdicional({ form, vehicles, isLoadingVehicles, licenseType }: CampoPlacaAdicionalProps) {
  const [plateInput, setPlateInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [suggestedVehicles, setSuggestedVehicles] = useState<Vehicle[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Função para filtrar veículos baseado no tipo de licença
  const filterVehiclesByLicenseType = () => {
    if (!vehicles || !Array.isArray(vehicles)) return [];
    
    // Não exibir unidades tratoras (cavalo) nas sugestões
    return vehicles.filter(vehicle => 
      vehicle.type !== "tractor_unit" && 
      !isVehicleSelectedInOtherFields(vehicle)
    );
  };
  
  // Função para verificar se o veículo já está selecionado em outros campos
  const isVehicleSelectedInOtherFields = (vehicle: Vehicle): boolean => {
    const tractorUnitId = form.getValues('tractorUnitId');
    const firstTrailerId = form.getValues('firstTrailerId');
    const dollyId = form.getValues('dollyId');
    const secondTrailerId = form.getValues('secondTrailerId');
    const flatbedId = form.getValues('flatbedId');
    
    return [tractorUnitId, firstTrailerId, dollyId, secondTrailerId, flatbedId].includes(vehicle.id);
  };
  
  // Atualizar sugestões quando o input mudar, mas sem interromper a digitação
  useEffect(() => {
    // Buscar os veículos disponíveis
    const availableVehicles = filterVehiclesByLicenseType();
    
    // Normalizar o input para busca (maiúsculas, sem caracteres especiais)
    const normalized = plateInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Filtragem mais inteligente:
    // 1. Se input vazio, mostra alguns veículos para escolha rápida (limitado a 5)
    // 2. Se tem input, busca por qualquer correspondência dentro da placa
    let filtered = [];
    if (normalized === "") {
      // Mostrar apenas alguns veículos (limitar número para não sobrecarregar)
      filtered = availableVehicles.slice(0, 5);
    } else {
      // Buscar por qualquer parte da placa
      filtered = availableVehicles.filter(v => 
        v.plate.toUpperCase().includes(normalized)
      );
    }
    
    // Atualizar o estado com os veículos filtrados
    setSuggestedVehicles(filtered);
    
    // Controlar o dropdown e a seleção
    if (filtered.length > 0) {
      setHighlightedIndex(0); // Sempre selecionar o primeiro
      setOpenSuggestions(true); // Mostrar dropdown
    } else {
      setHighlightedIndex(-1);
      setOpenSuggestions(false); // Fechar dropdown se não houver sugestões
    }
    
    // Se o input for vazio, fechar sugestões para ter mais espaço
    if (normalized === "") {
      setOpenSuggestions(false);
    }
    
  }, [plateInput, vehicles]);
  
  // Verificar se um veículo já está adicionado nas placas adicionais
  const isVehicleAlreadyInAdditionalPlates = (plate: string): boolean => {
    const additionalPlates = form.getValues('additionalPlates') || [];
    return additionalPlates.includes(plate);
  };

  const handleAddPlate = () => {
    // Se tiver sugestões, seleciona a primeira
    if (suggestedVehicles.length > 0) {
      const selectedVehicle = suggestedVehicles[highlightedIndex];
      
      if (!isVehicleAlreadyInAdditionalPlates(selectedVehicle.plate)) {
        // Adicionar a placa ao formulário
        const currentPlates = form.getValues('additionalPlates') || [];
        const newPlates = [...currentPlates, selectedVehicle.plate];
        form.setValue('additionalPlates', newPlates, {
          shouldValidate: true,
          shouldDirty: true
        });
        
        // Adicionar documento vazio para a placa
        const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
        newDocs.push('');
        form.setValue('additionalPlatesDocuments', newDocs);
        
        // Limpar input, fechar sugestões e limpar erro
        setPlateInput("");
        setOpenSuggestions(false);
        setInputError(null);
      } else {
        setInputError("Esta placa já foi adicionada");
      }
      return;
    }
    
    // Caso contrário, tenta adicionar a placa digitada manualmente
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
    if (isVehicleAlreadyInAdditionalPlates(normalizedPlate)) {
      setInputError("Esta placa já foi adicionada");
      return;
    }
    
    // Adicionar placa ao formulário
    const currentPlates = form.getValues('additionalPlates') || [];
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
            
            {/* Campo para adicionar nova placa com autopreenchimento */}
            <div className="relative">
              <Popover 
                open={openSuggestions} 
                onOpenChange={(open) => {
                  if (!open) setOpenSuggestions(false);
                }}
              >
                <PopoverTrigger asChild>
                  <div className="w-full">
                    <Input
                      ref={inputRef}
                      value={plateInput}
                      autoComplete="off"
                      onChange={(e) => {
                        // Converte para maiúsculas e remove hífens automaticamente
                        setPlateInput(e.target.value.toUpperCase().replace(/-/g, ''));
                        setInputError(null);
                      }}
                      placeholder="Digite a placa ou comece a digitar para ver sugestões"
                      className="w-full"
                      maxLength={7}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' && suggestedVehicles.length > 0) {
                          e.preventDefault();
                          setHighlightedIndex((prevIndex) => 
                            prevIndex < suggestedVehicles.length - 1 ? prevIndex + 1 : 0
                          );
                        } 
                        else if (e.key === 'ArrowUp' && suggestedVehicles.length > 0) {
                          e.preventDefault();
                          setHighlightedIndex((prevIndex) => 
                            prevIndex > 0 ? prevIndex - 1 : suggestedVehicles.length - 1
                          );
                        }
                        else if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPlate();
                        }
                        else if (e.key === 'Escape') {
                          e.preventDefault();
                          setOpenSuggestions(false);
                        }
                      }}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0 w-[calc(100vw-40px)] md:w-full z-50" 
                  align="start" 
                  sideOffset={5}
                >
                  <Command className="rounded-lg">
                    <CommandList className="max-h-[200px]">
                      {suggestedVehicles.length > 0 ? (
                        <CommandGroup heading="Veículos cadastrados">
                          {suggestedVehicles.map((vehicle, index) => (
                            <CommandItem
                              key={vehicle.id}
                              onSelect={() => {
                                if (!isVehicleAlreadyInAdditionalPlates(vehicle.plate)) {
                                  // Adicionar a placa ao formulário diretamente
                                  const currentPlates = form.getValues('additionalPlates') || [];
                                  const newPlates = [...currentPlates, vehicle.plate];
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
                                } else {
                                  setInputError("Esta placa já foi adicionada");
                                }
                                setOpenSuggestions(false);
                              }}
                              className={`flex items-center justify-between py-3 ${
                                index === highlightedIndex ? "bg-muted" : ""
                              }`}
                              onMouseEnter={() => setHighlightedIndex(index)}
                            >
                              <div className="flex flex-col">
                                <span className={`font-medium text-base ${
                                  index === highlightedIndex ? "text-primary" : ""
                                }`}>{vehicle.plate}</span>
                                <span className="text-xs text-muted-foreground mt-1">
                                  {vehicle.brand} {vehicle.model} - {
                                    vehicle.type === "semi_trailer" ? "Semirreboque" :
                                    vehicle.type === "dolly" ? "Dolly" :
                                    vehicle.type === "flatbed" ? "Prancha" : 
                                    vehicle.type
                                  }
                                </span>
                              </div>
                              <Check 
                                className={`h-5 w-5 text-primary ${
                                  index === highlightedIndex 
                                    ? "opacity-100" 
                                    : "opacity-0"
                                }`} 
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : (
                        <CommandEmpty className="py-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            {plateInput.length > 0 
                              ? "Nenhum veículo encontrado" 
                              : "Digite para buscar veículos"}
                          </p>
                          {plateInput.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Prossiga digitando o resto da placa e pressione Enter
                            </p>
                          )}
                        </CommandEmpty>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Mensagem de erro */}
            {inputError && (
              <p className="text-sm text-red-500 mt-1">{inputError}</p>
            )}
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                Digite parte da placa e pressione Enter para adicionar o primeiro veículo sugerido.
                Você também pode digitar a placa completa (formato: AAA1A11 ou AAA1111).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use as setas ↑↓ para navegar entre as sugestões</li>
                <li>Pressione Enter para selecionar o veículo destacado</li>
                <li>Passe o mouse sobre um item para destacá-lo</li>
              </ul>
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}