import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transporter } from "@shared/schema";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransporterForm } from "@/components/admin/transporter-form";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, MoreVertical, Edit, Trash, Link as LinkIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminTransporters() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [selectedUserIdForLink, setSelectedUserIdForLink] = useState<string>("");

  // Fetch transporters
  const { data: transporters = [], isLoading } = useQuery({
    queryKey: ["/api/admin/transporters"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/transporters");
      return await response.json();
    }
  });

  // Fetch non-admin users for linking
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/non-admin-users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/non-admin-users");
      return await response.json();
    }
  });

  // Delete transporter mutation
  const deleteTransporterMutation = useMutation({
    mutationFn: async (transporterId: number) => {
      await apiRequest("DELETE", `/api/admin/transporters/${transporterId}`);
    },
    onSuccess: () => {
      toast({
        title: "Transportador excluído",
        description: "O transportador foi excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir transportador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Link transporter to user mutation
  const linkTransporterMutation = useMutation({
    mutationFn: async ({ transporterId, userId }: { transporterId: number, userId: string }) => {
      if (!userId) throw new Error("Nenhum usuário selecionado");
      const response = await apiRequest("POST", `/api/admin/transporters/${transporterId}/link`, { userId: parseInt(userId) });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transportador vinculado",
        description: "O transportador foi vinculado ao usuário com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
      setIsLinkDialogOpen(false);
      setSelectedTransporter(null);
      setSelectedUserIdForLink("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao vincular transportador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleEditTransporter = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTransporter = (transporterId: number) => {
    if (confirm("Tem certeza que deseja excluir este transportador?")) {
      deleteTransporterMutation.mutate(transporterId);
    }
  };

  const handleLinkTransporter = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setSelectedUserIdForLink(transporter.userId ? String(transporter.userId) : "");
    setIsLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (selectedTransporter) {
      linkTransporterMutation.mutate({ 
        transporterId: selectedTransporter.id, 
        userId: selectedUserIdForLink 
      });
    }
  };

  const renderTransportersList = () => {
    if (isLoading) {
      return <SkeletonTable columns={5} rows={5} />;
    }

    if (transporters.length === 0) {
      return (
        <Alert className="my-4">
          <AlertDescription>
            Nenhum transportador cadastrado. Clique no botão "Novo" para adicionar.
          </AlertDescription>
        </Alert>
      );
    }

    if (isMobile) {
      return (
        <div className="space-y-4">
          {transporters.map((transporter: Transporter) => (
            <Card key={transporter.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-medium">{transporter.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTransporter(transporter)}>
                        <Edit size={16} className="mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleLinkTransporter(transporter)}>
                        <LinkIcon size={16} className="mr-2" />
                        Vincular Usuário
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTransporter(transporter.id)} className="text-red-600">
                        <Trash size={16} className="mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">CPF/CNPJ:</span>
                    <span className="text-sm font-medium">{transporter.documentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email:</span>
                    <span className="text-sm">{transporter.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Contato:</span>
                    <span className="text-sm">{transporter.contact1Name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Usuário:</span>
                    <span className="text-sm">
                      {transporter.userId ? "Vinculado" : "Não vinculado"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome/Razão Social</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Contato Principal</TableHead>
            <TableHead>Usuário Vinculado</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transporters.map((transporter: Transporter) => (
            <TableRow key={transporter.id}>
              <TableCell className="font-medium">{transporter.name}</TableCell>
              <TableCell>{transporter.documentNumber}</TableCell>
              <TableCell>{transporter.email}</TableCell>
              <TableCell>{transporter.contact1Name}</TableCell>
              <TableCell>
                {transporter.userId ? "Vinculado" : "Não vinculado"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTransporter(transporter)}>
                      <Edit size={16} className="mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLinkTransporter(transporter)}>
                      <LinkIcon size={16} className="mr-2" />
                      Vincular Usuário
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteTransporter(transporter.id)} className="text-red-600">
                      <Trash size={16} className="mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cadastro Transportador</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={16} className="mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Novo Transportador</DialogTitle>
              </DialogHeader>
              <TransporterForm 
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de transportadores */}
        {renderTransportersList()}

        {/* Modal de edição de transportador */}
        {selectedTransporter && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Editar Transportador</DialogTitle>
              </DialogHeader>
              <TransporterForm 
                transporter={selectedTransporter} 
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  setSelectedTransporter(null);
                }} 
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Modal para vincular transportador a usuário */}
        {selectedTransporter && (
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular Transportador a Usuário</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="mb-4">
                  Transportador: <strong>{selectedTransporter.name}</strong>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Selecione um usuário
                  </label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={selectedUserIdForLink}
                    onChange={(e) => setSelectedUserIdForLink(e.target.value)}
                  >
                    <option value="">Nenhum (remover vínculo)</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleLinkSubmit}
                    disabled={linkTransporterMutation.isPending}
                  >
                    {linkTransporterMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Processando...</span>
                      </>
                    ) : (
                      "Vincular Usuário"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}