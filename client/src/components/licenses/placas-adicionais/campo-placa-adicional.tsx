import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Vehicle } from "@shared/schema";
import { PlacaAdicionalItem } from './placa-adicional-item';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { Check, Plus, Pencil } from 'lucide-react';
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
  const [suggestedVehicles, setSuggestedVehicles] = useState<Vehicle[]>([]);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Verificar se um veículo já está adicionado nas placas adicionais
  const isVehicleAlreadyInAdditionalPlates = (plate: string): boolean => {
    const additionalPlates = form.getValues('additionalPlates') || [];
    return additionalPlates.includes(plate);
  };
  
  // Verificar se um veículo está cadastrado
  const isPlateRegistered = (plate: string): boolean => {
    if (!vehicles) return false;
    return vehicles.some(v => v.plate === plate);
  };
  
  // Obter veículo pelo número da placa
  const getVehicleByPlate = (plate: string): Vehicle | undefined => {
    if (!vehicles) return undefined;
    return vehicles.find(v => v.plate === plate);
  };

  // Atualizar sugestões com base no input - sem interromper digitação
  useEffect(() => {
    if (!vehicles) return;
    
    // Normalizar o input para busca
    const normalized = plateInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (normalized.length > 0) {
      // Filtrar veículos que correspondem ao padrão de busca
      const filtered = vehicles.filter(v => 
        v.plate.toUpperCase().includes(normalized)
      );
      
      setSuggestedVehicles(filtered);
      
      // Mostrar sugestões apenas se houver correspondências
      // Não abrir automaticamente para não interromper digitação
      if (filtered.length > 0) {
        setHighlightedIndex(0);
        // Não forçar abertura do popover aqui para permitir digitação contínua
      } else {
        setOpenSuggestions(false);
      }
    } else {
      // Se o input estiver vazio, mostrar alguns veículos recentes
      setSuggestedVehicles(vehicles.slice(0, 5));
      // Não mostrar sugestões com input vazio
      setOpenSuggestions(false);
    }
  }, [plateInput, vehicles]);
  
  // Processar entrada de múltiplas placas
  const processMultiplePlates = (input: string): string[] => {
    // Dividir por vírgulas, espaços ou quebras de linha
    const parts = input.split(/[,\s\n]+/).filter(Boolean);
    
    // Normalizar e filtrar placas válidas
    const validPlates = parts
      .map(part => part.toUpperCase().trim().replace(/[^A-Z0-9]/g, ''))
      .filter(plate => isValidPlateFormat(plate));
    
    // Remover duplicatas (compatível com ES5)
    const uniquePlates: string[] = [];
    validPlates.forEach(plate => {
      if (uniquePlates.indexOf(plate) === -1) {
        uniquePlates.push(plate);
      }
    });
    return uniquePlates;
  };
  
  // Adicionar uma única placa
  const addSinglePlate = (plate: string) => {
    // Verificar se a placa já foi adicionada
    if (isVehicleAlreadyInAdditionalPlates(plate)) {
      setInputError("Esta placa já foi adicionada");
      return false;
    }
    
    // Adicionar placa ao formulário
    const currentPlates = form.getValues('additionalPlates') || [];
    const newPlates = [...currentPlates, plate];
    form.setValue('additionalPlates', newPlates, {
      shouldValidate: true,
      shouldDirty: true
    });
    
    // Adicionar documento vazio para a placa
    const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
    newDocs.push('');
    form.setValue('additionalPlatesDocuments', newDocs);
    
    return true;
  };
  
  // Manipular adição de placas
  const handleAddPlate = () => {
    // Se o input estiver vazio
    if (!plateInput.trim()) {
      setInputError("Digite uma placa");
      return;
    }
    
    // Processar múltiplas placas
    const platesToAdd = processMultiplePlates(plateInput);
    
    if (platesToAdd.length === 0) {
      setInputError("Nenhuma placa válida encontrada. Use o formato AAA1A11 ou AAA1111.");
      return;
    }
    
    // Adicionar cada placa válida
    let allAdded = true;
    let duplicateFound = false;
    
    for (const plate of platesToAdd) {
      const success = addSinglePlate(plate);
      if (!success) {
        duplicateFound = true;
        allAdded = false;
      }
    }
    
    // Feedback ao usuário
    if (duplicateFound) {
      setInputError("Algumas placas já estavam adicionadas");
    } else {
      setInputError(null);
    }
    
    // Limpar o campo de entrada
    setPlateInput("");
    setOpenSuggestions(false);
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
                    onEdit={(plateToEdit) => {
                      // Abrir modal para edição/cadastro de veículo
                      // Implementar lógica de modal inline
                      console.log("Editar veículo:", plateToEdit);
                      // Aqui deve chamar uma função passada pelo componente pai
                      // para abrir o modal de formulário de veículo
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Campo para adicionar placa com autocompletar */}
            <div className="relative">
              <Popover 
                open={openSuggestions} 
                onOpenChange={(open) => open ? setOpenSuggestions(true) : setOpenSuggestions(false)}
              >
                <PopoverTrigger asChild>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={plateInput}
                        maxLength={7}
                        onChange={(e) => {
                          // Converter para maiúsculas e continuar digitação
                          setPlateInput(e.target.value.toUpperCase());
                          setInputError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPlate();
                          }
                          else if (e.key === 'ArrowDown' && suggestedVehicles.length > 0) {
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
                          else if (e.key === 'Escape') {
                            setOpenSuggestions(false);
                          }
                        }}
                        placeholder="Digite placas (separadas por vírgula, espaço ou enter)"
                        className="w-full"
                        autoComplete="off"
                      />
                      {inputError && (
                        <p className="text-sm text-red-500 mt-1">{inputError}</p>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleAddPlate}
                      className="mt-0"
                    >
                      Adicionar
                    </Button>
                  </div>
                </PopoverTrigger>
                
                <PopoverContent 
                  className="p-0 w-[calc(100vw-40px)] md:w-full" 
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
                                addSinglePlate(vehicle.plate);
                                setPlateInput("");
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
                                  index === highlightedIndex ? "opacity-100" : "opacity-0"
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
                              Você pode adicionar placas múltiplas separadas por vírgula, espaço ou enter
                            </p>
                          )}
                        </CommandEmpty>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Dicas e legenda */}
            <div className="space-y-3 text-xs text-gray-500 border-t pt-3 mt-3">
              <div>
                <p className="font-medium mb-1">Como adicionar placas:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Digite placas separadas por vírgula, espaço ou enter</li>
                  <li>Selecione sugestões com as setas ↑↓ e Enter</li>
                  <li>Clique em uma sugestão para adicionar</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium mb-1">Legenda:</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                      <span>ABC1D23</span>
                      <Pencil className="h-3 w-3" />
                    </div>
                    <span>Placa cadastrada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-red-100 text-red-800 px-2 py-1 rounded flex items-center gap-1">
                      <span>XYZ9W87</span>
                      <Plus className="h-3 w-3" />
                    </div>
                    <span>Placa não cadastrada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}