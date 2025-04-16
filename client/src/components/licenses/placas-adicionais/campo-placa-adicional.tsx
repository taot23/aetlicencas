import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Vehicle } from "@shared/schema";
import { PlacaAdicionalItem } from './placa-adicional-item';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Função para filtrar veículos baseado no tipo de licença
  const filterVehiclesByLicenseType = () => {
    if (!vehicles || !Array.isArray(vehicles)) return [];
    
    // Não exibir unidades tratoras (cavalo) nas sugestões
    return vehicles.filter(vehicle => 
      vehicle.type !== "tractor_unit" && 
      // Verificar se a placa não foi selecionada nos dropdowns
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
  
  // Atualizar sugestões quando o input mudar
  useEffect(() => {
    if (plateInput.length >= 2) {
      const availableVehicles = filterVehiclesByLicenseType();
      const filtered = availableVehicles.filter(v => 
        v.plate.toUpperCase().includes(plateInput.toUpperCase())
      );
      
      setSuggestedVehicles(filtered);
      
      // Apenas alteramos o estado de aberto se houver sugestões
      if (filtered.length > 0) {
        setOpenSuggestions(true);
      } else {
        setOpenSuggestions(false);
      }
    } else {
      setSuggestedVehicles([]);
      setOpenSuggestions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateInput, vehicles]);
  
  // Função para buscar veículos que correspondem ao input atual
  const findMatchingVehicles = (input: string): Vehicle[] => {
    if (!input || !vehicles) return [];
    
    const availableVehicles = filterVehiclesByLicenseType();
    return availableVehicles.filter(v => 
      v.plate.toUpperCase().includes(input.toUpperCase())
    );
  };
  
  // Verificar se um veículo já está adicionado nas placas adicionais
  const isVehicleAlreadyInAdditionalPlates = (plate: string): boolean => {
    const additionalPlates = form.getValues('additionalPlates') || [];
    return additionalPlates.includes(plate);
  };

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
            
            {/* Campo para adicionar nova placa com autopreenchimento */}
            <div className="flex-1 relative">
              <Popover open={openSuggestions} onOpenChange={setOpenSuggestions}>
                <PopoverTrigger asChild>
                  <div className="w-full">
                    <Input
                      ref={inputRef}
                      value={plateInput}
                      onChange={(e) => {
                        setPlateInput(e.target.value.toUpperCase());
                        setInputError(null);
                      }}
                      placeholder="Digite a placa ou comece a digitar para ver sugestões"
                      className="flex-1 w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          
                          // Buscar veículos que correspondem ao input atual
                          // mesmo com menos de 2 caracteres
                          if (plateInput.length > 0) {
                            const matches = findMatchingVehicles(plateInput);
                            
                            if (matches.length > 0) {
                              // Se houver veículos correspondentes, usar o primeiro
                              const firstMatch = matches[0];
                              
                              if (!isVehicleAlreadyInAdditionalPlates(firstMatch.plate)) {
                                // Adicionar a placa ao formulário
                                const currentPlates = form.getValues('additionalPlates') || [];
                                const newPlates = [...currentPlates, firstMatch.plate];
                                form.setValue('additionalPlates', newPlates, {
                                  shouldValidate: true,
                                  shouldDirty: true
                                });
                                
                                // Adicionar documento vazio para a placa
                                const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
                                newDocs.push('');
                                form.setValue('additionalPlatesDocuments', newDocs);
                                
                                // Mostrar informação sobre o veículo adicionado
                                console.log(`Adicionada placa ${firstMatch.plate} (${firstMatch.brand} ${firstMatch.model})`);
                                
                                // Limpar input, fechar sugestões e limpar erro
                                setPlateInput("");
                                setOpenSuggestions(false);
                                setInputError(null);
                              } else {
                                setInputError("Esta placa já foi adicionada");
                              }
                            } else {
                              // Se não houver correspondências, tentar adicionar o texto atual
                              handleAddPlate();
                            }
                          } else {
                            setInputError("Digite uma placa");
                          }
                        }
                      }}
                      maxLength={7}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[calc(100vw-40px)] md:w-full z-50" align="start" sideOffset={5}>
                  <Command className="rounded-lg">
                    <CommandList className="max-h-[200px]">
                      {suggestedVehicles.length > 0 ? (
                        <CommandGroup heading="Veículos cadastrados">
                          {suggestedVehicles.map((vehicle) => (
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
                              className="flex items-center justify-between py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-base">{vehicle.plate}</span>
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
                                className={`h-5 w-5 text-primary ${plateInput === vehicle.plate ? "opacity-100" : "opacity-0"}`} 
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : plateInput.length >= 2 ? (
                        <CommandEmpty className="py-6 text-center">
                          <p className="text-sm text-muted-foreground">Nenhum veículo encontrado</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Prossiga digitando o resto da placa e pressione Enter
                          </p>
                        </CommandEmpty>
                      ) : (
                        <CommandEmpty className="py-6 text-center">
                          <p className="text-sm text-muted-foreground">Digite mais letras para buscar veículos</p>
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
                Digite a placa e pressione Enter para adicionar.
                Formatos válidos: Mercosul (AAA1A11) ou antigo (AAA1111)
              </p>
              <p>
                <span className="font-medium text-blue-600">Dica:</span> Comece a digitar para ver sugestões de placas cadastradas. 
                Pressione Enter para selecionar a primeira sugestão automaticamente.
              </p>
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}