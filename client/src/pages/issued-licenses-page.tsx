import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { LicenseRequest, LicenseStatus } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { FileDown, ExternalLink } from "lucide-react";
import { Status, StatusBadge } from "@/components/licenses/status-badge";

export default function IssuedLicensesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const itemsPerPage = 10;

  const { data: issuedLicenses, isLoading } = useQuery<LicenseRequest[]>({
    queryKey: ["/api/licenses/issued"],
    queryFn: async () => {
      const res = await fetch("/api/licenses/issued", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar licenças emitidas");
      }
      return res.json();
    }
  });

  const filteredLicenses = issuedLicenses?.filter(license => {
    // Permitir licenças com status geral approved ou com pelo menos um estado com status approved
    const hasApprovedState = license.stateStatuses?.some(ss => ss.includes(':approved')) || false;
    if (license.status !== "approved" && !hasApprovedState) return false;

    const matchesSearch = !searchTerm || 
      license.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.mainVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const licenseDate = license.updatedAt ? new Date(license.updatedAt) : null;
    
    const matchesDateFrom = !dateFrom || (
      licenseDate && 
      licenseDate >= new Date(dateFrom)
    );
    
    const matchesDateTo = !dateTo || (
      licenseDate && 
      licenseDate <= new Date(dateTo)
    );
    
    const matchesState = !stateFilter || stateFilter === "all_states" || (
      license.states.includes(stateFilter)
    );
    
    return matchesSearch && matchesDateFrom && matchesDateTo && matchesState;
  }) || [];

  // Paginação
  const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage);
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const viewLicenseDetails = (license: LicenseRequest) => {
    setSelectedLicense(license);
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Licenças Emitidas</h1>
        <p className="text-gray-600 mt-1">Histórico de todas as licenças liberadas</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="issued-search" className="block text-sm font-medium text-gray-700 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <Input
                id="issued-search"
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
          
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="state-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_states">Todos os estados</SelectItem>
                <SelectItem value="SP">SP</SelectItem>
                <SelectItem value="MG">MG</SelectItem>
                <SelectItem value="MT">MT</SelectItem>
                <SelectItem value="PE">PE</SelectItem>
                <SelectItem value="TO">TO</SelectItem>
                <SelectItem value="MS">MS</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
                <SelectItem value="ES">ES</SelectItem>
                <SelectItem value="DNIT">DNIT</SelectItem>
                <SelectItem value="RS">RS</SelectItem>
                <SelectItem value="BA">BA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Versão desktop - tabela */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº do Pedido</TableHead>
                  <TableHead>Tipo de Conjunto</TableHead>
                  <TableHead>Placa Principal</TableHead>
                  <TableHead>Estados</TableHead>
                  <TableHead>Data Liberação</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      Carregando licenças...
                    </TableCell>
                  </TableRow>
                ) : paginatedLicenses.length > 0 ? (
                  paginatedLicenses.map((license) => (
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
                        {license.updatedAt && format(new Date(license.updatedAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {license.validUntil && format(new Date(license.validUntil), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {license.licenseFileUrl && (
                          <Button variant="ghost" size="icon" asChild className="mr-2 flex items-center justify-center">
                            <a 
                              href={license.licenseFileUrl || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!license.licenseFileUrl) {
                                  e.preventDefault();
                                  alert('Arquivo não disponível no momento.');
                                }
                              }}
                            >
                              <FileDown className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="flex items-center justify-center"
                          onClick={() => viewLicenseDetails(license)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      Nenhuma licença emitida encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Versão mobile - cards */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Carregando licenças...</p>
            </div>
          ) : paginatedLicenses.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {paginatedLicenses.map((license) => (
                <div key={license.id} className="p-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-900">{license.requestNumber}</span>
                    <div className="flex space-x-1">
                      {license.licenseFileUrl && (
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 flex items-center justify-center" aria-label="Download">
                          <a 
                            href={license.licenseFileUrl || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!license.licenseFileUrl) {
                                e.preventDefault();
                                alert('Arquivo não disponível no momento.');
                              }
                            }}
                          >
                            <FileDown className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 flex items-center justify-center"
                        aria-label="Ver detalhes"
                        onClick={() => viewLicenseDetails(license)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Tipo:</span>
                      <div>
                        {license.type === "roadtrain_9_axles" && "Rodotrem 9 eixos"}
                        {license.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                        {license.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                        {license.type === "bitrain_6_axles" && "Bitrem 6 eixos"}
                        {license.type === "flatbed" && "Prancha"}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Placa:</span>
                      <div>{license.mainVehiclePlate}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Liberação:</span>
                      <div>{license.updatedAt && format(new Date(license.updatedAt), "dd/MM/yyyy")}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Validade:</span>
                      <div>{license.validUntil && format(new Date(license.validUntil), "dd/MM/yyyy")}</div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500">Estados:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {license.states.map(state => (
                        <span key={state} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {state}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">
              Nenhuma licença emitida encontrada.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredLicenses.length)}
              </span> de <span className="font-medium">{filteredLicenses.length}</span> licenças
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 3) }).map((_, i) => {
                  const pageNumber = currentPage <= 2 
                    ? i + 1 
                    : currentPage >= totalPages - 1 
                      ? totalPages - 2 + i 
                      : currentPage - 1 + i;
                  
                  if (pageNumber <= 0 || pageNumber > totalPages) return null;
                  
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        isActive={currentPage === pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {selectedLicense && (
        <Dialog open={!!selectedLicense} onOpenChange={(open) => !open && setSelectedLicense(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-auto">
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
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <Status status={selectedLicense.status} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Data de Liberação</h3>
                <p className="text-gray-900">
                  {selectedLicense.updatedAt && format(new Date(selectedLicense.updatedAt), "dd/MM/yyyy")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Validade</h3>
                <p className="text-gray-900">
                  {selectedLicense.validUntil && format(new Date(selectedLicense.validUntil), "dd/MM/yyyy")}
                </p>
              </div>
              {/* Arquivos por estado - mostrar sempre, mesmo que não haja arquivos ainda */}
              {selectedLicense.states && selectedLicense.states.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Arquivos por Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedLicense.states.map(state => {
                      // Procura o arquivo para este estado
                      const stateFileEntry = selectedLicense.stateFiles?.find(sf => sf.startsWith(`${state}:`));
                      const stateStatus = selectedLicense.stateStatuses?.find(ss => ss.startsWith(`${state}:`))?.split(':')[1] || "pending_registration";
                      const isApproved = stateStatus === "approved";
                      
                      return (
                        <div key={state} className={`flex justify-between items-center p-3 rounded border ${isApproved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-gray-800">{state}</span>
                              <div className="mx-1 text-gray-400">•</div>
                              <StatusBadge status={stateStatus as LicenseStatus} />
                            </div>
                            
                            {stateStatus === "approved" ? (
                              <span className="text-xs text-green-600 font-medium">
                                {selectedLicense.requestNumber} - "{state}"
                              </span>
                            ) : (
                              <span className="text-xs text-gray-700">
                                {selectedLicense.requestNumber} - "{state}"
                              </span>
                            )}
                            
                            {!stateFileEntry && (
                              <span className="text-xs text-gray-500 italic mt-1">Nenhum arquivo disponível</span>
                            )}
                          </div>
                          
                          {stateFileEntry && (
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={stateFileEntry?.split?.(':')?.[1] || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!stateFileEntry?.split?.(':')?.[1]) {
                                    e.preventDefault();
                                    alert('Arquivo não disponível no momento.');
                                  }
                                }}
                              >
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
              {selectedLicense.licenseFileUrl && (
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <a 
                      href={selectedLicense.licenseFileUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!selectedLicense.licenseFileUrl) {
                          e.preventDefault();
                          alert('Arquivo não disponível no momento.');
                        }
                      }}
                    >
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
