import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LicenseRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash, Send, ExternalLink, Download, FileText } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { SortableHeader } from "@/components/ui/sortable-header";

interface LicenseListProps {
  licenses: LicenseRequest[];
  isLoading: boolean;
  isDraftList?: boolean;
  onEdit?: (license: LicenseRequest) => void;
  onView?: (license: LicenseRequest) => void;
  onRefresh: () => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (column: string) => void;
}

export function LicenseList({ 
  licenses, 
  isLoading, 
  isDraftList = false,
  onEdit, 
  onView,
  onRefresh,
  sortColumn = null,
  sortDirection = null,
  onSort
}: LicenseListProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  
  // Função para obter a URL do arquivo da licença de qualquer estrutura
  const getLicenseFileUrl = (license: any): string | null => {
    // Tenta todas as possíveis propriedades onde a URL pode estar
    return license.licenseFileUrl || 
           license.license_file_url || 
           (license as any).license_file_url || 
           (license.stateFiles && license.stateFiles.length > 0 ? license.stateFiles[0].split(':')[1] : null);
  };
  
  // Delete mutation for drafts
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/licenses/drafts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Rascunho excluído",
        description: "O rascunho da licença foi excluído com sucesso",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o rascunho",
        variant: "destructive",
      });
    },
  });

  // Submit draft mutation
  const submitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/licenses/drafts/${id}/submit`);
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada",
        description: "A solicitação de licença foi enviada com sucesso",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a solicitação",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (license: LicenseRequest) => {
    setSelectedLicense(license);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedLicense) {
      deleteMutation.mutate(selectedLicense.id);
      setDeleteDialogOpen(false);
    }
  };

  const handleSubmitDraft = (license: LicenseRequest) => {
    submitMutation.mutate(license.id);
  };

  const getLicenseTypeLabel = (type: string) => {
    switch (type) {
      case "roadtrain_9_axles": return "Rodotrem 9 eixos";
      case "bitrain_9_axles": return "Bitrem 9 eixos";
      case "bitrain_7_axles": return "Bitrem 7 eixos";
      case "bitrain_6_axles": return "Bitrem 6 eixos";
      case "flatbed": return "Prancha";
      default: return type;
    }
  };

  // Function to render actions based on list type and license status
  const renderActions = (license: LicenseRequest) => {
    // Obter URL do arquivo uma única vez para evitar múltiplas chamadas à função
    const licenseFileUrl = getLicenseFileUrl(license);
    
    if (isDraftList) {
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit && onEdit(license)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSubmitDraft(license)}
            className="text-green-600 hover:text-green-800 hover:bg-green-50 ml-1"
            disabled={submitMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteClick(license)}
            className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-1"
            disabled={deleteMutation.isPending}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </>
      );
    } else {
      // Para licenças em acompanhamento
      const stateStatus = (license as any).specificStateStatus || license.status;
      
      // Se o status do estado específico ou o status geral for "approved" (liberada)
      if (stateStatus === "approved") {
        // Sempre mostrar botão de download para licenças aprovadas/liberadas, mesmo se o arquivo ainda não estiver disponível
        return (
          <div className="flex justify-end items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-green-600 hover:text-green-800 hover:bg-green-50"
              title={licenseFileUrl ? "Baixar licença" : "Arquivo não disponível"}
            >
              <a 
                href={licenseFileUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!licenseFileUrl) {
                    e.preventDefault();
                    alert('Arquivo da licença não disponível no momento.');
                  }
                }}
                className={!licenseFileUrl ? "opacity-40 cursor-not-allowed" : ""}
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView && onView(license)}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        );
      } else if (stateStatus === "rejected") {
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView && onView(license)}
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        );
      } else {
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView && onView(license)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        );
      }
    }
  };

  const isMobile = useIsMobile();

  // Render mobile view with cards
  if (isMobile) {
    return (
      <>
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        ) : licenses.length > 0 ? (
          <div className="space-y-4 p-4">
            {licenses.map((license) => (
              <div key={(license as any).uniqueId || license.id} className="bg-white shadow rounded-lg p-4 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <div className="font-medium text-lg">{license.requestNumber}</div>
                  {!isDraftList && <StatusBadge status={(license as any).specificStateStatus || license.status} />}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <span className="text-sm text-gray-500 block">Tipo:</span>
                    <span>{getLicenseTypeLabel(license.type)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block">Placa Principal:</span>
                    <span>{license.mainVehiclePlate}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block">Estado:</span>
                    <span>{(license as any).specificState || license.states.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block">
                      {isDraftList ? "Última Modificação:" : "Data Solicitação:"}
                    </span>
                    <span>
                      {isDraftList 
                        ? (license.updatedAt && format(new Date(license.updatedAt), "dd/MM/yyyy HH:mm"))
                        : (license.createdAt && format(new Date(license.createdAt), "dd/MM/yyyy"))}
                    </span>
                  </div>
                  
                  {/* Adicionar data de validade para licenças aprovadas */}
                  {((license as any).specificStateStatus === "approved" || license.status === "approved") && 
                   (license.validUntil || (license as any).stateValidUntil) && (
                    <div className="col-span-2">
                      <span className="text-sm text-gray-500 block">Validade:</span>
                      <span className="text-green-600 font-medium">
                        {format(new Date((license as any).stateValidUntil || license.validUntil), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 mt-4 border-t pt-4">
                  {isDraftList ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit && onEdit(license)}
                        className="text-blue-600 border-blue-200"
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubmitDraft(license)}
                        className="text-green-600 border-green-200"
                        disabled={submitMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" /> Enviar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(license)}
                        className="text-red-600 border-red-200"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </>
                  ) : (
                    (() => {
                      // Verificar tanto o status específico do estado quanto o status geral
                      const stateStatus = (license as any).specificStateStatus || license.status;
                      // Obter URL do arquivo uma única vez para evitar múltiplas chamadas à função
                      const licenseFileUrl = getLicenseFileUrl(license);
                      
                      if (stateStatus === "approved") {
                        return (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="text-green-600 border-green-200 mr-1"
                              title={licenseFileUrl ? "Baixar licença" : "Arquivo não disponível"}
                            >
                              <a 
                                href={licenseFileUrl || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!licenseFileUrl) {
                                    e.preventDefault();
                                    alert('Arquivo da licença não disponível no momento.');
                                  }
                                }}
                                className={!licenseFileUrl ? "opacity-40 cursor-not-allowed" : ""}
                              >
                                <Download className="h-4 w-4 mr-1" /> Download
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onView && onView(license)}
                              className="text-blue-600 border-blue-200"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" /> Detalhes
                            </Button>
                          </>
                        );
                      } else if (stateStatus === "rejected") {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onView && onView(license)}
                            className="text-red-600 border-red-200"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Detalhes
                          </Button>
                        );
                      } else {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onView && onView(license)}
                            className="text-blue-600 border-blue-200"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Detalhes
                          </Button>
                        );
                      }
                    })()
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>
              {isDraftList 
                ? "Nenhum rascunho de licença encontrado."
                : "Nenhuma licença encontrada."}
            </p>
          </div>
        )}
      </>
    );
  }

  // Render desktop view with table
  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {onSort ? (
                <SortableHeader
                  column="requestNumber"
                  label={isDraftList ? "Nº Rascunho" : "Nº do Pedido"}
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <TableHead>{isDraftList ? "Nº Rascunho" : "Nº do Pedido"}</TableHead>
              )}
              
              {onSort ? (
                <SortableHeader
                  column="type"
                  label="Tipo de Conjunto"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <TableHead>Tipo de Conjunto</TableHead>
              )}
              
              {onSort ? (
                <SortableHeader
                  column="mainVehiclePlate"
                  label="Placa Principal"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <TableHead>Placa Principal</TableHead>
              )}
              
              {onSort ? (
                <SortableHeader
                  column="state"
                  label="Estado"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <TableHead>Estado</TableHead>
              )}
              
              {/* Coluna de Transportador */}
              {onSort ? (
                <SortableHeader
                  column="transporterName"
                  label="Transportador"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <TableHead>Transportador</TableHead>
              )}
              
              {onSort ? (
                <SortableHeader
                  column={isDraftList ? "updatedAt" : "createdAt"}
                  label={isDraftList ? "Última Modificação" : "Data Solicitação"}
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <TableHead>{isDraftList ? "Última Modificação" : "Data Solicitação"}</TableHead>
              )}

              {/* Coluna de validade SOMENTE para página de licenças emitidas (/licenses/issued) */}
              {!isDraftList && window.location.pathname.includes('/licenses/issued') && (
                onSort ? (
                  <SortableHeader
                    column="validUntil"
                    label="Validade"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={onSort}
                  />
                ) : (
                  <TableHead>Validade</TableHead>
                )
              )}
              
              {!isDraftList && (
                onSort ? (
                  <SortableHeader
                    column="status"
                    label="Status"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={onSort}
                  />
                ) : (
                  <TableHead>Status</TableHead>
                )
              )}
              
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell 
                  colSpan={isDraftList 
                    ? 7 // Rascunhos (agora com coluna de transportador)
                    : window.location.pathname.includes('/licenses/issued')
                      ? 9 // Licenças emitidas (com coluna de validade e transportador)
                      : 8 // Outras páginas de licenças (com transportador, sem validade)
                  } 
                  className="text-center py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : licenses.length > 0 ? (
              licenses.map((license) => (
                <TableRow key={(license as any).uniqueId || license.id}>
                  <TableCell className="font-medium">
                    {/* Renderizar o Nº de Solicitação - pode vir como request_number ou requestNumber dependendo da API */}
                    {license.requestNumber || (license as any).request_number || "N/A"}
                  </TableCell>
                  <TableCell>{getLicenseTypeLabel(license.type)}</TableCell>
                  <TableCell>
                    {/* Renderizar a placa do veículo principal - pode vir como mainVehiclePlate ou main_vehicle_plate */}
                    {license.mainVehiclePlate || (license as any).main_vehicle_plate || "N/A"}
                  </TableCell>
                  <TableCell>
                    {(license as any).specificState || license.states.join(", ")}
                  </TableCell>
                  <TableCell>
                    {/* Exibir nome do transportador */}
                    {(license as any).transporterName || (license.transporterId ? `ID: ${license.transporterId}` : "-")}
                  </TableCell>
                  <TableCell>
                    {isDraftList 
                      ? ((license.updatedAt || (license as any).updated_at) ? 
                         format(new Date(license.updatedAt || (license as any).updated_at), "dd/MM/yyyy HH:mm") : "-")
                      : ((license.createdAt || (license as any).created_at) ? 
                         format(new Date(license.createdAt || (license as any).created_at), "dd/MM/yyyy") : "-")}
                  </TableCell>
                  {/* Coluna de validade apenas na página de licenças emitidas */}
                  {!isDraftList && window.location.pathname.includes('/licenses/issued') && (
                    <TableCell>
                      {/* Exibir data de validade se disponível */}
                      {((license as any).stateValidUntil || license.validUntil) ? (
                        <span className="text-green-600 font-medium">
                          {format(new Date((license as any).stateValidUntil || license.validUntil), "dd/MM/yyyy")}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Coluna de status sempre presente para licenças não-rascunho */}
                  {!isDraftList && (
                    <TableCell>
                      <StatusBadge status={(license as any).specificStateStatus || license.status} />
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {renderActions(license)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={isDraftList 
                    ? 7 // Rascunhos (agora com coluna de transportador)
                    : window.location.pathname.includes('/licenses/issued')
                      ? 9 // Licenças emitidas (com coluna de validade e transportador)
                      : 8 // Outras páginas de licenças (com transportador, sem validade)
                  } 
                  className="text-center py-10 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>
                    {isDraftList 
                      ? "Nenhum rascunho de licença encontrado."
                      : "Nenhuma licença encontrada."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rascunho</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir este rascunho de licença?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
