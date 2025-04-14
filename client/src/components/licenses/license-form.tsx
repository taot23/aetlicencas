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
import { LoaderCircle, X, Plus, Truck } from "lucide-react";
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
          <div className="border border-gray-200 rounded-lg p-6 mx-auto max-w-6xl shadow-sm">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-5">Veículos do Rodotrem</h3>
            
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="tractorUnitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium mb-2 block">Unidade Tratora</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
                </div>
                
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="firstTrailerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium mb-2 block">1ª Carreta</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="dollyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium mb-2 block">Dolly</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
                </div>
                
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="secondTrailerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium mb-2 block">2ª Carreta</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
            </div>
          </div>
        )}

        {/* Dynamic fields for Bitrem */}
        {(licenseType === 'bitrain_9_axles' || licenseType === 'bitrain_7_axles' || licenseType === 'bitrain_6_axles') && (
          <div className="border border-gray-200 rounded-lg p-6 mx-auto max-w-6xl shadow-sm">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-5">Veículos do Bitrem</h3>
            
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="tractorUnitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium mb-2 block">Unidade Tratora</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
                </div>
                
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="firstTrailerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium mb-2 block">1ª Carreta</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
                </div>
              </div>
              
              <div className="mx-auto max-w-md">
                <FormField
                  control={form.control}
                  name="secondTrailerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium mb-2 block">2ª Carreta</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
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
          </div>
        )}

        {/* Dynamic fields for Prancha */}
        {licenseType === 'flatbed' && (
          <div className="border border-gray-200 rounded-lg p-6 mx-auto max-w-6xl shadow-sm">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-5">Veículos da Prancha</h3>
            
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="tractorUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium mb-2 block">Unidade Tratora</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
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
              </div>
              
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="flatbedId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium mb-2 block">Prancha</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
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
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-6 space-y-6 mx-auto max-w-6xl shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 text-xl text-center mb-4">Estados Solicitados</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {brazilianStates.map((state) => (
                <FormField
                  key={state.code}
                  control={form.control}
                  name="states"
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
            name="comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Informações Adicionais</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Informações adicionais para esta solicitação de licença..."
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

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
          
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleSaveDraft}
            disabled={isProcessing}
          >
            {saveAsDraftMutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Rascunho
          </Button>
          
          <Button 
            type="button" 
            onClick={handleSubmitRequest}
            disabled={isProcessing}
          >
            {submitRequestMutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar Solicitação
          </Button>
        </div>
      </form>
    </Form>
  );
}