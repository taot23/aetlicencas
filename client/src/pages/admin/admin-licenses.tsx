import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, CheckCircle, XCircle, File, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LicenseRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema para atualização de status
const updateStatusSchema = z.object({
  status: z.string({
    required_error: "O status é obrigatório",
  }),
  comments: z.string().optional(),
});

export default function AdminLicensesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [licenseDetailsOpen, setLicenseDetailsOpen] = useState(false);

  // Form para atualização de status
  const statusForm = useForm<z.infer<typeof updateStatusSchema>>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: "",
      comments: "",
    },
  });

  // Buscar todas as licenças
  const { data: licenses = [], isLoading } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/admin/licenses"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Atualizar status da licença
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof updateStatusSchema> }) => {
      const formData = new FormData();
      formData.append("status", data.status);
      if (data.comments) {
        formData.append("comments", data.comments);
      }
      
      const response = await apiRequest("PATCH", `/api/admin/licenses/${id}/status`, formData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "Status da licença atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      setStatusDialogOpen(false);
      statusForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrar licenças por termo de busca e por status
  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = 
      license.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.mainVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeStatus === "all") return matchesSearch;
    return matchesSearch && license.status === activeStatus;
  });

  const handleStatusUpdate = (license: LicenseRequest) => {
    setSelectedLicense(license);
    statusForm.reset({
      status: license.status,
      comments: "",
    });
    setStatusDialogOpen(true);
  };

  const handleViewDetails = (license: LicenseRequest) => {
    setSelectedLicense(license);
    setLicenseDetailsOpen(true);
  };

  const onSubmitStatus = (data: z.infer<typeof updateStatusSchema>) => {
    if (!selectedLicense) return;
    updateStatusMutation.mutate({ 
      id: selectedLicense.id,
      data
    });
  };

  // Formatar data com tratamento de erros
  const formatDate = (dateString: string | Date | undefined | null) => {
    try {
      if (!dateString) {
        return "Data não disponível";
      }
      
      let date;
      if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else {
        date = dateString;
      }
      
      if (!date || isNaN(date.getTime())) {
        return "Data inválida";
      }
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data indisponível";
    }
  };

  // Obter a cor do badge baseada no status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "analyzing":
        return "bg-purple-100 text-purple-800";
      case "pending_release":
        return "bg-amber-100 text-amber-800";
      case "released":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Obter o label do status em português
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "pending":
        return "Pendente Cadastro";
      case "in_progress":
        return "Cadastro em Andamento";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Reprovado";
      case "analyzing":
        return "Análise do Órgão";
      case "pending_release":
        return "Pendente Liberação";
      case "released":
        return "Liberada";
      default:
        return status;
    }
  };

  // Opções de status para o select
  const statusOptions = [
    { value: "pending", label: "Pendente Cadastro" },
    { value: "in_progress", label: "Cadastro em Andamento" },
    { value: "approved", label: "Aprovado" },
    { value: "rejected", label: "Reprovado" },
    { value: "analyzing", label: "Análise do Órgão" },
    { value: "pending_release", label: "Pendente Liberação" },
    { value: "released", label: "Liberada" },
  ];

  // Obter o ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600 mr-1" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-600 mr-1" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600 mr-1" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600 mr-1" />;
      case "analyzing":
        return <FileText className="h-4 w-4 text-purple-600 mr-1" />;
      case "pending_release":
        return <File className="h-4 w-4 text-amber-600 mr-1" />;
      case "released":
        return <CheckCircle className="h-4 w-4 text-emerald-600 mr-1" />;
      default:
        return <File className="h-4 w-4 mr-1" />;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Licenças</h1>
            <p className="text-muted-foreground">
              Gerencie todas as licenças no sistema.
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar por AET ou placa..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Tabs defaultValue="all" value={activeStatus} onValueChange={setActiveStatus}>
                  <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    {statusOptions.map((option) => (
                      <TabsTrigger key={option.value} value={option.value}>
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-60">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Visão Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº Solicitação</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Veículo Principal</TableHead>
                          <TableHead>Estados</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data de Solicitação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLicenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6">
                              Nenhuma licença encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredLicenses.map((license) => (
                            <TableRow key={license.id}>
                              <TableCell className="font-medium">{license.requestNumber}</TableCell>
                              <TableCell>
                                {license.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                                {license.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                                {license.type === "rodotrain" && "Rodotrem"}
                                {license.type === "flatbed" && "Prancha"}
                              </TableCell>
                              <TableCell>{license.mainVehiclePlate}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {license.states.map((state, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {state}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {getStatusIcon(license.status)}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                                    {getStatusLabel(license.status)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(license.createdAt)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(license)}
                                  >
                                    Ver detalhes
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(license)}
                                  >
                                    Atualizar status
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Visão Mobile (Cards) */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {filteredLicenses.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        Nenhuma licença encontrada
                      </div>
                    ) : (
                      filteredLicenses.map((license) => (
                        <Card key={license.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium text-lg">{license.requestNumber}</h3>
                                  <p className="text-sm text-gray-500">
                                    {license.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                                    {license.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                                    {license.type === "rodotrain" && "Rodotrem"}
                                    {license.type === "flatbed" && "Prancha"}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  {getStatusIcon(license.status)}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                                    {getStatusLabel(license.status)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-2">
                                <p className="text-sm"><span className="font-medium">Veículo:</span> {license.mainVehiclePlate}</p>
                                <p className="text-sm"><span className="font-medium">Data:</span> {formatDate(license.createdAt)}</p>
                                <div className="mt-1">
                                  <span className="text-sm font-medium">Estados:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {license.states.map((state, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {state}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleViewDetails(license)}
                                >
                                  Ver detalhes
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleStatusUpdate(license)}
                                >
                                  Atualizar status
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo para atualizar status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
          </DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={statusForm.handleSubmit(onSubmitStatus)} className="space-y-4">
              <FormField
                control={statusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
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
                control={statusForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentários (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adicione comentários sobre a atualização do status" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Atualizar Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver detalhes da licença */}
      <Dialog open={licenseDetailsOpen} onOpenChange={setLicenseDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Licença</DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Nº da Solicitação</h3>
                  <p className="font-medium">{selectedLicense.requestNumber}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Status</h3>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(selectedLicense.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLicense.status)}`}>
                      {getStatusLabel(selectedLicense.status)}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Tipo de Licença</h3>
                  <p>
                    {selectedLicense.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                    {selectedLicense.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                    {selectedLicense.type === "rodotrain" && "Rodotrem"}
                    {selectedLicense.type === "flatbed" && "Prancha"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Data de Solicitação</h3>
                  <p>{formatDate(selectedLicense.createdAt)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Veículo Principal</h3>
                  <p>{selectedLicense.mainVehiclePlate}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Veículos Adicionais</h3>
                  <p>
                    {selectedLicense.additionalVehiclePlates && selectedLicense.additionalVehiclePlates.length > 0
                      ? selectedLicense.additionalVehiclePlates.join(", ")
                      : "Nenhum veículo adicional"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-gray-500">Estados</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedLicense.states.map((state, idx) => (
                    <Badge key={idx} variant="outline">
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedLicense.stateStatus && (
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Status por Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                    {Object.entries(selectedLicense.stateStatus).map(([state, status]) => (
                      <div key={state} className="border rounded p-2 flex items-center justify-between">
                        <span className="font-medium">{state}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status as string)}`}>
                          {getStatusLabel(status as string)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLicense.comments && (
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Comentários</h3>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded border">
                    {selectedLicense.comments}
                  </p>
                </div>
              )}

              {selectedLicense.licenseFileUrl && (
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Documento da Licença</h3>
                  <a 
                    href={selectedLicense.licenseFileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-1 text-blue-600 hover:text-blue-800"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Ver documento
                  </a>
                </div>
              )}

              <DialogFooter>
                <Button 
                  variant="default" 
                  onClick={() => handleStatusUpdate(selectedLicense)}
                >
                  Atualizar Status
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}