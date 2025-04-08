import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transporter } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

// Form schema customizado para validação do formulário de transportador
const transporterFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  documentNumber: z.string().min(11, "CPF/CNPJ deve ter pelo menos 11 dígitos"),
  contact1Name: z.string().min(1, "Nome do contato principal é obrigatório"),
  contact1Phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  contact2Name: z.string().optional(),
  contact2Phone: z.string().optional(),
  email: z.string().email("Email inválido"),
  userId: z.string().optional(),
});

type TransporterFormValues = z.infer<typeof transporterFormSchema>;

interface TransporterFormProps {
  transporter?: Transporter;
  onSuccess?: () => void;
}

export function TransporterForm({ transporter, onSuccess }: TransporterFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    transporter?.userId ? String(transporter.userId) : undefined
  );

  // Obter a lista de usuários não-admin para vinculação
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/non-admin-users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/non-admin-users");
      return await response.json();
    },
  });

  // Form para criar/editar transportador
  const form = useForm<TransporterFormValues>({
    resolver: zodResolver(transporterFormSchema),
    defaultValues: {
      name: transporter?.name || "",
      documentNumber: transporter?.documentNumber || "",
      contact1Name: transporter?.contact1Name || "",
      contact1Phone: transporter?.contact1Phone || "",
      contact2Name: transporter?.contact2Name || "",
      contact2Phone: transporter?.contact2Phone || "",
      email: transporter?.email || "",
      userId: transporter?.userId ? String(transporter.userId) : undefined,
    },
  });

  // Efeito para atualizar o campo userId quando selectedUser mudar
  useEffect(() => {
    form.setValue("userId", selectedUser);
  }, [selectedUser, form]);

  // Mutação para criar transportador
  const createTransporterMutation = useMutation({
    mutationFn: async (data: TransporterFormValues) => {
      // Converter userId de string para número (ou undefined se não selecionado)
      const payload = {
        ...data,
        userId: data.userId && data.userId !== "none" ? parseInt(data.userId) : undefined,
      };
      
      const response = await apiRequest("POST", "/api/admin/transporters", payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transportador criado",
        description: "O transportador foi cadastrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar transportador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutação para atualizar transportador
  const updateTransporterMutation = useMutation({
    mutationFn: async (data: TransporterFormValues) => {
      if (!transporter) throw new Error("Transportador não encontrado");
      
      // Converter userId de string para número (ou null se não selecionado)
      const payload = {
        ...data,
        userId: data.userId && data.userId !== "none" ? parseInt(data.userId) : null,
      };
      
      const response = await apiRequest("PATCH", `/api/admin/transporters/${transporter.id}`, payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transportador atualizado",
        description: "O transportador foi atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar transportador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: TransporterFormValues) => {
    if (transporter) {
      updateTransporterMutation.mutate(data);
    } else {
      createTransporterMutation.mutate(data);
    }
  };

  const isPending = createTransporterMutation.isPending || updateTransporterMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome/Razão Social</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo/Razão social" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="documentNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF/CNPJ</FormLabel>
                <FormControl>
                  <Input placeholder="Somente números" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact1Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contato Principal</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do contato principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact1Phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone do Contato Principal</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact2Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contato Secundário (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do contato secundário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact2Phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone do Contato Secundário (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuário Vinculado (opcional)</FormLabel>
                <Select
                  value={selectedUser}
                  onValueChange={(value) => setSelectedUser(value)}
                  disabled={isLoadingUsers}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        ID: {user.id} - {user.fullName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Processando...</span>
              </>
            ) : transporter ? (
              "Atualizar Transportador"
            ) : (
              "Cadastrar Transportador"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}