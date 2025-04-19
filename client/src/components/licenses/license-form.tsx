import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  insertLicenseRequestSchema, 
  insertDraftLicenseSchema, 
  brazilianStates, 
  licenseTypeEnum,
  Vehicle,
  LicenseRequest,
  Transporter,
  insertVehicleSchema
} from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CampoPlacaAdicional } from "./placas-adicionais";
import { 
  LoaderCircle,
  X, 
  Plus, 
  Truck, 
  Search, 
  Upload, 
  Building2, 
  Link as LinkIcon,
  FileUp,
  Check
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { VehicleTypeImage } from "@/components/ui/vehicle-type-image";

// Tipos de carga por categoria
const NON_FLATBED_CARGO_TYPES = [
  { value: "dry_cargo", label: "Carga Seca" },
  { value: "liquid_cargo", label: "Líquida" },
  { value: "live_cargo", label: "Viva" },
  { value: "sugar_cane", label: "Cana de Açúcar" }
];

const FLATBED_CARGO_TYPES = [
  { value: "indivisible_cargo", label: "Carga Indivisível" },
  { value: "agricultural_machinery", label: "Máquinas Agrícolas" },
  { value: "oversized", label: "SUPERDIMENSIONADA" }
];

// Limites dimensionais
const DIMENSION_LIMITS = {
  default: {
    maxLength: 30.00,
    minLength: 19.80,
    maxWidth: 2.60,
    maxHeight: 4.40
  },
  flatbed: {
    maxLength: 25.00,
    minLength: 0,
    maxWidth: 3.20,
    maxHeight: 4.95
  },
  oversized: {
    // Sem limites pré-definidos
    maxLength: 999.99,
    minLength: 0,
    maxWidth: 999.99,
    maxHeight: 999.99
  }
};

// Funções auxiliares para formatar campos de dimensão com vírgula e limites específicos
function formatNumericInput(value: string, maxDigits: number = 6): string {
  // Esta é uma função básica que apenas formata a entrada, preservando a digitação
  // e garantindo que o formato esteja correto, sem aplicar regras de negócio
  
  // Remover caracteres inválidos (manter apenas números, vírgula e ponto)
  let formattedValue = value.replace(/[^\d.,]/g, '');
  
  // Substituir ponto por vírgula para padronização
  formattedValue = formattedValue.replace('.', ',');
  
  // Garantir que não haja mais de uma vírgula
  const parts = formattedValue.split(',');
  if (parts.length > 2) {
    formattedValue = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limitar o tamanho total do número
  if (formattedValue.length > maxDigits) {
    // Se tiver parte decimal, limitar o total considerando a vírgula
    if (formattedValue.includes(',')) {
      const [integer, decimal] = formattedValue.split(',');
      if (integer.length >= maxDigits) {
        formattedValue = integer.substring(0, maxDigits);
      } else {
        const remainingDigits = maxDigits - integer.length - 1; // -1 para a vírgula
        formattedValue = integer + ',' + decimal.substring(0, remainingDigits);
      }
    } else {
      formattedValue = formattedValue.substring(0, maxDigits);
    }
  }
  
  return formattedValue;
}

// Esta função completa os zeros para o formato visual final (00,00) sem arredondamento
function formatFinalValue(value: string): string {
  if (!value) return '';
  
  // Remover qualquer caractere que não seja número, vírgula ou ponto
  let cleanValue = value.replace(/[^\d.,]/g, '');
  
  // Substituir ponto por vírgula para padronização
  cleanValue = cleanValue.replace('.', ',');
  
  // Separar parte inteira e decimal
  const parts = cleanValue.split(',');
  const integerPart = parts[0] || '0';
  
  // Se não tem parte decimal, adicionar ,00
  if (parts.length === 1) {
    return integerPart + ',00';
  }
  
  // Garantir exatamente 2 casas decimais sem arredondamento
  let decimalPart = parts[1] || '';
  
  // Truncar para exatamente 2 dígitos se tiver mais
  if (decimalPart.length > 2) {
    decimalPart = decimalPart.substring(0, 2);
  }
  
  // Completar com zeros se tiver menos de 2 dígitos
  while (decimalPart.length < 2) {
    decimalPart += '0';
  }
  
  return integerPart + ',' + decimalPart;
}

// Função para limitar comprimento (19,80 a 30,00 metros para maioria dos conjuntos)
function formatLengthInput(value: string, licenseType: string, cargoType?: string): { 
  displayValue: string; 
  numericValue: number | undefined; 
} {
  // Formatar entrada numérica padrão
  const formattedValue = formatNumericInput(value);
  
  // Converter para número para verificar limites
  const numericValue = parseFloat(formattedValue.replace(',', '.'));
  
  // Se não for um número, retornar valor formatado apenas
  if (isNaN(numericValue)) {
    return {
      displayValue: formattedValue,
      numericValue: undefined
    };
  }
  
  // Determinar limites com base no tipo de licença e carga
  const isFlatbed = licenseType === 'flatbed';
  const isOversized = cargoType === 'oversized';
  
  // Obter limites baseados no tipo
  let limits = DIMENSION_LIMITS.default;
  if (isFlatbed) {
    limits = isOversized ? DIMENSION_LIMITS.oversized : DIMENSION_LIMITS.flatbed;
  }
  
  let finalValue = formattedValue;
  let finalNumeric = numericValue;
  
  // Durante a digitação, apenas verificamos limites máximos
  // para permitir que o usuário digite livremente valores abaixo do mínimo
  if (numericValue > limits.maxLength) {
    finalNumeric = limits.maxLength;
  }
  
  return {
    displayValue: finalValue,
    numericValue: finalNumeric
  };
}

// Função para limitar largura (2,60 metros para conjuntos normais, 3,20 para prancha)
function formatWidthInput(value: string, licenseType: string, cargoType?: string): { 
  displayValue: string; 
  numericValue: number | undefined; 
} {
  // Formatar entrada numérica padrão
  const formattedValue = formatNumericInput(value);
  
  // Converter para número para verificar limites
  const numericValue = parseFloat(formattedValue.replace(',', '.'));
  
  // Se não for um número, retornar valor formatado apenas
  if (isNaN(numericValue)) {
    return {
      displayValue: formattedValue,
      numericValue: undefined
    };
  }
  
  // Determinar limites com base no tipo de licença e carga
  const isFlatbed = licenseType === 'flatbed';
  const isOversized = cargoType === 'oversized';
  
  // Obter limites baseados no tipo
  let limits = DIMENSION_LIMITS.default;
  if (isFlatbed) {
    limits = isOversized ? DIMENSION_LIMITS.oversized : DIMENSION_LIMITS.flatbed;
  }
  
  let finalValue = formattedValue;
  let finalNumeric = numericValue;
  
  // Durante a digitação, apenas verificamos limites máximos
  // para permitir que o usuário digite livremente valores abaixo do mínimo
  if (numericValue > limits.maxWidth) {
    finalNumeric = limits.maxWidth;
  }
  
  return {
    displayValue: finalValue,
    numericValue: finalNumeric
  };
}

// Função para limitar altura (4,40 metros para conjuntos normais, 4,95 para prancha)
function formatHeightInput(value: string, licenseType: string, cargoType?: string): { 
  displayValue: string; 
  numericValue: number | undefined; 
} {
  // Formatar entrada numérica padrão
  const formattedValue = formatNumericInput(value);
  
  // Converter para número para verificar limites
  const numericValue = parseFloat(formattedValue.replace(',', '.'));
  
  // Se não for um número, retornar valor formatado apenas
  if (isNaN(numericValue)) {
    return {
      displayValue: formattedValue,
      numericValue: undefined
    };
  }
  
  // Determinar limites com base no tipo de licença e carga
  const isFlatbed = licenseType === 'flatbed';
  const isOversized = cargoType === 'oversized';
  
  // Obter limites baseados no tipo
  let limits = DIMENSION_LIMITS.default;
  if (isFlatbed) {
    limits = isOversized ? DIMENSION_LIMITS.oversized : DIMENSION_LIMITS.flatbed;
  }
  
  let finalValue = formattedValue;
  let finalNumeric = numericValue;
  
  // Durante a digitação, apenas verificamos limites máximos
  // para permitir que o usuário digite livremente valores abaixo do mínimo
  if (numericValue > limits.maxHeight) {
    finalNumeric = limits.maxHeight;
  }
  
  return {
    displayValue: finalValue,
    numericValue: finalNumeric
  };
}

interface LicenseFormProps {
  draft?: LicenseRequest | null;
  onComplete: () => void;
  onCancel: () => void;
  preSelectedTransporterId?: number | null;
}

export function LicenseForm({ draft, onComplete, onCancel, preSelectedTransporterId }: LicenseFormProps) {
  const { toast } = useToast();
  const [licenseType, setLicenseType] = useState<string>(draft?.type || "");
  const [cargoType, setCargoType] = useState<string>(draft?.cargoType || "");
  
  // Estado local para valores formatados de dimensões com casas decimais
  const [lengthDisplay, setLengthDisplay] = useState<string>(
    draft?.length ? formatFinalValue((draft.length / 100).toString().replace('.', ',')) : ""
  );
  const [widthDisplay, setWidthDisplay] = useState<string>(
    draft?.width ? formatFinalValue((draft.width / 100).toString().replace('.', ',')) : ""
  );
  const [heightDisplay, setHeightDisplay] = useState<string>(
    draft?.height ? formatFinalValue((draft.height / 100).toString().replace('.', ',')) : ""
  );

  // Fetch vehicles for the dropdown selectors
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  // Fetch transporters linked to the user
  const { data: transporters = [], isLoading: isLoadingTransporters } = useQuery<Transporter[]>({
    queryKey: ["/api/user/transporters"],
  });

  // Define filtered vehicle lists based on type
  const tractorUnits = vehicles?.filter(v => v.type === "tractor_unit") || [];
  const semiTrailers = vehicles?.filter(v => v.type === "semi_trailer") || [];
  const dollys = vehicles?.filter(v => v.type === "dolly") || [];
  const flatbeds = vehicles?.filter(v => v.type === "flatbed") || [];

  // Define a schema that can be validated partially (for drafts)
  const formSchema = draft?.isDraft 
    ? insertDraftLicenseSchema 
    : insertLicenseRequestSchema;

  // Usar o transportador pré-selecionado quando disponível
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: draft ? {
      type: draft.type,
      transporterId: draft.transporterId || undefined,
      mainVehiclePlate: draft.mainVehiclePlate,
      tractorUnitId: draft.tractorUnitId || undefined,
      firstTrailerId: draft.firstTrailerId || undefined,
      dollyId: draft.dollyId || undefined,
      secondTrailerId: draft.secondTrailerId || undefined,
      flatbedId: draft.flatbedId || undefined,
      length: draft.length / 100, // Convert from cm to meters for display
      width: draft.width ? draft.width / 100 : undefined, // Convert from cm to meters for display
      height: draft.height ? draft.height / 100 : undefined, // Convert from cm to meters for display
      additionalPlates: draft.additionalPlates || [],
      additionalPlatesDocuments: draft.additionalPlatesDocuments || [],
      states: draft.states,
      isDraft: draft.isDraft,
      comments: draft.comments || undefined,
    } : {
      type: "",
      transporterId: preSelectedTransporterId || undefined, // Usar o transportador pré-selecionado
      mainVehiclePlate: "",
      tractorUnitId: undefined,
      firstTrailerId: undefined,
      dollyId: undefined,
      secondTrailerId: undefined,
      flatbedId: undefined,
      length: 0,
      width: undefined,
      height: undefined,
      additionalPlates: [],
      states: [],
      additionalPlatesDocuments: [],
      isDraft: true,
      comments: "",
    },
  });

  // Efeito para mostrar notificação quando tiver transportador pré-selecionado
  useEffect(() => {
    if (preSelectedTransporterId && transporters && transporters.length > 0) {
      const selectedTransporter = transporters.find(t => t.id === preSelectedTransporterId);
      if (selectedTransporter) {
        toast({
          title: "Transportador selecionado",
          description: `Usando ${selectedTransporter.name} como transportador para esta solicitação`,
        });
      }
    }
  }, [preSelectedTransporterId, transporters, toast]);

  // Watch for type changes to conditionally render fields
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type") {
        setLicenseType(value.type as string);
      }
      
      // Set main vehicle plate based on tractor unit selection
      if (name === "tractorUnitId" && value.tractorUnitId) {
        const selectedVehicle = vehicles?.find(v => v.id === value.tractorUnitId);
        if (selectedVehicle) {
          form.setValue("mainVehiclePlate", selectedVehicle.plate);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, vehicles]);

  // Handle form submissions
  const saveAsDraftMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertDraftLicenseSchema>) => {
      const url = draft ? `/api/licenses/drafts/${draft.id}` : '/api/licenses/drafts';
      const method = draft ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rascunho salvo",
        description: "O rascunho da licença foi salvo com sucesso",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o rascunho",
        variant: "destructive",
      });
    },
  });

  const submitRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertLicenseRequestSchema>) => {
      const url = draft ? `/api/licenses/drafts/${draft.id}/submit` : '/api/licenses';
      const method = "POST";
      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada",
        description: "A solicitação de licença foi enviada com sucesso",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a solicitação",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Adjust length from meters to centimeters for storage
    const dataToSubmit = {
      ...values,
      cargoType, // Adiciona o tipo de carga selecionado
      length: Math.round((values.length || 0) * 100), // Convert to centimeters
      width: values.width ? Math.round((values.width || 0) * 100) : undefined, // Convert to centimeters, se existir
      height: values.height ? Math.round((values.height || 0) * 100) : undefined, // Convert to centimeters, se existir
    };
    
    if (values.isDraft) {
      // Cast to appropriate types to satisfy TypeScript
      saveAsDraftMutation.mutate(dataToSubmit as any);
    } else {
      // Remove isDraft from payload when submitting a license request
      const { isDraft, ...requestData } = dataToSubmit;
      submitRequestMutation.mutate(requestData as any);
    }
  };

  const handleSaveDraft = () => {
    form.setValue("isDraft", true);
    form.handleSubmit(onSubmit)();
  };

  const handleSubmitRequest = () => {
    form.setValue("isDraft", false);
    form.handleSubmit(onSubmit)();
  };

  const isProcessing = saveAsDraftMutation.isPending || submitRequestMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
          control={form.control}
          name="transporterId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transportador</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o transportador" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingTransporters ? (
                    <SelectItem value="loading">Carregando transportadores...</SelectItem>
                  ) : transporters.length > 0 ? (
                    transporters.map((transporter) => (
                      <SelectItem key={transporter.id} value={transporter.id.toString()}>
                        {transporter.name} {transporter.documentNumber ? `- ${transporter.documentNumber}` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_transporter">Nenhum transportador vinculado</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Selecione o transportador para o qual esta licença será emitida.
                Caso não encontre o transportador desejado, vá para "Minhas Empresas" e vincule o transportador à sua conta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Conjunto</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="roadtrain_9_axles">Rodotrem 9 eixos</SelectItem>
                  <SelectItem value="bitrain_9_axles">Bitrem 9 eixos</SelectItem>
                  <SelectItem value="bitrain_7_axles">Bitrem 7 eixos</SelectItem>
                  <SelectItem value="bitrain_6_axles">Bitrem 6 eixos</SelectItem>
                  <SelectItem value="flatbed">Prancha</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic fields for Rodotrem 9 eixos */}
        {licenseType === 'roadtrain_9_axles' && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="font-medium text-gray-800 mb-2">Veículos do Rodotrem</h3>
            
            <div className="mb-4">
              <Label className="mb-2 block">Tipo de Carga</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {NON_FLATBED_CARGO_TYPES.map((cargo) => (
                  <Button
                    key={cargo.value}
                    type="button"
                    variant={cargoType === cargo.value ? "default" : "outline"}
                    className="justify-start text-left"
                    onClick={() => setCargoType(cargo.value)}
                  >
                    {cargo.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="tractorUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade Tratora</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade tratora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : tractorUnits.length > 0 ? (
                        tractorUnits.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_tractor">Nenhuma unidade tratora cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstTrailerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1ª Carreta</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a 1ª carreta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : semiTrailers.length > 0 ? (
                        semiTrailers.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_trailer">Nenhum semirreboque cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dollyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dolly</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o dolly" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : dollys.length > 0 ? (
                        dollys.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_dolly">Nenhum dolly cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondTrailerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2ª Carreta</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a 2ª carreta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : semiTrailers.length > 0 ? (
                        semiTrailers.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_trailer">Nenhum semirreboque cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Dynamic fields for Bitrem */}
        {(licenseType === 'bitrain_9_axles' || licenseType === 'bitrain_7_axles' || licenseType === 'bitrain_6_axles') && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="font-medium text-gray-800 mb-2">Veículos do Bitrem</h3>
            
            <div className="mb-4">
              <Label className="mb-2 block">Tipo de Carga</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {NON_FLATBED_CARGO_TYPES.map((cargo) => (
                  <Button
                    key={cargo.value}
                    type="button"
                    variant={cargoType === cargo.value ? "default" : "outline"}
                    className="justify-start text-left"
                    onClick={() => setCargoType(cargo.value)}
                  >
                    {cargo.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="tractorUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade Tratora</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade tratora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : tractorUnits.length > 0 ? (
                        tractorUnits.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_tractor">Nenhuma unidade tratora cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstTrailerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1ª Carreta</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a 1ª carreta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : semiTrailers.length > 0 ? (
                        semiTrailers.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_trailer">Nenhum semirreboque cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondTrailerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2ª Carreta</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a 2ª carreta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : semiTrailers.length > 0 ? (
                        semiTrailers.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_trailer">Nenhum semirreboque cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Dynamic fields for Prancha */}
        {licenseType === 'flatbed' && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="font-medium text-gray-800 mb-2">Veículos da Prancha</h3>
            
            <div className="mb-4">
              <Label className="mb-2 block">Tipo de Carga</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {FLATBED_CARGO_TYPES.map((cargo) => (
                  <Button
                    key={cargo.value}
                    type="button"
                    variant={cargoType === cargo.value ? "default" : "outline"}
                    className="justify-start text-left"
                    onClick={() => setCargoType(cargo.value)}
                  >
                    {cargo.label}
                  </Button>
                ))}
              </div>
              {cargoType === 'oversized' && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-sm border border-amber-200">
                  Atenção: Para cargas SUPERDIMENSIONADAS, dimensões especiais serão permitidas.
                </div>
              )}
            </div>
            
            <FormField
              control={form.control}
              name="tractorUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade Tratora</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade tratora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : tractorUnits.length > 0 ? (
                        tractorUnits.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_tractor">Nenhuma unidade tratora cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flatbedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prancha</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prancha" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value="loading">Carregando...</SelectItem>
                      ) : flatbeds.length > 0 ? (
                        flatbeds.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_flatbed">Nenhuma prancha cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="border border-gray-200 rounded-md p-4 space-y-4">
          <h3 className="font-medium text-gray-800 mb-2">Dimensões do Conjunto</h3>
          
          <FormField
            control={form.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comprimento (metros)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="19,80" 
                    value={lengthDisplay || (field.value ? field.value.toString().replace('.', ',') : '')}
                    onChange={(e) => {
                      // Usar a função específica para comprimento
                      const { displayValue, numericValue } = formatLengthInput(
                        e.target.value, 
                        licenseType, 
                        cargoType
                      );
                      
                      // Atualizar o display com valor formatado
                      setLengthDisplay(displayValue);
                      
                      // Atualizar o valor do campo com número
                      if (numericValue !== undefined) {
                        field.onChange(numericValue);
                      }
                    }}
                    onBlur={() => {
                      // Ao sair do campo, formatar com zeros (ex: 19,80)
                      if (field.value) {
                        const finalValue = formatFinalValue(field.value.toString().replace('.', ','));
                        setLengthDisplay(finalValue);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {licenseType === 'flatbed' ? (
                    cargoType === 'oversized' ? 
                    "Dimensões para cargas SUPERDIMENSIONADAS não possuem limites pré-definidos" :
                    "Para pranchas, o comprimento deve estar entre 0m e 25,00m"
                  ) : (
                    "O comprimento deve estar entre 19,80m e 30,00m para este tipo de conjunto"
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="width"
              render={({ field = { value: 0, onChange: () => {} } }) => (
                <FormItem>
                  <FormLabel>Largura (metros)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder={licenseType === 'flatbed' ? "3,20" : "2,60"}
                      value={widthDisplay || ''}
                      onChange={(e) => {
                        // Usar a função específica para largura
                        const { displayValue, numericValue } = formatWidthInput(
                          e.target.value, 
                          licenseType, 
                          cargoType
                        );
                        
                        // Atualizar o display com valor formatado
                        setWidthDisplay(displayValue);
                        
                        // Atualizar o valor do campo com número
                        if (numericValue !== undefined) {
                          field.onChange(numericValue);
                        }
                      }}
                      onBlur={() => {
                        // Ao sair do campo, formatar com zeros (ex: 2,60)
                        if (field.value) {
                          const finalValue = formatFinalValue(field.value.toString().replace('.', ','));
                          setWidthDisplay(finalValue);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {licenseType === 'flatbed' ? (
                      cargoType === 'oversized' ? 
                      "Sem limite definido para cargas SUPERDIMENSIONADAS" :
                      "Para pranchas, a largura deve ser de até 3,20m"
                    ) : (
                      "A largura deve ser de até 2,60m para este tipo de conjunto"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="height"
              render={({ field = { value: 0, onChange: () => {} } }) => (
                <FormItem>
                  <FormLabel>Altura (metros)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder={licenseType === 'flatbed' ? "4,95" : "4,40"}
                      value={heightDisplay || ''}
                      onChange={(e) => {
                        // Usar a função específica para altura
                        const { displayValue, numericValue } = formatHeightInput(
                          e.target.value, 
                          licenseType, 
                          cargoType
                        );
                        
                        // Atualizar o display com valor formatado
                        setHeightDisplay(displayValue);
                        
                        // Atualizar o valor do campo com número
                        if (numericValue !== undefined) {
                          field.onChange(numericValue);
                        }
                      }}
                      onBlur={() => {
                        // Ao sair do campo, formatar com zeros (ex: 4,40)
                        if (field.value) {
                          const finalValue = formatFinalValue(field.value.toString().replace('.', ','));
                          setHeightDisplay(finalValue);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {licenseType === 'flatbed' ? (
                      cargoType === 'oversized' ? 
                      "Sem limite definido para cargas SUPERDIMENSIONADAS" :
                      "Para pranchas, a altura deve ser de até 4,95m"
                    ) : (
                      "A altura deve ser de até 4,40m para este tipo de conjunto"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-md p-4 space-y-4">
          <h3 className="font-medium text-gray-800 mb-2">Relação de Placas Adicionais</h3>
          <div className="text-sm text-muted-foreground mb-2">Adicione as placas que fazem parte da composição mas não constam da listagem acima</div>
          
          <FormField
            control={form.control}
            name="additionalPlates"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col space-y-4">
                  {field.value?.map((plate, index) => (
                    <div key={index} className="flex flex-col space-y-2 p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={plate} 
                          onChange={(e) => {
                            const newPlates = [...field.value || []];
                            newPlates[index] = e.target.value;
                            field.onChange(newPlates);
                          }}
                          placeholder="ABC1234"
                          className="uppercase"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            // Remove both plate and document
                            const newPlates = [...field.value || []];
                            newPlates.splice(index, 1);
                            field.onChange(newPlates);
                            
                            const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
                            newDocs.splice(index, 1);
                            form.setValue('additionalPlatesDocuments', newDocs);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Document upload for each plate */}
                      <div className="mt-2">
                        <Label htmlFor={`plate-doc-${index}`}>Documento do veículo (CRLV)</Label>
                        <Input
                          id={`plate-doc-${index}`}
                          type="file"
                          accept="application/pdf,image/*"
                          className="mt-1"
                          onChange={(e) => {
                            const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
                            if (e.target.files?.[0]) {
                              // We store file path reference here
                              // In a real implementation, you'd upload this to a server and store the URL
                              newDocs[index] = URL.createObjectURL(e.target.files[0]);
                              form.setValue('additionalPlatesDocuments', newDocs);
                            }
                          }}
                        />
                        {form.getValues('additionalPlatesDocuments')?.[index] && (
                          <div className="text-sm text-green-600 mt-1">
                            Documento anexado ✓
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 flex items-center"
                    onClick={() => {
                      field.onChange([...field.value || [], '']);
                      // Add empty document slot
                      const newDocs = [...form.getValues('additionalPlatesDocuments') || []];
                      newDocs.push('');
                      form.setValue('additionalPlatesDocuments', newDocs);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Placa
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="states"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Estados (múltipla escolha)</FormLabel>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {brazilianStates.map((state) => (
                  <FormField
                    key={state.code}
                    control={form.control}
                    name="states"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={state.code}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={(field.value || []).includes(state.code)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), state.code])
                                  : field.onChange((field.value || []).filter((value) => value !== state.code));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {state.code}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adicione observações relevantes para este pedido de licença"
                  className="min-h-[120px]"
                  value={field.value as string || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Inclua quaisquer informações adicionais ou detalhes específicos para esta solicitação.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row justify-end gap-4 sm:space-x-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="w-full sm:w-auto order-3 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isProcessing}
            className="w-full sm:w-auto order-2"
          >
            {saveAsDraftMutation.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            onClick={handleSubmitRequest}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-3"
          >
            {submitRequestMutation.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Pedido
          </Button>
        </div>
      </form>
    </Form>
  );
}
