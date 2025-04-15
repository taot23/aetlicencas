import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LicensePlatesInputProps {
  value: string[];
  onChange: (plates: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  suggestions?: string[];
  className?: string;
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

export function LicensePlatesInput({
  value = [],
  onChange,
  label,
  placeholder = 'Digite uma placa',
  error,
  suggestions = [],
  className,
}: LicensePlatesInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Atualizar as sugestões filtradas quando o input muda
  useEffect(() => {
    console.log("Input Value:", inputValue);
    console.log("Suggestions:", suggestions);
    
    if (inputValue && suggestions.length > 0) {
      // Melhorar o filtro para usar menos caracteres e ser mais flexível
      const filtered = suggestions
        .filter(plate => {
          const upperPlate = plate.toUpperCase();
          const upperInput = inputValue.toUpperCase();
          // Mostra sugestão mesmo com apenas 2 caracteres e ignora traços
          return upperPlate.includes(upperInput.replace(/-/g, '')) && 
                 !value.includes(plate);
        })
        .slice(0, 5); // Mostrar no máximo 5 sugestões
      
      console.log("Filtered Suggestions:", filtered);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, value]);
  
  // Fechar sugestões quando clica fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Adicionar placa à lista
  const addPlate = (plate: string) => {
    const formattedPlate = formatLicensePlate(plate);
    if (formattedPlate && !value.includes(formattedPlate)) {
      onChange([...value, formattedPlate]);
      setInputValue('');
    }
  };
  
  // Remover placa da lista
  const removePlate = (plate: string) => {
    onChange(value.filter(p => p !== plate));
  };
  
  // Manipular tecla Enter para adicionar placa
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      
      const formatted = formatLicensePlate(inputValue);
      if (isValidLicensePlate(formatted)) {
        addPlate(formatted);
      }
    }
    // Navegação pelas sugestões com setas
    else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      const firstSuggestion = document.querySelector('.suggestion-item') as HTMLElement;
      if (firstSuggestion) firstSuggestion.focus();
    }
  };
  
  // Manipular eventos do campo de entrada
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(formatLicensePlate(e.target.value));
  };
  
  // Manipular tecla Enter nas sugestões
  const handleSuggestionKeyDown = (e: KeyboardEvent<HTMLDivElement>, plate: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPlate(plate);
    } 
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      
      const items = Array.from(document.querySelectorAll('.suggestion-item'));
      const currentIndex = items.indexOf(e.currentTarget);
      
      if (e.key === 'ArrowUp') {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          (items[prevIndex] as HTMLElement).focus();
        } else {
          inputRef.current?.focus();
        }
      } else if (e.key === 'ArrowDown') {
        const nextIndex = currentIndex + 1;
        if (nextIndex < items.length) {
          (items[nextIndex] as HTMLElement).focus();
        }
      }
    }
  };
  
  // Manipular colar múltiplas placas
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    if (!pastedText) return;
    
    // Verificar se o texto colado contém múltiplas placas (separadas por espaço, vírgula, ou quebra de linha)
    const plateRegex = /[A-Z0-9]{7}/g;
    const matches = pastedText.toUpperCase().match(plateRegex);
    
    if (matches && matches.length > 1) {
      // Múltiplas placas encontradas
      const validPlates = matches
        .map(formatLicensePlate)
        .filter(isValidLicensePlate)
        .filter(plate => !value.includes(plate));
      
      if (validPlates.length > 0) {
        onChange([...value, ...validPlates]);
      }
    } else {
      // Apenas uma placa ou texto não reconhecido como placa
      setInputValue(formatLicensePlate(pastedText));
    }
  };
  
  return (
    <div className={`space-y-2 ${className || ''}`}>
      {label && <div className="text-sm font-medium">{label}</div>}
      
      <div className="flex flex-col space-y-2">
        {/* Campo de entrada estilo observação */}
        <div className="w-full">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
            onBlur={() => {
              // Quando perde o foco, se tiver uma placa válida, adiciona automaticamente
              setTimeout(() => {
                if (inputValue && isValidLicensePlate(formatLicensePlate(inputValue))) {
                  addPlate(inputValue);
                }
              }, 200); // Pequeno delay para permitir que o clique em uma sugestão funcione
            }}
            placeholder={placeholder}
            className={`w-full ${inputValue && !isValidLicensePlate(inputValue) ? 'border-red-500' : ''}`}
            maxLength={7}
          />
        </div>
        
        {/* Lista de sugestões */}
        {showSuggestions && (
          <div 
            ref={suggestionsRef}
            className="border rounded-md mt-1 max-h-[150px] overflow-auto bg-white dark:bg-gray-800 shadow-lg absolute z-10 w-[calc(100%-48px)]"
          >
            <ScrollArea className="max-h-[150px]">
              {filteredSuggestions.map((plate, index) => (
                <div
                  key={plate}
                  className="suggestion-item px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                  tabIndex={0}
                  onClick={() => addPlate(plate)}
                  onKeyDown={(e) => handleSuggestionKeyDown(e, plate)}
                >
                  {plate}
                </div>
              ))}
            </ScrollArea>
          </div>
        )}
        
        {/* Lista de placas selecionadas */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {value.map((plate) => (
              <div
                key={plate}
                className={`flex items-center rounded-md py-1 px-2 text-sm ${
                  isValidLicensePlate(plate)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                }`}
              >
                <span>{plate}</span>
                <button
                  type="button"
                  onClick={() => removePlate(plate)}
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Mensagem de erro */}
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        
        {/* Mensagem informativa */}
        <p className="text-xs text-gray-500 mt-1">
          Formatos válidos: Mercosul (AAA1A11) ou antigo (AAA1111)
        </p>
      </div>
    </div>
  );
}