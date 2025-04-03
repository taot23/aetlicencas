import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { FileDown } from "lucide-react";
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
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/licenses/status-badge";
import { format } from "date-fns";

export default function TrackLicensePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);

  const { data: licenses, isLoading, refetch } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/licenses"],
    queryFn: async () => {
      const res = await fetch("/api/licenses", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar licenças");
      }
      return res.json();
    }
  });

  const filteredLicenses = licenses?.filter(license => {
    const matchesSearch = !searchTerm || 
      license.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.mainVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all_status" || license.status === statusFilter;
    
    const matchesDate = !dateFilter || (
      license.createdAt && 
      format(new Date(license.createdAt), "yyyy-MM-dd") === dateFilter
    );
    
    return matchesSearch && matchesStatus && matchesDate;
  });

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
                <SelectItem value="pending_registration">Pendente Cadastro</SelectItem>
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes da Licença</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Número do Pedido</h3>
                <p className="text-gray-900">{selectedLicense.requestNumber}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tipo de Conjunto</h3>
                <p className="text-gray-900">{selectedLicense.type}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Placa Principal</h3>
                <p className="text-gray-900">{selectedLicense.mainVehiclePlate}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status Geral</h3>
                <StatusBadge status={selectedLicense.status} />
              </div>
              
              {/* Status por Estado */}
              {selectedLicense.states && selectedLicense.states.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status por Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedLicense.states.map(state => {
                      // Procura o status para este estado
                      const stateStatus = selectedLicense.stateStatuses?.find(ss => ss.startsWith(`${state}:`))?.split(':')[1] || selectedLicense.status;
                      
                      return (
                        <div key={state} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">{state}</span>
                              <div className="mx-1 text-gray-400">•</div>
                              <StatusBadge status={stateStatus} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Data de Solicitação</h3>
                <p className="text-gray-900">
                  {selectedLicense.createdAt && format(new Date(selectedLicense.createdAt), "dd/MM/yyyy")}
                </p>
              </div>
              {selectedLicense.comments && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Comentários</h3>
                  <p className="text-gray-900">{selectedLicense.comments}</p>
                </div>
              )}
              {/* Arquivos por estado quando a licença está liberada */}
              {selectedLicense.status === "approved" && selectedLicense.states && selectedLicense.states.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Arquivos por Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedLicense.states.map(state => {
                      // Procura o arquivo para este estado
                      const stateFileEntry = selectedLicense.stateFiles?.find(sf => sf.startsWith(`${state}:`));
                      const stateStatus = selectedLicense.stateStatuses?.find(ss => ss.startsWith(`${state}:`))?.split(':')[1] || selectedLicense.status;
                      
                      return (
                        <div key={state} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-gray-800">{state}</span>
                              <div className="mx-1 text-gray-400">•</div>
                              <StatusBadge status={stateStatus} />
                            </div>
                            
                            {stateStatus === "approved" ? (
                                <span className="text-xs text-green-600 font-medium">
                                  {selectedLicense.requestNumber} - "{state}"
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 italic">Status: {stateStatus} - Aguardando liberação</span>
                              )}
                              
                              {!stateFileEntry && (
                                <span className="text-xs text-gray-500 italic mt-1">Nenhum arquivo disponível</span>
                              )}
                            </div>
                          
                          {stateFileEntry && stateStatus === "approved" && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={stateFileEntry.split(':')[1]} target="_blank" rel="noopener noreferrer">
                                <FileDown className="h-4 w-4 mr-1" /> Baixar
                              </a>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
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
