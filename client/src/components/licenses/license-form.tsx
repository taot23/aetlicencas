import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  insertLicenseRequestSchema, 
  insertDraftLicenseSchema, 
  brazilianStates, 
  licenseTypeEnum,
  Vehicle,
  LicenseRequest,
  Transporter,
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
import { LoaderCircle, X, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface LicenseFormProps {
  draft?: LicenseRequest | null;
  onComplete: () => void;
  onCancel: () => void;
  preSelectedTransporterId?: number | null;
}

export function LicenseForm({ draft, onComplete, onCancel, preSelectedTransporterId }: LicenseFormProps) {
  const { toast } = useToast();
  const [licenseType, setLicenseType] = useState<string>(draft?.type || "");

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
      length: Math.round((values.length || 0) * 100), // Convert to centimeters
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl mx-auto">
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

        {/* Nova seção de composição de veículos com interface visual */}
        <div className="border border-gray-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">Composição de Veículos</h3>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="bg-gray-100"
                onClick={() => {
                  // Lógica para adicionar veículo trator
                  if (tractorUnits.length === 0) {
                    toast({
                      title: "Atenção",
                      description: "Não há unidades tratoras cadastradas",
                      variant: "destructive",
                    });
                    return;
                  }
                }}
              >
                Adicionar Veículo Trator
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="bg-blue-100"
                onClick={() => {
                  // Lógica para adicionar carreta
                  if (semiTrailers.length === 0) {
                    toast({
                      title: "Atenção",
                      description: "Não há semirreboques cadastrados",
                      variant: "destructive",
                    });
                    return;
                  }
                }}
              >
                Adicionar Carreta
              </Button>
            </div>
          </div>

          {/* Container para a visualização do conjunto */}
          <div className="relative mb-6 flex flex-col md:flex-row gap-2 items-center md:items-stretch">
            {/* Componente visual para o Veículo Trator */}
            {form.watch("tractorUnitId") && (
              <div className="relative flex-1 border border-gray-300 rounded-md p-3 bg-gray-50 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-2">
                      Unidade Tratora
                    </h4>
                    <div className="text-sm">
                      <p className="mb-1">
                        <span className="font-medium mr-1">Placa:</span>
                        {vehicles?.find(v => v.id === form.watch("tractorUnitId"))?.plate || ""}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium mr-1">Tara:</span>
                        {vehicles?.find(v => v.id === form.watch("tractorUnitId"))?.tare || "0"} kg
                      </p>
                      <p>
                        <span className="font-medium mr-1">Ano CRLV:</span>
                        {vehicles?.find(v => v.id === form.watch("tractorUnitId"))?.crlvYear || ""}
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      form.setValue("tractorUnitId", undefined);
                      form.setValue("mainVehiclePlate", "");
                    }}
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                </div>
              </div>
            )}

            {/* Seta de conexão para o primeiro semirreboque */}
            {form.watch("tractorUnitId") && form.watch("firstTrailerId") && (
              <div className="flex items-center justify-center p-1">
                <div className="h-0.5 w-5 bg-gray-400"></div>
                <div className="text-gray-400">→</div>
              </div>
            )}

            {/* Componente visual para o 1º Semirreboque */}
            {form.watch("firstTrailerId") && (
              <div className="relative flex-1 border border-gray-300 rounded-md p-3 bg-gray-50 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-2">
                      1º Semirreboque
                    </h4>
                    <div className="text-sm">
                      <p className="mb-1">
                        <span className="font-medium mr-1">Placa:</span>
                        {vehicles?.find(v => v.id === form.watch("firstTrailerId"))?.plate || ""}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium mr-1">Tara:</span>
                        {vehicles?.find(v => v.id === form.watch("firstTrailerId"))?.tare || "0"} kg
                      </p>
                      <p>
                        <span className="font-medium mr-1">Ano CRLV:</span>
                        {vehicles?.find(v => v.id === form.watch("firstTrailerId"))?.crlvYear || ""}
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      form.setValue("firstTrailerId", undefined);
                    }}
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                </div>
              </div>
            )}

            {/* Seta de conexão para o Dolly (apenas para Rodotrem) */}
            {form.watch("firstTrailerId") && form.watch("dollyId") && licenseType === 'roadtrain_9_axles' && (
              <div className="flex items-center justify-center p-1">
                <div className="h-0.5 w-5 bg-gray-400"></div>
                <div className="text-gray-400">→</div>
              </div>
            )}

            {/* Componente visual para o Dolly (apenas para Rodotrem) */}
            {form.watch("dollyId") && licenseType === 'roadtrain_9_axles' && (
              <div className="relative flex-1 border border-gray-300 rounded-md p-3 bg-gray-50 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-2">
                      Dolly
                    </h4>
                    <div className="text-sm">
                      <p className="mb-1">
                        <span className="font-medium mr-1">Placa:</span>
                        {vehicles?.find(v => v.id === form.watch("dollyId"))?.plate || ""}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium mr-1">Tara:</span>
                        {vehicles?.find(v => v.id === form.watch("dollyId"))?.tare || "0"} kg
                      </p>
                      <p>
                        <span className="font-medium mr-1">Ano CRLV:</span>
                        {vehicles?.find(v => v.id === form.watch("dollyId"))?.crlvYear || ""}
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      form.setValue("dollyId", undefined);
                    }}
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                </div>
              </div>
            )}

            {/* Seta de conexão para o segundo semirreboque */}
            {((form.watch("firstTrailerId") && form.watch("secondTrailerId") && 
              (licenseType === 'bitrain_9_axles' || licenseType === 'bitrain_7_axles' || licenseType === 'bitrain_6_axles')) ||
             (form.watch("dollyId") && form.watch("secondTrailerId") && licenseType === 'roadtrain_9_axles')) && (
              <div className="flex items-center justify-center p-1">
                <div className="h-0.5 w-5 bg-gray-400"></div>
                <div className="text-gray-400">→</div>
              </div>
            )}

            {/* Componente visual para o 2º Semirreboque */}
            {form.watch("secondTrailerId") && (
              <div className="relative flex-1 border border-gray-300 rounded-md p-3 bg-gray-50 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-2">
                      2º Semirreboque
                    </h4>
                    <div className="text-sm">
                      <p className="mb-1">
                        <span className="font-medium mr-1">Placa:</span>
                        {vehicles?.find(v => v.id === form.watch("secondTrailerId"))?.plate || ""}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium mr-1">Tara:</span>
                        {vehicles?.find(v => v.id === form.watch("secondTrailerId"))?.tare || "0"} kg
                      </p>
                      <p>
                        <span className="font-medium mr-1">Ano CRLV:</span>
                        {vehicles?.find(v => v.id === form.watch("secondTrailerId"))?.crlvYear || ""}
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      form.setValue("secondTrailerId", undefined);
                    }}
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                </div>
              </div>
            )}

            {/* Componente visual para a Prancha (apenas para tipo Prancha) */}
            {form.watch("flatbedId") && licenseType === 'flatbed' && (
              <div className="relative flex-1 border border-gray-300 rounded-md p-3 bg-gray-50 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-2">
                      Prancha
                    </h4>
                    <div className="text-sm">
                      <p className="mb-1">
                        <span className="font-medium mr-1">Placa:</span>
                        {vehicles?.find(v => v.id === form.watch("flatbedId"))?.plate || ""}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium mr-1">Tara:</span>
                        {vehicles?.find(v => v.id === form.watch("flatbedId"))?.tare || "0"} kg
                      </p>
                      <p>
                        <span className="font-medium mr-1">Ano CRLV:</span>
                        {vehicles?.find(v => v.id === form.watch("flatbedId"))?.crlvYear || ""}
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      form.setValue("flatbedId", undefined);
                    }}
                  >
                    <X size={16} className="text-gray-500" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Seletores de veículos escondidos em um accordeon */}
          <div className="border border-gray-200 rounded-md p-3 bg-white">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selecione os veículos do conjunto</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Seletor para Unidade Tratora */}
              <FormField
                control={form.control}
                name="tractorUnitId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Unidade Tratora</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        // Também atualizar a placa principal
                        const selectedVehicle = vehicles?.find(v => v.id === parseInt(value));
                        if (selectedVehicle) {
                          form.setValue("mainVehiclePlate", selectedVehicle.plate);
                        }
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione" />
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
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Seletor para 1ª Carreta (todos os tipos exceto Prancha) */}
              {licenseType !== 'flatbed' && (
                <FormField
                  control={form.control}
                  name="firstTrailerId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">1ª Carreta</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione" />
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {/* Seletor para Dolly (apenas para Rodotrem) */}
              {licenseType === 'roadtrain_9_axles' && (
                <FormField
                  control={form.control}
                  name="dollyId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Dolly</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione" />
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {/* Seletor para 2ª Carreta (Bitrem e Rodotrem) */}
              {(licenseType === 'roadtrain_9_axles' || 
                licenseType === 'bitrain_9_axles' || 
                licenseType === 'bitrain_7_axles' || 
                licenseType === 'bitrain_6_axles') && (
                <FormField
                  control={form.control}
                  name="secondTrailerId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">2ª Carreta</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione" />
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {/* Seletor para Prancha (apenas para tipo Prancha) */}
              {licenseType === 'flatbed' && (
                <FormField
                  control={form.control}
                  name="flatbedId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Prancha</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione" />
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Total de unidades */}
            <div className="mt-4 text-right text-sm font-medium">
              Total Unidades Acopladas: {
                (form.watch("tractorUnitId") ? 1 : 0) + 
                (form.watch("firstTrailerId") ? 1 : 0) + 
                (form.watch("dollyId") ? 1 : 0) + 
                (form.watch("secondTrailerId") ? 1 : 0) + 
                (form.watch("flatbedId") ? 1 : 0)
              }
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="length"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comprimento do Conjunto (metros)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="30.5" 
                  {...field} 
                  value={field.value || ''} 
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
