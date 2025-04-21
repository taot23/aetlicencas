// Componente para campos de dimensão com tratamento inteligente para valores decimais
import { ChangeEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormDescription, FormMessage, FormItem, FormLabel } from "@/components/ui/form";

// Interface para o componente de campo de dimensão
interface DimensionFieldProps {
  field: any;
  label: string;
  placeholder: string;
  description: string;
}

export function DimensionField({ field, label, placeholder, description }: DimensionFieldProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  // Função local para processar a entrada de dimensões
  function processInput(e: ChangeEvent<HTMLInputElement>) {
    // Campo inteligente para dimensões que aceita tanto ponto quanto vírgula
    let value = e.target.value;
    let cursorPos = e.target.selectionStart || 0;
    let valueChanged = false;

    console.log("Valor original:", value);
    
    // Limitar a digitação apenas a números, vírgula e ponto
    value = value.replace(/[^\d.,]/g, '');
    console.log("Após filtrar caracteres:", value);
    
    // Limitar a 5 caracteres no total (incluindo vírgula)
    if (value.length > 5) {
      value = value.substring(0, 5);
    }
    
    // Assegurar que só exista um separador decimal
    const hasComma = value.indexOf(',') !== -1;
    const hasDot = value.indexOf('.') !== -1;
    
    if (hasComma && hasDot) {
      // Se tiver ambos, remover o ponto
      value = value.replace(/\./g, '');
    }
    
    // Converter ponto para vírgula sempre (preferência formato brasileiro)
    if (hasDot) {
      value = value.replace('.', ',');
    }
    
    // Adicionar automaticamente vírgula após 2 dígitos
    if (value.length === 2 && !hasComma && !value.includes(',') && /^\d\d$/.test(value)) {
      value = value + ',';
      valueChanged = true;
      // Ajustar posição do cursor
      cursorPos = 3;
    }
    
    // Limitar a 2 casas decimais durante a digitação
    if (value.indexOf(',') !== -1) {
      const parts = value.split(',');
      if (parts[1] && parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
        value = parts.join(',');
      }
    }
    
    console.log("Valor final no input:", value);
    
    // Atualizar o valor de exibição
    setDisplayValue(value);
    
    // Posicionar o cursor corretamente se o valor mudou
    if (valueChanged) {
      setTimeout(() => {
        e.target.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    }
    
    // Sanitizar para o modelo interno (sempre com ponto)
    const sanitized = value.replace(/,/g, '.').replace(/(\..*)\./g, '$1');
    
    // Converter para float (para o backend)
    const numericValue = sanitized === '' ? undefined : parseFloat(sanitized);
    
    console.log("Valor sanitizado:", sanitized);
    console.log("Valor numérico:", numericValue);
    
    // Atualizar o campo interno com o valor numérico
    field.onChange(numericValue);
  }

  // Ao inicializar, converter o valor numérico para exibição
  if (displayValue === '' && typeof field.value === 'number') {
    setDisplayValue(field.value.toString().replace('.', ','));
  }

  return (
    <FormItem>
      <FormLabel className="text-base font-medium">{label}</FormLabel>
      <FormControl>
        <Input 
          type="text" 
          inputMode="decimal"
          placeholder={placeholder}
          value={displayValue}
          className="mobile-input h-10"
          onFocus={(e) => {
            document.body.classList.add('keyboard-active');
            window.scrollTo(0, 0);
            setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }}
          onBlur={() => {
            document.body.classList.remove('keyboard-active');
          }}
          onChange={processInput}
        />
      </FormControl>
      <FormDescription className="text-xs text-muted-foreground mt-1">
        {description}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}