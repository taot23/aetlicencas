import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { format } from "date-fns";
import { UserRound, Plus, Search, UserPlus, Mail, Key } from "lucide-react";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Schema para criar/editar transportadores
const transporterSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  isAdmin: z.boolean().default(false)
});

type TransporterFormValues = z.infer<typeof transporterSchema>;

export default function AdminTransporters() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const form = useForm<TransporterFormValues>({
    resolver: zodResolver(transporterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      isAdmin: false
    }
  });

  // Buscar todos os usuários
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar usuários");
      }
      return res.json();
    }
  });

  // Filtrar usuários com base na busca
  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    
    return (
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Mutação para criar/atualizar transportador
  const saveTransporterMutation = useMutation({
    mutationFn: async (values: TransporterFormValues) => {
      if (selectedUser) {
        // Atualizar usuário existente
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(values),
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Erro ao atualizar transportador");
        }
        
        return await res.json();
      } else {
        // Criar novo usuário
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(values),
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Erro ao criar transportador");
        }
        
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      resetForm();
      
      toast({
        title: selectedUser ? "Transportador atualizado" : "Transportador criado",
        description: selectedUser 
          ? "Os dados do transportador foram atualizados com sucesso." 
          : "Novo transportador cadastrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o transportador",
        variant: "destructive",
      });
    }
  });

  // Mutação para excluir transportador
  const deleteTransporterMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao excluir transportador");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      toast({
        title: "Transportador excluído",
        description: "O transportador foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir o transportador",
        variant: "destructive",
      });
    }
  });

  const openCreateDialog = () => {
    setSelectedUser(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    form.reset({
      fullName: user.fullName,
      email: user.email,
      password: "",
      isAdmin: user.isAdmin || false
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    form.reset({
      fullName: "",
      email: "",
      password: "",
      isAdmin: false
    });
  };

  const onSubmit = (values: TransporterFormValues) => {
    if (!values.password && !selectedUser) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, informe uma senha para o novo transportador",
        variant: "destructive",
      });
      return;
    }
    
    // Se estiver editando e o campo de senha estiver vazio, remova-o
    if (selectedUser && !values.password) {
      const { password, ...rest } = values;
      saveTransporterMutation.mutate(rest as TransporterFormValues);
    } else {
      saveTransporterMutation.mutate(values);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cadastro de Transportadores</h1>
        <p className="text-gray-600">Gerenciamento de transportadores do sistema</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="bg-gray-50 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transportadores</CardTitle>
              <CardDescription>Cadastre e gerencie transportadores do sistema</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Transportador
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Carregando transportadores...</p>
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <>
              {/* Versão para desktop */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.isAdmin ? "Sim" : "Não"}</TableCell>
                        <TableCell>
                          {user.createdAt && format(new Date(user.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDialog(user)}
                            className="mr-2"
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm("Tem certeza que deseja excluir este transportador?")) {
                                deleteTransporterMutation.mutate(user.id);
                              }
                            }}
                          >
                            Excluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Versão para mobile (cards) */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="mb-2">
                    <CardContent className="pt-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-lg">{user.fullName}</h3>
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex justify-between text-sm my-1">
                          <span className="text-gray-600">Admin: {user.isAdmin ? "Sim" : "Não"}</span>
                          <span className="text-gray-600">
                            {user.createdAt && format(new Date(user.createdAt), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-end space-x-2 mt-2 pt-2 border-t border-gray-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDialog(user)}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm("Tem certeza que deseja excluir este transportador?")) {
                                deleteTransporterMutation.mutate(user.id);
                              }
                            }}
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <UserRound className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchQuery ? "Nenhum transportador encontrado com os filtros aplicados." : "Nenhum transportador cadastrado."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar transportador */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Editar Transportador" : "Novo Transportador"}</DialogTitle>
            <DialogDescription>
              {selectedUser 
                ? "Altere os dados do transportador abaixo." 
                : "Preencha os dados para cadastrar um novo transportador."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="Nome do transportador" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="email@exemplo.com" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedUser ? "Nova Senha (opcional)" : "Senha"}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          type="password" 
                          placeholder={selectedUser ? "Deixe em branco para manter a senha atual" : "Senha segura"} 
                          className="pl-10" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Permissão de Administrador
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Este usuário terá acesso ao painel administrativo
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={saveTransporterMutation.isPending}
                >
                  {saveTransporterMutation.isPending 
                    ? "Salvando..." 
                    : selectedUser ? "Atualizar" : "Cadastrar"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}