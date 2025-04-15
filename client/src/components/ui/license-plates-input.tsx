import React, { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";
import { Badge } from "./badge";
import { z } from "zod";

// Esquemas de validação para placas
const oldFormatPlateSchema = z.string().regex(/^[A-Z]{3}[0-9]{4}$/);
const mercosulFormatPlateSchema = z.string().regex(/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/);
const plateSchema = z.union([oldFormatPlateSchema, mercosulFormatPlateSchema]);

interface LicensePlatesInputProps {
  value: string[];
  onChange: (plates: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  suggestions?: string[];
  className?: string;
}

export function LicensePlatesInput({
  value,
  onChange,
  label,
  placeholder = "Digite as placas (AAA1234 ou AAA1B23)",
  error,
  suggestions = [],
  className,
}: LicensePlatesInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Função para validar e formatar uma placa
  const formatAndValidatePlate = (plate: string): { formattedPlate: string; isValid: boolean } => {
    // Remover espaços e converter para maiúsculas
    let formattedPlate = plate.trim().toUpperCase();
    
    // Verificar se corresponde a algum dos formatos
    try {
      plateSchema.parse(formattedPlate);
      return { formattedPlate, isValid: true };
    } catch (error) {
      return { formattedPlate, isValid: false };
    }
  };

  // Processar múltiplas placas de uma vez (para colar)
  const processMultiplePlates = (text: string) => {
    // Dividir por qualquer combinação de separadores comuns
    const plates = text.split(/[\s,;|\n]+/);
    
    // Filtrar placas válidas
    const processedPlates = plates
      .map(plate => formatAndValidatePlate(plate))
      .filter(({ isValid }) => isValid)
      .map(({ formattedPlate }) => formattedPlate);
    
    // Adicionar placas únicas (que ainda não existem na lista)
    const uniqueNewPlates = processedPlates.filter(plate => !value.includes(plate));
    if (uniqueNewPlates.length > 0) {
      onChange([...value, ...uniqueNewPlates]);
    }
  };

  // Atualizar sugestões filtradas quando o input muda
  useEffect(() => {
    if (inputValue.length > 0) {
      const normalizedInput = inputValue.toUpperCase();
      const filtered = suggestions.filter(
        (plate) => plate.toUpperCase().includes(normalizedInput) && !value.includes(plate)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      
      // Validar o formato atual
      try {
        const testValue = inputValue.toUpperCase();
        
        // Validar formato completo somente se o comprimento for suficiente
        if (testValue.length >= 7) {
          plateSchema.parse(testValue);
          setIsValid(true);
        } else {
          // Para entradas parciais, verificamos se está no caminho certo
          const partialOldFormat = /^[A-Z]{0,3}[0-9]{0,4}$/;
          const partialMercosulFormat = /^[A-Z]{0,3}[0-9]{0,1}[A-Z]{0,1}[0-9]{0,2}$/;
          setIsValid(partialOldFormat.test(testValue) || partialMercosulFormat.test(testValue));
        }
      } catch (error) {
        setIsValid(false);
      }
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setIsValid(true);
    }
  }, [inputValue, suggestions, value]);

  // Lidar com a tecla Enter para adicionar placa
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      const { formattedPlate, isValid } = formatAndValidatePlate(inputValue);
      
      if (isValid && !value.includes(formattedPlate)) {
        onChange([...value, formattedPlate]);
        setInputValue("");
      }
    }
  };

  // Lidar com colagem (paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    processMultiplePlates(pastedText);
    setInputValue("");
  };

  // Remover uma placa da lista
  const removePlate = (plate: string) => {
    onChange(value.filter((p) => p !== plate));
  };

  // Adicionar uma sugestão
  const addSuggestion = (plate: string) => {
    if (!value.includes(plate)) {
      onChange([...value, plate]);
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setShowSuggestions(!!filteredSuggestions.length)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={cn(
            "pr-8",
            isValid ? "border-input" : "border-destructive",
            inputValue && isValid && "border-green-500"
          )}
        />
        {inputValue && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}

        {/* Dropdown de sugestões */}
        {showSuggestions && (
          <div className="absolute mt-1 w-full max-h-48 overflow-auto z-10 bg-background border border-border rounded-md shadow-md">
            <ul className="py-1">
              {filteredSuggestions.map((plate) => (
                <li
                  key={plate}
                  className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center"
                  onClick={() => addSuggestion(plate)}
                >
                  {plate}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Lista de placas */}
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map((plate) => (
          <Badge
            key={plate}
            variant="outline"
            className="pl-2 pr-1 py-1 flex items-center gap-1"
          >
            {plate}
            <button
              type="button"
              onClick={() => removePlate(plate)}
              className="ml-1 rounded-full hover:bg-muted p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Instruções */}
      <p className="text-xs text-muted-foreground mt-1">
        Digite as placas e pressione Enter, ou cole várias placas de uma vez separadas por espaço, 
        vírgula, ponto e vírgula ou nova linha.
      </p>
    </div>
  );
}