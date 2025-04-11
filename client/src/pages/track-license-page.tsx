import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { FileDown, CheckCircle, Search } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { LicenseRequest } from "@shared/schema";
import { LicenseList } from "@/components/licenses/license-list";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/licenses/status-badge";
import { ProgressFlow, StateProgressFlow } from "@/components/licenses/progress-flow";
import { format } from "date-fns";
import { getLicenseTypeLabel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TransporterInfo } from "@/components/transporters/transporter-info";

export default function TrackLicensePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  


  const { toast } = useToast();
  
  // Buscamos todas as licenças não finalizadas usando a rota /api/licenses
  const { data: licenses, isLoading, refetch } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/licenses"],
    queryFn: async () => {
      const res = await fetch("/api/licenses", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar licenças");
      }
      
      const data = await res.json();
      
      // Retornar todas as licenças, sem filtrar as aprovadas
      return data;
    },
    // Otimização: Mantém dados em cache por 5 minutos
    staleTime: 5 * 60 * 1000,
    // Recarrega os dados quando a página recebe foco para obter atualizações
    refetchOnWindowFocus: true,
    // Permite uma tentativa adicional em caso de falha
    retry: 1
  });

  // Usado para notificar o usuário sobre a disponibilidade de dados em cache
  useEffect(() => {
    if (licenses && licenses.length > 0) {
      toast({
        title: "Licenças carregadas",
        description: `${licenses.length} licenças disponíveis para consulta.`,
        duration: 3000,
      });
    }
  }, [licenses, toast]);

  // Otimizado usando useMemo para evitar recálculos desnecessários
  const filteredLicenses = useMemo(() => {
    if (!licenses) return [];
    
    // Criar uma interface estendida para a licença com estado específico
    interface ExtendedLicense extends LicenseRequest {
      specificState?: string;
      specificStateStatus?: string;
    }
    
    // Criar uma lista expandida de licenças separadas por estado
    const expandedLicenses: ExtendedLicense[] = [];
    
    licenses.forEach(license => {
      // Para cada estado na licença, crie uma entrada específica
      if (license.states && license.states.length > 0) {
        license.states.forEach(state => {
          // Verificar o status para este estado específico
          const stateStatus = license.stateStatuses?.find(ss => ss.startsWith(`${state}:`))?.split(':')[1];
          
          // Criar uma cópia da licença com o estado específico
          const stateLicense: ExtendedLicense = {
            ...license,
            specificState: state,
            // Substituir o array de estados com apenas este estado
            states: [state],
            // Para filtros de status no frontend, usamos o status do estado específico
            specificStateStatus: stateStatus
          };
          
          expandedLicenses.push(stateLicense);
        });
      } else {
        // Se não houver estados, apenas adicione a licença como está
        expandedLicenses.push({...license});
      }
    });
    
    // Aplicar filtros à lista expandida
    return expandedLicenses.filter(license => {
      const matchesSearch = !searchTerm || 
        license.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        license.mainVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Modo compatibilidade: filtrar pelo status geral ou status específico do estado
      const matchesStatus = !statusFilter || statusFilter === "all_status" || 
        license.status === statusFilter || 
        license.specificStateStatus === statusFilter;
      
      const matchesDate = !dateFilter || (
        license.createdAt && 
        format(new Date(license.createdAt), "yyyy-MM-dd") === dateFilter
      );
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [licenses, searchTerm, statusFilter, dateFilter]);

  const handleViewLicense = (license: LicenseRequest) => {
    setSelectedLicense(license);
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Acompanhar Licença</h1>
        <p className="text-gray-600 mt-1">Acompanhe o status de todas as suas licenças solicitadas</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-full md:w-auto flex-1">
            <label htmlFor="license-search" className="block text-sm font-medium text-gray-700 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <Input
                id="license-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nº do pedido ou placa..."
                className="pl-10"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_status">Todos os status</SelectItem>
                <SelectItem value="pending_registration">Pedido em Cadastramento</SelectItem>
                <SelectItem value="registration_in_progress">Cadastro em Andamento</SelectItem>
                <SelectItem value="rejected">Reprovado</SelectItem>
                <SelectItem value="under_review">Análise do Órgão</SelectItem>
                <SelectItem value="pending_approval">Pendente Liberação</SelectItem>
                <SelectItem value="approved">Liberada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-auto">
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <LicenseList 
        licenses={filteredLicenses || []} 
        isLoading={isLoading}
        onView={handleViewLicense}
        onRefresh={refetch}
      />

      {selectedLicense && (
        <Dialog open={!!selectedLicense} onOpenChange={(open) => !open && setSelectedLicense(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl font-bold">Detalhes da Licença</DialogTitle>
              <DialogDescription>
                Visualize os detalhes da sua solicitação
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Fluxo de progresso - similar ao da admin-licenses.tsx */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="font-medium text-sm mb-2">Fluxo de Progresso da Licença:</h4>
                <ProgressFlow currentStatus={selectedLicense.status} size="md" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Nº da Solicitação</h3>
                  <p className="font-medium">{selectedLicense.requestNumber}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Status</h3>
                  <div className="flex items-center mt-1">
                    <StatusBadge status={selectedLicense.status} />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Tipo de Licença</h3>
                  <p>
                    {getLicenseTypeLabel(selectedLicense.type)}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Data de Solicitação</h3>
                  <p>{selectedLicense.createdAt && format(new Date(selectedLicense.createdAt), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Veículo Principal</h3>
                  <p>{selectedLicense.mainVehiclePlate}</p>
                </div>
                <TransporterInfo transporterId={selectedLicense.transporterId} />
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Veículos Adicionais</h3>
                  <p>
                    {selectedLicense.additionalPlates && selectedLicense.additionalPlates.length > 0
                      ? selectedLicense.additionalPlates.join(", ")
                      : "Nenhum veículo adicional"}
                  </p>
                </div>
              </div>
              
              {selectedLicense.comments && (
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Comentários</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200 text-sm">
                    {selectedLicense.comments}
                  </p>
                </div>
              )}
              
              {/* Área de Status por Estado foi removida conforme solicitação do cliente */}
              
              {/* Arquivo principal da licença (manter para compatibilidade) */}
              {selectedLicense.status === "approved" && selectedLicense.licenseFileUrl && (
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <a href={selectedLicense.licenseFileUrl} target="_blank" rel="noopener noreferrer">
                      Download da Licença Completa
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
