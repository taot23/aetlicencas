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

interface LicenseListProps {
  licenses: LicenseRequest[];
  isLoading: boolean;
  isDraftList?: boolean;
  onEdit?: (license: LicenseRequest) => void;
  onView?: (license: LicenseRequest) => void;
  onRefresh: () => void;
}

export function LicenseList({ 
  licenses, 
  isLoading, 
  isDraftList = false,
  onEdit, 
  onView,
  onRefresh 
}: LicenseListProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  
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
      if (license.status === "approved" && license.licenseFileUrl) {
        return (
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <a href={license.licenseFileUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        );
      } else if (license.status === "rejected") {
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

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isDraftList ? "Nº Rascunho" : "Nº do Pedido"}</TableHead>
              <TableHead>Tipo de Conjunto</TableHead>
              <TableHead>Placa Principal</TableHead>
              <TableHead>Estados</TableHead>
              <TableHead>{isDraftList ? "Última Modificação" : "Data Solicitação"}</TableHead>
              {!isDraftList && <TableHead>Status</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isDraftList ? 6 : 7} className="text-center py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : licenses.length > 0 ? (
              licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="font-medium">{license.requestNumber}</TableCell>
                  <TableCell>{getLicenseTypeLabel(license.type)}</TableCell>
                  <TableCell>{license.mainVehiclePlate}</TableCell>
                  <TableCell>{license.states.join(", ")}</TableCell>
                  <TableCell>
                    {isDraftList 
                      ? (license.updatedAt && format(new Date(license.updatedAt), "dd/MM/yyyy HH:mm"))
                      : (license.createdAt && format(new Date(license.createdAt), "dd/MM/yyyy"))}
                  </TableCell>
                  {!isDraftList && (
                    <TableCell>
                      <StatusBadge status={license.status} />
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {renderActions(license)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isDraftList ? 6 : 7} className="text-center py-10 text-gray-500">
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
