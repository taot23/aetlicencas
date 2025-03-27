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
} from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoaderCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface LicenseFormProps {
  draft?: LicenseRequest | null;
  onComplete: () => void;
  onCancel: () => void;
}

export function LicenseForm({ draft, onComplete, onCancel }: LicenseFormProps) {
  const { toast } = useToast();
  const [licenseType, setLicenseType] = useState<string>(draft?.type || "");

  // Fetch vehicles for the dropdown selectors
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: draft ? {
      type: draft.type,
      mainVehiclePlate: draft.mainVehiclePlate,
      tractorUnitId: draft.tractorUnitId,
      firstTrailerId: draft.firstTrailerId,
      dollyId: draft.dollyId,
      secondTrailerId: draft.secondTrailerId,
      flatbedId: draft.flatbedId,
      length: draft.length / 100, // Convert from cm to meters for display
      states: draft.states,
      isDraft: draft.isDraft,
    } : {
      type: "",
      mainVehiclePlate: "",
      tractorUnitId: undefined,
      firstTrailerId: undefined,
      dollyId: undefined,
      secondTrailerId: undefined,
      flatbedId: undefined,
      length: 0,
      states: [],
      isDraft: true,
    },
  });

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
      length: Math.round(values.length * 100), // Convert to centimeters
    };
    
    if (values.isDraft) {
      saveAsDraftMutation.mutate(dataToSubmit);
    } else {
      // Remove isDraft from payload when submitting a license request
      const { isDraft, ...requestData } = dataToSubmit;
      submitRequestMutation.mutate(requestData);
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
                              checked={field.value?.includes(state.code)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, state.code])
                                  : field.onChange(field.value?.filter((value) => value !== state.code));
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

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isProcessing}
          >
            {saveAsDraftMutation.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            onClick={handleSubmitRequest}
            disabled={isProcessing}
          >
            {submitRequestMutation.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Pedido
          </Button>
        </div>
      </form>
    </Form>
  );
}
