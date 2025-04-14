import { useEffect, useState } from "react";
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
import { LoaderCircle, X, Plus, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Interface para as propriedades do componente
interface LicenseFormProps {
  draft?: LicenseRequest | null;
  onComplete: () => void;
  onCancel: () => void;
  preSelectedTransporterId?: number | null;
}

// Esquema para validação do formulário
const formSchema = insertDraftLicenseSchema.extend({
  isDraft: z.boolean().default(true),
  additionalPlates: z.array(z.object({
    plate: z.string().min(1, "Placa é obrigatória"),
    type: z.string().min(1, "Tipo é obrigatório"),
  })).default([]),
  requestedStates: z.array(z.string()).default([]),
  states: z.array(z.string()).optional().default([]),
  additionalInfo: z.string().optional(),
});

// Tipo para os valores do formulário
type FormValues = z.infer<typeof formSchema>;

export function LicenseForm({ draft, onComplete, onCancel, preSelectedTransporterId }: LicenseFormProps) {
  const { toast } = useToast();
  const [licenseType, setLicenseType] = useState<string | undefined>(draft?.type);
  
  // Form com valores padrão
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transporterId: draft?.transporterId || preSelectedTransporterId || undefined,
      type: draft?.type || undefined,
      tractorUnitId: draft?.tractorUnitId || undefined,
      firstTrailerId: draft?.firstTrailerId || undefined,
      secondTrailerId: draft?.secondTrailerId || undefined,
      dollyId: draft?.dollyId || undefined,
      flatbedId: draft?.flatbedId || undefined,
      additionalInfo: draft?.additionalInfo || "",
      requestedStates: draft?.requestedStates || [],
      additionalPlates: draft?.additionalPlates || [],
      isDraft: true,
    },
  });

  // Atualiza o tipo de licença quando o valor muda no formulário
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type") {
        setLicenseType(value.type);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Atualiza o form quando o transportador pré-selecionado muda
  useEffect(() => {
    if (preSelectedTransporterId) {
      form.setValue("transporterId", preSelectedTransporterId);
    }
  }, [preSelectedTransporterId, form]);

  // Busca transportadores
  const { data: transporters = [], isLoading: isLoadingTransporters } = useQuery<Transporter[]>({
    queryKey: ["/api/user/transporters"],
    queryFn: async () => {
      const res = await fetch("/api/user/transporters", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar transportadores");
      }
      return res.json();
    }
  });

  // Busca veículos
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar veículos");
      }
      return res.json();
    }
  });

  // Filtra veículos por tipo
  const tractorUnits = vehicles.filter(v => v.type === "tractor_unit");
  const semiTrailers = vehicles.filter(v => v.type === "semi_trailer");
  const dollys = vehicles.filter(v => v.type === "dolly");
  const flatbeds = vehicles.filter(v => v.type === "flatbed");

  // Mutation para salvar como rascunho
  const saveAsDraftMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", `/api/licenses/drafts${draft?.id ? `/${draft.id}` : ""}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rascunho salvo",
        description: "O rascunho foi salvo com sucesso.",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar rascunho",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para enviar o pedido
  const submitRequestMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      try {
        console.log("Enviando dados:", data);
        
        // Certifique-se de que os dados estão no formato esperado
        const formattedData = {
          ...data,
          // Importante: o backend espera o campo 'states' e não 'requestedStates'
          states: data.states || data.requestedStates || [],
          // Se não houver tractorUnitId, defina uma placa padrão
          mainVehiclePlate: data.mainVehiclePlate || "Não especificado",
          // Defina um comprimento padrão se não existir
          length: data.length || 2000,
          // Indica que não é um rascunho
          isDraft: false
        };
        
        console.log("Dados formatados:", formattedData);
        
        const res = await apiRequest("POST", "/api/licenses/submit", formattedData);
        
        // Verifica se a requisição foi bem-sucedida
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Erro ao enviar solicitação");
        }
        
        // Retorna os dados da resposta
        return await res.json();
      } catch (error) {
        console.error("Erro na mutação:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Solicitação enviada com sucesso:", data);
      
      // Notifica o usuário
      toast({
        title: "Solicitação enviada",
        description: "A solicitação de licença foi enviada com sucesso.",
      });
      
      // Fecha o formulário e redireciona
      setTimeout(() => {
        onComplete();
        
        // Atualiza a cache da query
        queryClient.invalidateQueries({
          queryKey: ["/api/licenses"],
        });
      }, 500);
    },
    onError: (error: Error) => {
      console.error("Erro ao enviar solicitação:", error);
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message || "Ocorreu um erro ao processar sua solicitação",
        variant: "destructive",
      });
    },
  });

  // Adiciona uma placa adicional
  const addAdditionalPlate = () => {
    const currentPlates = form.getValues("additionalPlates") || [];
    form.setValue("additionalPlates", [...currentPlates, { plate: "", type: "" }]);
  };

  // Remove uma placa adicional
  const removeAdditionalPlate = (index: number) => {
    const currentPlates = form.getValues("additionalPlates");
    if (currentPlates) {
      form.setValue("additionalPlates", currentPlates.filter((_, i) => i !== index));
    }
  };

  // Função de submit
  const onSubmit = (data: FormValues) => {
    // Verificar valores obrigatórios
    if (!data.transporterId) {
      toast({
        title: "Erro de validação",
        description: "Selecione um transportador",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.type) {
      toast({
        title: "Erro de validação",
        description: "Selecione um tipo de conjunto",
        variant: "destructive",
      });
      return;
    }
    
    if (data.requestedStates.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um estado",
        variant: "destructive",
      });
      return;
    }
    
    // Garante que o campo states receba os valores de requestedStates 
    data.states = [...data.requestedStates];
    
    // Verificar veículos de acordo com o tipo
    if (data.type === 'roadtrain_9_axles' || 
        data.type === 'bitrain_9_axles' || 
        data.type === 'bitrain_7_axles' || 
        data.type === 'bitrain_6_axles') {
      if (!data.tractorUnitId) {
        toast({
          title: "Erro de validação",
          description: "Selecione uma unidade tratora",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Definir placa principal
    const mainVehicle = vehicles.find(v => v.id === data.tractorUnitId);
    if (mainVehicle) {
      data.mainVehiclePlate = mainVehicle.plate;
    } else {
      data.mainVehiclePlate = "Não especificado";
    }
    
    // Definir comprimento padrão se não for especificado
    if (!data.length) {
      data.length = 2000; // 20 metros em centímetros
    }
    
    console.log("Dados processados para envio:", data);
    
    if (data.isDraft) {
      saveAsDraftMutation.mutate(data);
    } else {
      submitRequestMutation.mutate(data);
    }
  };

  // Funções de manipulação
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Dynamic fields for Rodotrem 9 eixos */}
        {licenseType === 'roadtrain_9_axles' && (
          <div className="border border-gray-200 rounded-lg p-6 space-y-6 mx-auto max-w-6xl shadow-sm">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-4">Veículos do Rodotrem</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormItem className="flex flex-col">
                <FormLabel className="text-base mb-2">Unidade Tratora</FormLabel>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="DVQ0234"
                      value={form.watch("mainVehiclePlate") || ""}
                      onChange={(e) => form.setValue("mainVehiclePlate", e.target.value)}
                      className="pl-8 h-11"
                    />
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                      <i className="h-5 w-5">🚛</i>
                    </span>
                  </div>
                  <Button 
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-11 w-11"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button 
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-11 w-11"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {form.formState.errors.mainVehiclePlate && (
                  <p className="text-sm text-red-500">{form.formState.errors.mainVehiclePlate?.message}</p>
                )}
              </FormItem>

              <FormItem className="flex flex-col">
                <FormLabel className="text-base mb-2">1ª Carreta</FormLabel>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="RCH3H90"
                      value={form.watch("firstTrailerPlate") || ""}
                      onChange={(e) => form.setValue("firstTrailerPlate", e.target.value)}
                      className="pl-8 h-11"
                    />
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                      <i className="h-5 w-5">🚛</i>
                    </span>
                  </div>
                  <Button 
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-11 w-11"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button 
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-11 w-11"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {form.formState.errors.firstTrailerPlate && (
                  <p className="text-sm text-red-500">{form.formState.errors.firstTrailerPlate?.message}</p>
                )}
              </FormItem>

              <FormField
                control={form.control}
                name="dollyId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-base mb-2">Dolly</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
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
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-base mb-2">2ª Carreta</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
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
          </div>
        )}

        {/* Dynamic fields for Bitrem */}
        {(licenseType === 'bitrain_9_axles' || licenseType === 'bitrain_7_axles' || licenseType === 'bitrain_6_axles') && (
          <div className="border border-gray-200 rounded-lg p-5 space-y-4 mx-auto max-w-6xl shadow-sm">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-3">Veículos do Bitrem</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tractorUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mb-1">Unidade Tratora</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
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
                    <FormLabel className="text-sm font-medium mb-1">1ª Carreta</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
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
                  <FormItem className="md:col-span-2 md:w-1/2 md:mx-auto">
                    <FormLabel className="text-sm font-medium mb-1">2ª Carreta</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
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
          </div>
        )}

        {/* Dynamic fields for Prancha */}
        {licenseType === 'flatbed' && (
          <div className="border border-gray-200 rounded-lg p-5 space-y-4 mx-auto max-w-6xl shadow-sm">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-3">Veículos da Prancha</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tractorUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mb-1">Unidade Tratora</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
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
                    <FormLabel className="text-sm font-medium mb-1">Prancha</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
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
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-6 space-y-6 mx-auto max-w-6xl shadow-sm">
          <h3 className="font-semibold text-gray-800 text-xl text-center mb-4">Relação de Placas Adicionais</h3>
          <div className="text-sm text-muted-foreground mb-4 text-center">Adicione as placas que fazem parte da composição mas não constam da listagem acima</div>
          
          <FormField
            control={form.control}
            name="additionalPlates"
            render={() => (
              <FormItem>
                <div className="flex flex-col space-y-4">
                  {form.getValues("additionalPlates")?.map((plate, index) => (
                    <div key={index} className="flex flex-col space-y-2 p-3 border border-gray-200 rounded-md mx-auto max-w-3xl">
                      <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: '3fr 1fr auto' }}>
                        <Input
                          placeholder="Placa do Veículo"
                          value={plate.plate}
                          onChange={(e) => {
                            const updatedPlates = [...form.getValues("additionalPlates")];
                            updatedPlates[index].plate = e.target.value;
                            form.setValue("additionalPlates", updatedPlates);
                          }}
                          className="h-9"
                        />
                        
                        <Select
                          value={plate.type}
                          onValueChange={(value) => {
                            const updatedPlates = [...form.getValues("additionalPlates")];
                            updatedPlates[index].type = value;
                            form.setValue("additionalPlates", updatedPlates);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent align="center">
                            <SelectItem value="tractor_unit">Cavalo</SelectItem>
                            <SelectItem value="semi_trailer">Semi</SelectItem>
                            <SelectItem value="trailer">Reboque</SelectItem>
                            <SelectItem value="dolly">Dolly</SelectItem>
                            <SelectItem value="flatbed">Prancha</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button 
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAdditionalPlate(index)}
                          className="h-9 w-9 p-0 justify-self-start"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-2">
                        {form.formState.errors.additionalPlates?.[index]?.plate && (
                          <div className="text-sm text-red-500">
                            {form.formState.errors.additionalPlates[index]?.plate?.message}
                          </div>
                        )}
                        {form.formState.errors.additionalPlates?.[index]?.type && (
                          <div className="text-sm text-red-500">
                            {form.formState.errors.additionalPlates[index]?.type?.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdditionalPlate}
                      className="flex items-center w-auto px-3 py-1 h-8 text-sm"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Adicionar Placa
                    </Button>
                  </div>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="border border-gray-200 rounded-lg p-6 space-y-6 mx-auto max-w-6xl shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-4">Estados Solicitados*</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {brazilianStates.map((state) => (
                <FormField
                  key={state.code}
                  control={form.control}
                  name="requestedStates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(state.code)}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            const newValue = checked
                              ? [...currentValue, state.code]
                              : currentValue.filter((value) => value !== state.code);
                            console.log(`Estados selecionados:`, newValue);
                            return field.onChange(newValue);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {state.name} ({state.code})
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="additionalInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Informações Adicionais</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Qualquer informação relevante para o pedido..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Se houver alguma informação adicional importante para esta solicitação, inclua aqui.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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