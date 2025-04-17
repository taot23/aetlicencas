import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertVehicleSchema, Vehicle } from "@shared/schema";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Constante para tipos de veículos
const VEHICLE_TYPES = {
  tractor: "Unidade Tratora (Cavalo)",
  semi_trailer: "Semirreboque",
  trailer: "Reboque",
  dolly: "Dolly",
  flatbed: "Prancha"
};

// Esquema estendido para validação do formulário
const formSchema = insertVehicleSchema.extend({
  plate: z.string()
    .min(1, "A placa é obrigatória")
    .refine(
      (value) => /^[A-Za-z]{3}\d[A-Za-z0-9]\d{2}$/.test(value.toUpperCase()), 
      { message: "Formato de placa inválido. Use o formato Mercosul (AAA1A11) ou antigo (AAA1111)." }
    )
});

type VehicleFormValues = z.infer<typeof formSchema>;

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (vehicle: Vehicle) => void;
  plateToEdit?: string;
}

export function VehicleFormModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  plateToEdit 
}: VehicleFormModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Buscar veículo caso esteja editando
  const { 
    data: existingVehicle,
    isLoading: isLoadingVehicle 
  } = useQuery<Vehicle | undefined>({
    queryKey: ['/api/vehicles/by-plate', plateToEdit],
    queryFn: async () => {
      if (!plateToEdit) return undefined;
      try {
        const res = await apiRequest('GET', `/api/vehicles/by-plate/${plateToEdit}`);
        return await res.json();
      } catch (error) {
        return undefined; // Placa não encontrada, será um novo cadastro
      }
    },
    enabled: !!plateToEdit
  });
  
  // Formulário
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plate: plateToEdit ? plateToEdit.toUpperCase() : '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      type: 'tractor',
      renavam: '',
    }
  });
  
  // Atualizar formulário quando carregar dados do veículo
  useEffect(() => {
    if (existingVehicle) {
      form.reset({
        plate: existingVehicle.plate,
        brand: existingVehicle.brand || '',
        model: existingVehicle.model || '',
        year: existingVehicle.year || new Date().getFullYear(),
        type: existingVehicle.type,
        renavam: existingVehicle.renavam || '',
      });
    }
  }, [existingVehicle, form]);
  
  // Mutação para salvar o veículo
  const saveMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      const endpoint = existingVehicle 
        ? `/api/vehicles/${existingVehicle.id}` 
        : '/api/vehicles';
        
      const method = existingVehicle ? 'PATCH' : 'POST';
      
      const res = await apiRequest(method, endpoint, data);
      return await res.json();
    },
    onSuccess: (savedVehicle: Vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({
        title: existingVehicle ? "Veículo atualizado" : "Veículo cadastrado",
        description: `Placa ${savedVehicle.plate} ${existingVehicle ? 'atualizada' : 'cadastrada'} com sucesso!`,
      });
      if (onSuccess) {
        onSuccess(savedVehicle);
      }
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Não foi possível ${existingVehicle ? 'atualizar' : 'cadastrar'} o veículo: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  const onSubmit = (data: VehicleFormValues) => {
    setIsSaving(true);
    // Converte a placa para maiúsculas antes de salvar
    saveMutation.mutate({
      ...data,
      plate: data.plate.toUpperCase()
    });
  };
  
  // Mapear tipos de veículo para labels em português
  // Usar a constante global
  const vehicleTypeLabels = VEHICLE_TYPES;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {existingVehicle ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
          </DialogTitle>
          <DialogDescription>
            {existingVehicle 
              ? `Editando veículo com placa ${existingVehicle.plate}`
              : plateToEdit 
                ? `Cadastrando novo veículo com placa ${plateToEdit}`
                : 'Preencha os dados do veículo para cadastrá-lo'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      maxLength={7}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={!!existingVehicle} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1950"
                        max={new Date().getFullYear() + 1}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="renavam"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RENAVAM (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSaving || isLoadingVehicle}
              >
                {isSaving 
                  ? 'Salvando...' 
                  : existingVehicle 
                    ? 'Atualizar Veículo' 
                    : 'Cadastrar Veículo'
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}