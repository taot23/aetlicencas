import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertVehicleSchema, vehicleTypeOptions, Vehicle } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LoaderCircle, UploadCloud } from "lucide-react";
import { getVehicleTypeLabel } from "@/lib/utils";

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  
  // Extend the schema to handle file upload
  const formSchema = insertVehicleSchema.extend({
    tare: z.coerce.number().min(1, "O peso deve ser maior que zero"),
    crlvYear: z.coerce.number().min(1990, "O ano deve ser posterior a 1990"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: vehicle ? {
      plate: vehicle.plate,
      type: vehicle.type,
      tare: vehicle.tare,
      crlvYear: vehicle.crlvYear,
    } : {
      plate: "",
      type: "tractor_unit", // Valor padrão para o tipo (Unidade Tratora)
      tare: 0,
      crlvYear: new Date().getFullYear(),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Veículo cadastrado",
        description: "O veículo foi cadastrado com sucesso",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cadastrar o veículo",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Semelhante ao método para novo veículo
      const res = await apiRequest("PATCH", `/api/vehicles/${vehicle?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Veículo atualizado",
        description: "O veículo foi atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o veículo",
        variant: "destructive",
      });
    },
  });
  
  const createWithoutFileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Veículo cadastrado",
        description: "O veículo foi cadastrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cadastrar o veículo",
        variant: "destructive",
      });
    },
  });
  
  const updateWithoutFileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${vehicle?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Veículo atualizado", 
        description: "O veículo foi atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o veículo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (file) {
      // Se tiver arquivo, usar FormData
      const formData = new FormData();
      
      const vehicleData = {
        plate: values.plate.toUpperCase(),
        type: values.type,
        tare: Number(values.tare),
        crlvYear: Number(values.crlvYear)
      };
      
      // Para veículos sem arquivo, enviar diretamente como JSON
      formData.append("plate", vehicleData.plate);
      formData.append("type", vehicleData.type);
      formData.append("tare", vehicleData.tare.toString());
      formData.append("crlvYear", vehicleData.crlvYear.toString());
      formData.append("crlvFile", file);
      
      console.log("Sending vehicle data with file:", vehicleData);
      
      if (vehicle) {
        updateMutation.mutate(formData);
      } else {
        createMutation.mutate(formData);
      }
    } else {
      // Se não tiver arquivo, enviar diretamente como JSON
      const vehicleData = {
        plate: values.plate.toUpperCase(),
        type: values.type,
        tare: Number(values.tare),
        crlvYear: Number(values.crlvYear)
      };
      
      console.log("Sending vehicle data as JSON:", vehicleData);
      
      if (vehicle) {
        updateWithoutFileMutation.mutate(vehicleData);
      } else {
        createWithoutFileMutation.mutate(vehicleData);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || 
    createWithoutFileMutation.isPending || updateWithoutFileMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="plate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placa do Veículo</FormLabel>
              <FormControl>
                <Input placeholder="ABC1D23" {...field} />
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
              <FormLabel>Tipo de Veículo</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vehicleTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="tare"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tara (peso em kg)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="8500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="crlvYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ano do CRLV</FormLabel>
              <FormControl>
                <Input type="number" placeholder="2023" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
          <FormLabel htmlFor="crlvFile">Upload do CRLV (PDF/imagem)</FormLabel>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="crlvFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                >
                  <span>Carregar arquivo</span>
                  <input
                    id="crlvFile"
                    name="crlvFile"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG até 10MB
              </p>
              {file && (
                <p className="text-sm text-green-600">
                  Arquivo selecionado: {file.name}
                </p>
              )}
              {vehicle?.crlvUrl && !file && (
                <p className="text-sm text-blue-600">
                  <a href={vehicle.crlvUrl} target="_blank" rel="noopener noreferrer">
                    Visualizar CRLV atual
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {vehicle ? "Atualizar" : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
