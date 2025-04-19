// Componente para campos de dimensão com tratamento inteligente para valores decimais
import { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormDescription, FormMessage, FormItem, FormLabel } from "@/components/ui/form";

// Função utilitária para campos de dimensões (comprimento, largura, altura)
export function handleDimensionInput(e: ChangeEvent<HTMLInputElement>, field: any) {
  // Campo inteligente para dimensões que aceita tanto ponto quanto vírgula
  let value = e.target.value;
  
  // Limitar a digitação apenas a números, vírgula e ponto
  value = value.replace(/[^\d.,]/g, '');
  
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
  
  // Se digitar só números e chegar em 2 dígitos, adiciona vírgula automaticamente
  if (value.length === 2 && !hasComma && !hasDot && /^\d+$/.test(value)) {
    value = value + ',';
  }
  
  // Converter ponto para vírgula sempre (preferência formato brasileiro)
  if (hasDot) {
    value = value.replace('.', ',');
  }
  
  // Limitar a 2 casas decimais durante a digitação
  if (value.indexOf(',') !== -1) {
    const parts = value.split(',');
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
      value = parts.join(',');
    }
  }
  
  // Preservar o exato valor digitado na tela
  e.target.value = value;
  
  // Sanitizar para o modelo interno (sempre com ponto)
  const sanitized = value.replace(/,/g, '.').replace(/(\..*)\./g, '$1');
  
  // Atualizar o campo interno com o valor numérico
  field.onChange(sanitized === '' ? undefined : parseFloat(sanitized) || 0);
}

// Interface para o componente de campo de dimensão
interface DimensionFieldProps {
  field: any;
  label: string;
  placeholder: string;
  description: string;
}

export function DimensionField({ field, label, placeholder, description }: DimensionFieldProps) {
  return (
    <FormItem>
      <FormLabel className="text-base font-medium">{label}</FormLabel>
      <FormControl>
        <Input 
          type="text" 
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          placeholder={placeholder} 
          {...field}
          className="mobile-input h-10"
          value={
            typeof field.value === 'number' 
              ? field.value.toString().replace('.', ',') 
              : field.value || ''
          }
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
          onChange={(e) => handleDimensionInput(e, field)}
        />
      </FormControl>
      <FormDescription className="text-xs text-muted-foreground mt-1">
        {description}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}