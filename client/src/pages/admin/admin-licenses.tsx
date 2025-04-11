import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { getLicenseTypeLabel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, FileText, CheckCircle, XCircle, File, Clock, MapPin, X, UploadCloud, Pencil, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/licenses/status-badge";
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
import { TransporterInfo } from "@/components/transporters/transporter-info";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
  validUntil: z.string().optional(),
  aetNumber: z.string().optional(),
  licenseFile: z
    .any()
    .optional()
    .refine(
      (file) => {
        if (!file) return true;
        return file && typeof file === 'object' && 'type' in file && 
          file.type === "application/pdf";
      },
      {
        message: "Apenas arquivos PDF são permitidos para a licença",
      }
    ),
}).superRefine((data, ctx) => {
  // Se o status for "approved", validade é obrigatória
  if (data.status === "approved" && !data.validUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A data de validade é obrigatória quando o status é Liberada",
      path: ["validUntil"]
    });
  }
  
  // Se o status for "under_review" ou "pending_approval", número da AET é obrigatório
  if ((data.status === "under_review" || data.status === "pending_approval") && !data.aetNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `O número da AET é obrigatório quando o status é ${data.status === "under_review" ? "Análise do Órgão" : "Pendente Liberação"}`,
      path: ["aetNumber"]
    });
  }
  
  // Para o status "approved", o número da AET deve ser informado apenas se não houver um número anterior
  if (data.status === "approved" && !data.aetNumber) {
    // Não vamos adicionar o erro aqui, pois o backend vai buscar o valor do status anterior
    // Mas podemos melhorar isso com validação do lado do cliente se necessário
  }
});

// Constantes e funções auxiliares para status

export default function AdminLicensesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transporterFilter, setTransporterFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const [licenseDetailsOpen, setLicenseDetailsOpen] = useState(false);
  const [stateStatusDialogOpen, setStateStatusDialogOpen] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [location] = useLocation();
  
  // Verificar se estamos na rota de gerenciar-licencas (staff) ou admin
  const isStaffRoute = location.includes('gerenciar-licencas');
  const apiEndpoint = isStaffRoute ? '/api/staff/licenses' : '/api/admin/licenses';

  // Form removido para atualização de status geral
  
  // Form para atualização de status por estado
  const stateStatusForm = useForm<z.infer<typeof updateStateStatusSchema>>({
    resolver: zodResolver(updateStateStatusSchema),
    defaultValues: {
      state: "",
      status: "",
      comments: "",
      aetNumber: "", // Adicionar campo para número da AET
    },
  });

  // Buscar todas as licenças
  const { data: licenses = [], isLoading } = useQuery<LicenseRequest[]>({
    queryKey: [apiEndpoint],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Mutação para atualização de status geral foi removida - agora só usamos atualização por estado
  
  // Atualizar status por estado da licença
  const updateStateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof updateStateStatusSchema> }) => {
      const formData = new FormData();
      formData.append("state", data.state);
      formData.append("status", data.status);
      if (data.comments) {
        formData.append("comments", data.comments);
      }
      
      // Incluir data de validade se o status for "approved" (Liberada)
      if (data.validUntil && data.status === "approved") {
        formData.append("validUntil", data.validUntil);
      }
      
      // Incluir arquivo da licença se o status for "approved" (Liberada)
      if (data.licenseFile && data.status === "approved") {
        formData.append("stateFile", data.licenseFile);
      }
      
      // Incluir número da AET se o status for "under_review" (Análise do Órgão), "pending_approval" (Pendente Liberação) ou "approved" (Liberada)
      if (data.aetNumber && (data.status === "under_review" || data.status === "pending_approval" || data.status === "approved")) {
        formData.append("aetNumber", data.aetNumber);
      }
      
      const response = await apiRequest("PATCH", `/api/admin/licenses/${id}/state-status`, formData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status do estado atualizado",
        description: "Status do estado atualizado com sucesso!",
      });
      // Invalidar as queries para manter a consistência
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
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

  // Filtrar licenças com critérios múltiplos
  const filteredLicenses = licenses.filter(license => {
    // Filtro de busca (número do pedido, placa ou transportador)
    const matchesSearch = !searchTerm || 
      license.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.mainVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de status
    const matchesStatus = !statusFilter || statusFilter === "all" || license.status === statusFilter;
    
    // Filtro de transportador
    const matchesTransporter = !transporterFilter || transporterFilter === "all" || (
      license.transporterId != null && license.transporterId.toString() === transporterFilter
    );
    
    // Filtro de data
    let matchesDate = true;
    if (dateFilter) {
      const requestDate = license.createdAt ? new Date(license.createdAt) : null;
      const filterDate = new Date(dateFilter);
      
      if (requestDate) {
        // Comparar apenas ano, mês e dia
        matchesDate = 
          requestDate.getFullYear() === filterDate.getFullYear() &&
          requestDate.getMonth() === filterDate.getMonth() &&
          requestDate.getDate() === filterDate.getDate();
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesTransporter && matchesDate;
  });

  // Função removida pois o status agora só será editado por estado individual

  const handleViewDetails = (license: LicenseRequest) => {
    setSelectedLicense(license);
    setLicenseDetailsOpen(true);
  };

  // Função removida pois o status agora só é editado por estado individual
  
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
      aetNumber: "", // Resetar também o campo de número da AET
    });
    
    setStateStatusDialogOpen(true);
  };
  
  const onSubmitStateStatus = (data: z.infer<typeof updateStateStatusSchema>) => {
    if (!selectedLicense) return;
    
    // Validação adicional para o status "approved": exigir arquivo PDF e data de validade
    if (data.status === "approved") {
      if (!data.licenseFile) {
        toast({
          title: "Erro de validação",
          description: "Para o status 'Liberada' é obrigatório anexar um documento PDF da licença.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.validUntil) {
        toast({
          title: "Erro de validação",
          description: "Para o status 'Liberada' é obrigatório definir uma data de validade.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validação adicional para o status "under_review" ou "pending_approval": exigir número da AET
    if (data.status === "under_review" || data.status === "pending_approval") {
      if (!data.aetNumber) {
        toast({
          title: "Erro de validação",
          description: `Para o status '${data.status === "under_review" ? "Análise do Órgão" : "Pendente Liberação"}' é obrigatório informar o número da AET.`,
          variant: "destructive",
        });
        return;
      }
    }
    
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
      case "canceled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Obter o label do status em português
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "pending":
      case "pending_registration":
        return "Pedido em Cadastramento";
      case "in_progress":
      case "registration_in_progress":
        return "Cadastro em Andamento";
      case "approved":
        return "Liberada";
      case "rejected":
        return "Reprovado";
      case "analyzing":
      case "under_review":
        return "Análise do Órgão";
      case "pending_release":
      case "pending_approval":
        return "Pendente Liberação";
      case "released":
        return "Liberada";
      case "canceled":
        return "Cancelado";
      default:
        return status;
    }
  };
  


  // Opções de status para o select com descrições detalhadas
  const statusOptions = [
    { value: "pending_registration", label: "Pedido em Cadastramento", description: "Status inicial do pedido" },
    { value: "registration_in_progress", label: "Cadastro em Andamento", description: "Em fase de edição pelo usuário" },
    { value: "rejected", label: "Reprovado", description: "Com justificativa de pendências" },
    { value: "under_review", label: "Análise do Órgão", description: "Em avaliação oficial" },
    { value: "pending_approval", label: "Pendente Liberação", description: "Aguardando aprovação final" },
    { value: "approved", label: "Liberada", description: "Licença aprovada com documento disponível" },
    { value: "canceled", label: "Cancelado", description: "Licença cancelada pelo cliente ou pelo sistema" },
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
      case "canceled":
        return <X className="h-4 w-4 text-gray-600 mr-1" />;
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
              {/* Novo layout de pesquisa conforme mockup, similar ao da página "Acompanhar Licença" */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="license-search">Pesquisar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="license-search"
                        placeholder="Nº do pedido ou placa..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                              {getStatusIcon(option.value)}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="date-filter">Data</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="md:col-span-3">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="transporter-filter">Transportador</Label>
                    <Select value={transporterFilter} onValueChange={setTransporterFilter}>
                      <SelectTrigger id="transporter-filter">
                        <SelectValue placeholder="Todos os transportadores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os transportadores</SelectItem>
                        {/* Aqui seria ideal ter uma lista de transportadores para selecionar */}
                        {/* Como é um exemplo, adicionamos alguns valores genéricos */}
                        <SelectItem value="1">Transportadora ABC Ltda</SelectItem>
                        <SelectItem value="2">Transportes XYZ S.A.</SelectItem>
                        <SelectItem value="3">Logística Express Ltda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                                {getLicenseTypeLabel(license.type)}
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
                                  <StatusBadge status={license.status} />
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
                                    {getLicenseTypeLabel(license.type)}
                                  </p>
                                </div>
                                <StatusBadge status={license.status} />
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

                              <div className="flex justify-center mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(license)}
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

      {/* O diálogo para atualizar status foi removido pois o status agora só é editado por estado individual */}

      {/* Diálogo para atualizar status por estado */}
      <Dialog open={stateStatusDialogOpen} onOpenChange={setStateStatusDialogOpen}>
        <DialogContent className="w-full max-w-md mx-auto overflow-y-auto max-h-[90vh]">
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
                <li><span className="font-semibold">Pedido em Cadastramento:</span> Status inicial do pedido</li>
                <li><span className="font-semibold">Cadastro em Andamento:</span> Em fase de edição pelo usuário</li>
                <li><span className="font-semibold">Reprovado:</span> Com justificativa de pendências</li>
                <li><span className="font-semibold">Análise do Órgão:</span> Em avaliação oficial</li>
                <li><span className="font-semibold">Pendente Liberação:</span> Aguardando aprovação final</li>
                <li><span className="font-semibold">Liberada:</span> Licença aprovada com documento disponível</li>
                <li><span className="font-semibold">Cancelado:</span> Licença cancelada pelo cliente ou pelo sistema</li>
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
              
              {/* Campo para Número de AET quando status for Análise do Órgão, Pendente Liberação ou Liberada */}
              {(stateStatusForm.watch("status") === "under_review" || 
                stateStatusForm.watch("status") === "pending_approval" || 
                stateStatusForm.watch("status") === "approved") && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-gray-800 mt-2 border-t pt-4">
                    {stateStatusForm.watch("status") === "under_review" && "Informações para Análise do Órgão"}
                    {stateStatusForm.watch("status") === "pending_approval" && "Informações para Pendente Liberação"}
                    {stateStatusForm.watch("status") === "approved" && "Número da AET"}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={stateStatusForm.control}
                      name="aetNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Número da AET <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o número da AET"
                              {...field}
                              className="w-full"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Número único que será vinculado ao número da licença
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {/* Campo de upload de arquivo PDF para status "Liberada" */}
              {stateStatusForm.watch("status") === "approved" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-gray-800 mt-2 border-t pt-4">Informações para Licença Liberada</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={stateStatusForm.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Vencimento da Licença <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Data de vencimento obrigatória para liberação
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={stateStatusForm.control}
                      name="licenseFile"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>
                            Upload Licença <span className="text-red-500">*</span>
                          </FormLabel>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                <label
                                  htmlFor="licenseFile"
                                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                                >
                                  <span>Carregar arquivo</span>
                                  <input
                                    id="licenseFile"
                                    type="file"
                                    className="sr-only"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      onChange(file);
                                    }}
                                    {...field}
                                  />
                                </label>
                                <p className="pl-1">ou arraste e solte</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                PDF até 10MB
                              </p>
                              {value && (
                                <p className="text-sm text-green-600">
                                  Arquivo selecionado: {value.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Arquivo PDF obrigatório
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {/* Campo de upload de arquivo PDF para status "Reprovado" */}
              {stateStatusForm.watch("status") === "rejected" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-gray-800 mt-2 border-t pt-4">Informações para Licença Reprovada</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={stateStatusForm.control}
                      name="licenseFile"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>
                            Upload Documento de Reprovação <span className="text-red-500">*</span>
                          </FormLabel>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                <label
                                  htmlFor="licenseFile-rejected"
                                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                                >
                                  <span>Carregar arquivo</span>
                                  <input
                                    id="licenseFile-rejected"
                                    type="file"
                                    className="sr-only"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      onChange(file);
                                    }}
                                    {...field}
                                  />
                                </label>
                                <p className="pl-1">ou arraste e solte</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                PDF até 10MB
                              </p>
                              {value && (
                                <p className="text-sm text-green-600">
                                  Arquivo selecionado: {value.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Documento com razões da reprovação
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStateStatusDialogOpen(false)}
                  disabled={updateStateStatusMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateStateStatusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  {updateStateStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver detalhes da licença */}
      <Dialog open={licenseDetailsOpen} onOpenChange={setLicenseDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">Detalhes da Licença</DialogTitle>
            <DialogDescription>
              Visualize todos os detalhes da licença
            </DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200 overflow-x-auto">
                <h4 className="font-medium text-sm mb-2">Fluxo de Progresso da Licença:</h4>
                <div className="relative flex items-center justify-between mt-3 min-w-[500px]">
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
                        <span className="text-xs text-center mt-1 max-w-[70px] whitespace-normal">{option.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Informações do Transportador */}
              {selectedLicense.transporterId && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="font-medium text-sm mb-2">Transportador:</h4>
                  <TransporterInfo transporterId={selectedLicense.transporterId} />
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                <div className="p-2 bg-white rounded-md shadow-sm">
                  <h3 className="font-medium text-sm text-gray-500">Nº da Solicitação</h3>
                  <p className="font-medium text-base">{selectedLicense.requestNumber}</p>
                </div>
                <div className="p-2 bg-white rounded-md shadow-sm">
                  <h3 className="font-medium text-sm text-gray-500">Status</h3>
                  <div className="flex items-center mt-1">
                    <StatusBadge status={selectedLicense.status} />
                  </div>
                </div>
                <div className="p-2 bg-white rounded-md shadow-sm">
                  <h3 className="font-medium text-sm text-gray-500">Tipo de Licença</h3>
                  <p className="text-base">
                    {getLicenseTypeLabel(selectedLicense.type)}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-md shadow-sm">
                  <h3 className="font-medium text-sm text-gray-500">Data de Solicitação</h3>
                  <p className="text-base">{formatDate(selectedLicense.createdAt)}</p>
                </div>
              </div>
              
              {/* Nova seção de Composição de Veículos baseada na imagem */}
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Composição de Veículos</h4>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      Adicionar Veículo Trator
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-indigo-100 border-indigo-300 hover:bg-indigo-200">
                      Adicionar Carreta
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {/* Unidade Tratora */}
                  <div className="bg-white rounded-md p-3 border border-gray-200 relative">
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-800">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800">
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-800">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Unidade Tratora</div>
                    <div className="text-base font-medium">{selectedLicense.mainVehiclePlate || "TRK1234"}</div>
                    <div className="text-sm text-gray-600 mt-1">Cavalo</div>
                  </div>
                  
                  {/* Carretas */}
                  {selectedLicense.additionalPlates && selectedLicense.additionalPlates.length > 0 ? (
                    selectedLicense.additionalPlates.map((plate, index) => (
                      <div key={index} className="bg-white rounded-md p-3 border border-gray-200 relative">
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-800">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-800">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Semirreboque</div>
                        <div className="text-base font-medium">{plate}</div>
                        <div className="text-sm text-gray-600 mt-1">2 eixos</div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="bg-white rounded-md p-3 border border-gray-200 relative">
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-800">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-800">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Semirreboque</div>
                        <div className="text-base font-medium">SEM1234</div>
                        <div className="text-sm text-gray-600 mt-1">3 eixos</div>
                      </div>
                      <div className="bg-white rounded-md p-3 border border-gray-200 relative">
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-800">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-800">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Semirreboque</div>
                        <div className="text-base font-medium">SEM5678</div>
                        <div className="text-sm text-gray-600 mt-1">3 eixos</div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-3 text-right border-t pt-2">
                  <div className="text-sm font-medium">Total Unidades Acopladas: {(selectedLicense.additionalPlates?.length || 0) + 1}</div>
                </div>
              </div>
              
              <div className="p-2 bg-white rounded-md shadow-sm">
                <h3 className="font-medium text-sm text-gray-500">Veículos Adicionais</h3>
                <p className="text-base truncate">
                  {selectedLicense.additionalPlates && selectedLicense.additionalPlates.length > 0
                    ? selectedLicense.additionalPlates.join(", ")
                    : "Nenhum veículo adicional"}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md">
                <h3 className="font-medium text-sm text-gray-500 mb-2">Estados Solicitados</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedLicense.states.map((state, idx) => (
                    <Badge key={idx} variant="outline" className="px-3 py-1 text-sm bg-white">
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status por estado */}
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-2">Status por Estado</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                      <div key={state} className="border rounded p-2 sm:p-3 flex flex-col gap-1 sm:gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{state}</span>
                          <div className="group relative">
                            <StatusBadge status={stateStatus} />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedLicense.comments && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="font-medium text-sm text-gray-500 mb-2">Comentários</h3>
                    <div className="bg-white p-3 rounded border text-sm max-h-28 overflow-y-auto">
                      {selectedLicense.comments}
                    </div>
                  </div>
                )}

                {selectedLicense.licenseFileUrl && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="font-medium text-sm text-gray-500 mb-2">Documento da Licença</h3>
                    <div className="bg-white p-3 rounded border">
                      <a 
                        href={selectedLicense.licenseFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Ver documento
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center items-center mt-6 mb-2">
                <div className="bg-gray-50 rounded-md px-8 py-3 shadow-sm w-fit mx-auto">
                  <Button 
                    onClick={() => setLicenseDetailsOpen(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-md"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fechar detalhes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}