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
import { Label } from "@/components/ui/label";
import { Loader2, Search, FileText, CheckCircle, XCircle, File, Clock, MapPin } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { LicenseRequest, brazilianStates as brazilianStatesObjects } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Lista simplificada de estados brasileiros para uso como strings
const brazilianStates = ["SP", "MG", "MT", "PE", "TO", "MS", "PR", "ES", "DNIT", "RS", "BA", "PA", "SC", "DF", "MA", "GO", "RJ", "CE", "AL", "SE"];
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
  licenseFile: z.any().optional(),
});

// Schema para atualização de status por estado
const updateStateStatusSchema = z.object({
  state: z.string({
    required_error: "O estado é obrigatório",
  }),
  status: z.string({
    required_error: "O status é obrigatório",
  }),
  comments: z.string().optional(),
});

// Constantes e funções auxiliares para status

export default function AdminLicensesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [licenseDetailsOpen, setLicenseDetailsOpen] = useState(false);
  const [stateStatusDialogOpen, setStateStatusDialogOpen] = useState(false);
  const [selectedState, setSelectedState] = useState("");

  // Form para atualização de status
  const statusForm = useForm<z.infer<typeof updateStatusSchema>>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: "",
      comments: "",
      licenseFile: undefined,
    },
  });
  
  // Form para atualização de status por estado
  const stateStatusForm = useForm<z.infer<typeof updateStateStatusSchema>>({
    resolver: zodResolver(updateStateStatusSchema),
    defaultValues: {
      state: "",
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
      if (data.licenseFile && data.status === "released") {
        formData.append("licenseFile", data.licenseFile);
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
  
  // Atualizar status por estado da licença
  const updateStateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof updateStateStatusSchema> }) => {
      const formData = new FormData();
      formData.append("state", data.state);
      formData.append("status", data.status);
      if (data.comments) {
        formData.append("comments", data.comments);
      }
      
      const response = await apiRequest("PATCH", `/api/admin/licenses/${id}/state-status`, formData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status do estado atualizado",
        description: "Status do estado atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      setStateStatusDialogOpen(false);
      stateStatusForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status do estado",
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
      licenseFile: undefined,
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
  
  const handleStateStatusUpdate = (license: LicenseRequest, state: string) => {
    setSelectedLicense(license);
    setSelectedState(state);
    
    // Determinar o status atual deste estado
    let currentStateStatus = "pending";
    
    // Parse dos stateStatuses (que são armazenados como "ESTADO:STATUS")
    if (license.stateStatuses && license.stateStatuses.length > 0) {
      const stateStatusEntry = license.stateStatuses.find(entry => entry.startsWith(`${state}:`));
      if (stateStatusEntry) {
        const [_, status] = stateStatusEntry.split(':');
        if (status) {
          currentStateStatus = status;
        }
      }
    }
    
    stateStatusForm.reset({
      state: state,
      status: currentStateStatus,
      comments: "",
    });
    
    setStateStatusDialogOpen(true);
  };
  
  const onSubmitStateStatus = (data: z.infer<typeof updateStateStatusSchema>) => {
    if (!selectedLicense) return;
    updateStateStatusMutation.mutate({ 
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

  // Opções de status para o select com descrições detalhadas
  const statusOptions = [
    { value: "pending", label: "Pendente Cadastro", description: "Status inicial do pedido" },
    { value: "in_progress", label: "Cadastro em Andamento", description: "Em fase de edição pelo usuário" },
    { value: "rejected", label: "Reprovado", description: "Com justificativa de pendências" },
    { value: "analyzing", label: "Análise do Órgão", description: "Em avaliação oficial" },
    { value: "pending_release", label: "Pendente Liberação", description: "Aguardando aprovação final" },
    { value: "released", label: "Liberada", description: "Licença aprovada com documento disponível" },
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
                                    Visualizar
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(license)}
                                  >
                                    Editar
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
                                  Visualizar
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleStatusUpdate(license)}
                                >
                                  Editar
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
            <DialogTitle>Editar Status da Licença</DialogTitle>
            <DialogDescription>
              Selecione um novo status para esta licença conforme o fluxo do processo
            </DialogDescription>
          </DialogHeader>
          <Form {...statusForm}>
            <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="font-medium text-sm mb-2">Guia de Fluxo de Status:</h4>
              <ul className="text-sm space-y-1">
                <li><span className="font-semibold">Pendente Cadastro:</span> Status inicial do pedido</li>
                <li><span className="font-semibold">Cadastro em Andamento:</span> Em fase de edição pelo usuário</li>
                <li><span className="font-semibold">Reprovado:</span> Com justificativa de pendências</li>
                <li><span className="font-semibold">Análise do Órgão:</span> Em avaliação oficial</li>
                <li><span className="font-semibold">Pendente Liberação:</span> Aguardando aprovação final</li>
                <li><span className="font-semibold">Liberada:</span> Licença aprovada com documento disponível</li>
              </ul>
            </div>
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
              
              {statusForm.watch("status") === "approved" && (
                <div className="space-y-2">
                  <Label htmlFor="licenseFile">Documento da Licença (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="licenseFile" 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          // Usando a função register para atualizar os valores do formulário para campos personalizados
                          statusForm.setValue("licenseFile" as any, e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Ao selecionar status "Liberada", é necessário anexar o documento da licença
                    que ficará disponível para download pelo cliente.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para atualizar status por estado */}
      <Dialog open={stateStatusDialogOpen} onOpenChange={setStateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Status do Estado {selectedState}</DialogTitle>
            <DialogDescription>
              Atualize as informações da licença para este estado
            </DialogDescription>
          </DialogHeader>
          <Form {...stateStatusForm}>
            <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="font-medium text-sm mb-2">Guia de Fluxo de Status:</h4>
              <ul className="text-sm space-y-1">
                <li><span className="font-semibold">Pendente Cadastro:</span> Status inicial do pedido</li>
                <li><span className="font-semibold">Cadastro em Andamento:</span> Em fase de edição pelo usuário</li>
                <li><span className="font-semibold">Reprovado:</span> Com justificativa de pendências</li>
                <li><span className="font-semibold">Análise do Órgão:</span> Em avaliação oficial</li>
                <li><span className="font-semibold">Pendente Liberação:</span> Aguardando aprovação final</li>
                <li><span className="font-semibold">Liberada:</span> Licença aprovada com documento disponível</li>
              </ul>
            </div>
            <form onSubmit={stateStatusForm.handleSubmit(onSubmitStateStatus)} className="space-y-4">
              <FormField
                control={stateStatusForm.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stateStatusForm.control}
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
                control={stateStatusForm.control}
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
                  disabled={updateStateStatusMutation.isPending}
                >
                  {updateStateStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
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
            <DialogDescription>
              Visualize todos os detalhes da licença
            </DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="font-medium text-sm mb-2">Fluxo de Progresso da Licença:</h4>
                <div className="relative flex items-center justify-between mt-3">
                  {/* Linha de conexão */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gray-200"></div>
                  
                  {/* Etapas */}
                  {statusOptions.map((option, index) => {
                    const isCompleted = 
                      statusOptions.findIndex(opt => opt.value === selectedLicense.status) >= index;
                    const isCurrent = option.value === selectedLicense.status;
                    
                    return (
                      <div key={option.value} className="relative flex flex-col items-center z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center
                          ${isCurrent ? 'bg-blue-500 text-white' : 
                            isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {isCompleted && !isCurrent ? 
                            <CheckCircle className="h-4 w-4" /> : 
                            <span className="text-xs">{index + 1}</span>
                          }
                        </div>
                        <span className="text-xs text-center mt-1 max-w-[60px]">{option.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
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
                    {selectedLicense.additionalPlates && selectedLicense.additionalPlates.length > 0
                      ? selectedLicense.additionalPlates.join(", ")
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

              {/* Status por estado */}
              <div>
                <h3 className="font-medium text-sm text-gray-500">Status por Estado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                  {selectedLicense.states.map((state) => {
                    // Encontrar o status atual deste estado
                    let stateStatus = "pending";
                    if (selectedLicense.stateStatuses && selectedLicense.stateStatuses.length > 0) {
                      const stateStatusEntry = selectedLicense.stateStatuses.find(entry => entry.startsWith(`${state}:`));
                      if (stateStatusEntry) {
                        const [_, status] = stateStatusEntry.split(':');
                        if (status) {
                          stateStatus = status;
                        }
                      }
                    }
                    
                    return (
                      <div key={state} className="border rounded p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{state}</span>
                          <div className="group relative">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stateStatus)}`}>
                              {getStatusLabel(stateStatus)}
                            </span>
                            <div className="invisible group-hover:visible absolute z-50 w-48 p-2 bg-black text-white text-xs rounded shadow-lg right-0 mt-1">
                              {statusOptions.find(opt => opt.value === stateStatus)?.description || 'Status pendente de atualização'}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full mt-1"
                          onClick={() => handleStateStatusUpdate(selectedLicense, state)}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  variant="outline" 
                  onClick={() => setLicenseDetailsOpen(false)}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}