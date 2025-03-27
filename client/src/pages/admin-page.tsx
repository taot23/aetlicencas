import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { LicenseRequest, LicenseStatus, UpdateLicenseStatus } from "@shared/schema";
import { format } from "date-fns";
import { AlertCircle, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updateData, setUpdateData] = useState<{
    status: LicenseStatus;
    comments: string;
  }>({
    status: "pending_registration",
    comments: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [validUntil, setValidUntil] = useState("");

  // Admin check is now handled by AdminRoute

  // Fetch all license requests
  const { data: licenses, isLoading } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/admin/licenses"],
  });

  // Filter licenses
  const filteredLicenses = licenses?.filter(license => {
    const matchesStatus = statusFilter === "all" || license.status === statusFilter;
    const matchesSearch = !searchQuery || 
      license.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.mainVehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Update license status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: FormData }) => {
      const res = await fetch(`/api/admin/licenses/${id}/status`, {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      setSelectedLicense(null);
      toast({
        title: "Status atualizado",
        description: "O status da licença foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleUpdateStatus = () => {
    if (!selectedLicense) return;
    
    const formData = new FormData();
    // Garantir que status nunca seja undefined
    formData.append("status", updateData.status || "pending_registration");
    
    // Verificar se existem comentários e garantir que nunca seja undefined ou null
    formData.append("comments", updateData.comments || "");
    
    if (licenseFile) {
      formData.append("licenseFile", licenseFile);
    }
    
    if (validUntil) {
      formData.append("validUntil", validUntil);
    }
    
    updateStatusMutation.mutate({ id: selectedLicense.id, data: formData });
  };

  const openLicenseDialog = (license: LicenseRequest) => {
    setSelectedLicense(license);
    setUpdateData({
      status: license.status,
      comments: license.comments || "",
    });
    setValidUntil(license.validUntil ? format(new Date(license.validUntil), "yyyy-MM-dd") : "");
    setLicenseFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Painel Administrativo - Licenças AET</h1>
          <Button 
            variant="outline" 
            className="text-white border-white hover:bg-gray-700"
            onClick={() => setLocation("/")}
          >
            Voltar ao Sistema
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
                    <SelectItem value="all">Todos os status</SelectItem>
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
                        <TableCell>{license.states.join(", ")}</TableCell>
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
                  <TabsTrigger value="update">Atualizar Status</TabsTrigger>
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
                      <p className="text-gray-900">{selectedLicense.states.join(", ")}</p>
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
                
                <TabsContent value="update">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="status">Status da Licença</Label>
                      <Select 
                        value={updateData.status} 
                        onValueChange={(value) => setUpdateData({ ...updateData, status: value as LicenseStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending_registration">Pendente Cadastro</SelectItem>
                          <SelectItem value="registration_in_progress">Cadastro em Andamento</SelectItem>
                          <SelectItem value="rejected">Reprovado - Pendência</SelectItem>
                          <SelectItem value="under_review">Análise do Órgão</SelectItem>
                          <SelectItem value="pending_approval">Pendente Liberação</SelectItem>
                          <SelectItem value="approved">Liberada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="comments">Comentários</Label>
                      <Textarea 
                        id="comments"
                        value={updateData.comments || ""}
                        onChange={(e) => setUpdateData({ ...updateData, comments: e.target.value })}
                        placeholder="Adicione comentários ou instruções para o solicitante..."
                        rows={4}
                      />
                    </div>
                    
                    {updateData.status === "approved" && (
                      <>
                        <div>
                          <Label htmlFor="validUntil">Válido até</Label>
                          <Input 
                            id="validUntil"
                            type="date"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                            required={updateData.status === "approved"}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="licenseFile">Arquivo da Licença</Label>
                          <Input 
                            id="licenseFile"
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            {licenseFile ? `Arquivo selecionado: ${licenseFile.name}` : "Formatos aceitos: PDF, JPG, PNG"}
                          </p>
                        </div>
                        
                        {!licenseFile && !selectedLicense.licenseFileUrl && (
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                            <p className="text-sm text-yellow-500">
                              É recomendado anexar o arquivo da licença ao mudar para o status "Liberada"
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setSelectedLicense(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? "Atualizando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
