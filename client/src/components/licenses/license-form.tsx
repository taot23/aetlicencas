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
      const res = await apiRequest("POST", `/api/licenses/submit${draft?.id ? `/${draft.id}` : ""}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada",
        description: "A solicitação de licença foi enviada com sucesso.",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message,
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
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="font-medium text-gray-800 mb-2">Veículos do Rodotrem</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}

        {/* Dynamic fields for Bitrem */}
        {(licenseType === 'bitrain_9_axles' || licenseType === 'bitrain_7_axles' || licenseType === 'bitrain_6_axles') && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="font-medium text-gray-800 mb-2">Veículos do Bitrem</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}

        {/* Dynamic fields for Prancha */}
        {licenseType === 'flatbed' && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="font-medium text-gray-800 mb-2">Veículos da Prancha</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}

        <div className="border border-gray-200 rounded-md p-4 space-y-4">
          <h3 className="font-medium text-gray-800 mb-2">Relação de Placas Adicionais</h3>
          <div className="text-sm text-muted-foreground mb-2">Adicione as placas que fazem parte da composição mas não constam da listagem acima</div>
          
          <FormField
            control={form.control}
            name="additionalPlates"
            render={() => (
              <FormItem>
                <div className="flex flex-col space-y-4">
                  {form.getValues("additionalPlates")?.map((plate, index) => (
                    <div key={index} className="flex flex-col space-y-2 p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Placa do Veículo"
                          value={plate.plate}
                          onChange={(e) => {
                            const updatedPlates = [...form.getValues("additionalPlates")];
                            updatedPlates[index].plate = e.target.value;
                            form.setValue("additionalPlates", updatedPlates);
                          }}
                          className="flex-grow"
                        />
                        
                        <Select
                          value={plate.type}
                          onValueChange={(value) => {
                            const updatedPlates = [...form.getValues("additionalPlates")];
                            updatedPlates[index].type = value;
                            form.setValue("additionalPlates", updatedPlates);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo de Veículo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tractor_unit">Cavalo</SelectItem>
                            <SelectItem value="semi_trailer">Semirreboque</SelectItem>
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalPlate}
                    className="flex items-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Placa
                  </Button>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="mb-4">
            <Label htmlFor="estados">Estados Solicitados*</Label>
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
                            return checked
                              ? field.onChange([...currentValue, state.code])
                              : field.onChange(
                                  currentValue.filter((value) => value !== state.code)
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {state.name}
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