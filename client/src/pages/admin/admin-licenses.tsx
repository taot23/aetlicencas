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
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/licenses/status-badge";
import { LicenseRequest, LicenseStatus, brazilianStates } from "@shared/schema";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AdminLicenses() {
  const { toast } = useToast();
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all_status");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado para controlar o estado selecionado na seção de status por estado
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedStateStatus, setSelectedStateStatus] = useState<LicenseStatus>("pending_registration");
  const [stateComments, setStateComments] = useState<string>("");
  const [stateFile, setStateFile] = useState<File | null>(null);

  // Fetch all license requests
  const { data: licenses, isLoading } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/admin/licenses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/licenses", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar licenças");
      }
      return res.json();
    }
  });

  // Filter licenses
  const filteredLicenses = licenses?.filter(license => {
    const matchesStatus = statusFilter === "all_status" || license.status === statusFilter;
    const matchesSearch = !searchQuery || 
      license.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.mainVehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Update state-specific status mutation
  const updateStateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: FormData }) => {
      const res = await fetch(`/api/admin/licenses/${id}/state-status`, {
        method: "PATCH",
        credentials: "include",
        body: data,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || res.statusText);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Garantir que a cache seja invalidada para atualizar a lista de licenças
      queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/licenses/issued"] });
      
      // Atualiza a licença selecionada com os novos dados
      setSelectedLicense(data);
      setSelectedState("");
      setSelectedStateStatus("pending_registration");
      setStateComments("");
      setStateFile(null);
      
      toast({
        title: "Status do estado atualizado",
        description: "O status do estado foi atualizado com sucesso",
      });
      
      // Forçar recarregamento da lista após 500ms para garantir atualização
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status do estado",
        variant: "destructive",
      });
    },
  });

  const handleStateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStateFile(e.target.files[0]);
    }
  };
  
  const handleUpdateStateStatus = () => {
    if (!selectedLicense || !selectedState) return;
    
    const formData = new FormData();
    formData.append("state", selectedState);
    formData.append("status", selectedStateStatus);
    formData.append("comments", stateComments || "");
    
    if (stateFile) {
      formData.append("stateFile", stateFile);
    }
    
    updateStateStatusMutation.mutate({ id: selectedLicense.id, data: formData });
  };

  const openLicenseDialog = (license: LicenseRequest) => {
    setSelectedLicense(license);
    setSelectedState("");
    setSelectedStateStatus("pending_registration");
    setStateComments("");
    setStateFile(null);
  };
  
  // Função auxiliar para obter o status de um estado específico
  const getStateStatus = (license: LicenseRequest, state: string): string => {
    if (!license.stateStatuses) return "Não definido";
    
    const stateStatus = license.stateStatuses.find(ss => ss.startsWith(`${state}:`));
    if (!stateStatus) return "Não definido";
    
    const status = stateStatus.split(':')[1];
    
    switch(status) {
      case "pending_registration": return "Pendente Cadastro";
      case "registration_in_progress": return "Cadastro em Andamento";
      case "rejected": return "Reprovado";
      case "under_review": return "Análise do Órgão";
      case "pending_approval": return "Pendente Liberação";
      case "approved": return "Liberada";
      default: return "Não definido";
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Licenças</h1>
        <p className="text-gray-600">Controle de status e emissão de licenças AET</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="bg-gray-50">
          <CardTitle>Controle de Status das Licenças</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número do pedido ou placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-64">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_status">Todos os status</SelectItem>
                  <SelectItem value="pending_registration">Pendente Cadastro</SelectItem>
                  <SelectItem value="registration_in_progress">Cadastro em Andamento</SelectItem>
                  <SelectItem value="rejected">Reprovado</SelectItem>
                  <SelectItem value="under_review">Análise do Órgão</SelectItem>
                  <SelectItem value="pending_approval">Pendente Liberação</SelectItem>
                  <SelectItem value="approved">Liberada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Carregando licenças...</p>
            </div>
          ) : filteredLicenses && filteredLicenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº do Pedido</TableHead>
                    <TableHead>Tipo de Conjunto</TableHead>
                    <TableHead>Placa Principal</TableHead>
                    <TableHead>Estados</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell className="font-medium">{license.requestNumber}</TableCell>
                      <TableCell>
                        {license.type === "roadtrain_9_axles" && "Rodotrem 9 eixos"}
                        {license.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                        {license.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                        {license.type === "bitrain_6_axles" && "Bitrem 6 eixos"}
                        {license.type === "flatbed" && "Prancha"}
                      </TableCell>
                      <TableCell>{license.mainVehiclePlate}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {license.states.map(state => (
                            <span key={state} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {state}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {license.createdAt && format(new Date(license.createdAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={license.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openLicenseDialog(license)}>
                          Gerenciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhuma licença encontrada.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Status Update Dialog */}
      {selectedLicense && (
        <Dialog open={!!selectedLicense} onOpenChange={(open) => !open && setSelectedLicense(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Licença: {selectedLicense.requestNumber}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="details">Detalhes da Licença</TabsTrigger>
                <TabsTrigger value="states">Status por Estado</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tipo de Conjunto</h3>
                    <p className="text-gray-900">
                      {selectedLicense.type === "roadtrain_9_axles" && "Rodotrem 9 eixos"}
                      {selectedLicense.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                      {selectedLicense.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                      {selectedLicense.type === "bitrain_6_axles" && "Bitrem 6 eixos"}
                      {selectedLicense.type === "flatbed" && "Prancha"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Placa Principal</h3>
                    <p className="text-gray-900">{selectedLicense.mainVehiclePlate}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Estados</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedLicense.states.map(state => (
                        <span key={state} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {state}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Comprimento</h3>
                    <p className="text-gray-900">{selectedLicense.length / 100} m</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Data de Solicitação</h3>
                    <p className="text-gray-900">
                      {selectedLicense.createdAt && format(new Date(selectedLicense.createdAt), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status Atual</h3>
                    <StatusBadge status={selectedLicense.status} />
                  </div>
                  {selectedLicense.comments && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Comentários</h3>
                      <p className="text-gray-900">{selectedLicense.comments}</p>
                    </div>
                  )}
                  {selectedLicense.licenseFileUrl && (
                    <div className="pt-2">
                      <Button asChild variant="outline" className="w-full">
                        <a href={selectedLicense.licenseFileUrl} target="_blank" rel="noopener noreferrer">
                          Visualizar Licença
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="states">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Status por Estado</h3>
                  
                  {/* Status atual por estado */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2">Status por Estado</h4>
                    <Accordion type="single" collapsible className="border rounded-md">
                      {selectedLicense.states.map((state) => (
                        <AccordionItem key={state} value={state}>
                          <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline hover:bg-gray-50">
                            <div className="flex justify-between items-center w-full">
                              <span className="font-medium">{state}</span>
                              <StatusBadge 
                                status={selectedLicense.stateStatuses?.find(ss => ss.startsWith(`${state}:`))?.split(':')[1] || "pending_registration"}
                                className="ml-auto mr-4"
                              />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-3 bg-gray-50 text-sm">
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">Status:</span> {getStateStatus(selectedLicense, state)}
                              </div>
                              {selectedLicense.stateComments && selectedLicense.stateComments[state] && (
                                <div>
                                  <span className="font-medium">Comentários:</span> {selectedLicense.stateComments[state]}
                                </div>
                              )}
                              {selectedLicense.stateFiles && selectedLicense.stateFiles[state] && (
                                <div className="pt-2">
                                  <Button asChild variant="outline" size="sm">
                                    <a 
                                      href={selectedLicense.stateFiles[state]} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center"
                                    >
                                      <FileText className="h-4 w-4 mr-2" /> 
                                      Arquivo da Licença
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                  
                  {/* Formulário para atualizar status de estado */}
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <h4 className="text-sm font-medium mb-4">Atualizar Status por Estado</h4>
                    <div className="space-y-4">
                      {/* Seleção de estado */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="state">Estado</Label>
                          <Select value={selectedState} onValueChange={setSelectedState}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um estado" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedLicense.states.map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={selectedStateStatus} onValueChange={setSelectedStateStatus as any}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending_registration">Pendente Cadastro</SelectItem>
                              <SelectItem value="registration_in_progress">Cadastro em Andamento</SelectItem>
                              <SelectItem value="rejected">Reprovado</SelectItem>
                              <SelectItem value="under_review">Análise do Órgão</SelectItem>
                              <SelectItem value="pending_approval">Pendente Liberação</SelectItem>
                              <SelectItem value="approved">Liberada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Comentários e arquivos */}
                      <div>
                        <Label htmlFor="comments">Comentários (opcional)</Label>
                        <Textarea 
                          placeholder="Observações sobre o status deste estado" 
                          value={stateComments}
                          onChange={(e) => setStateComments(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="stateFile">Arquivo da Licença (opcional)</Label>
                        <Input 
                          id="stateFile" 
                          type="file" 
                          accept=".pdf,.jpg,.jpeg,.png" 
                          onChange={handleStateFileChange}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos aceitos: PDF, JPG, PNG
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleUpdateStateStatus} 
                        disabled={!selectedState || updateStateStatusMutation.isPending}
                        className="w-full"
                      >
                        {updateStateStatusMutation.isPending ? "Atualizando..." : "Atualizar Status"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}