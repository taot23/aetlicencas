import { useState } from "react";
import { Vehicle } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
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
import { Pencil, Trash, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VehicleListProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onRefresh: () => void;
}

export function VehicleList({ vehicles, isLoading, onEdit, onRefresh }: VehicleListProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Veículo excluído",
        description: "O veículo foi excluído com sucesso",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o veículo",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedVehicle) {
      deleteMutation.mutate(selectedVehicle.id);
      setDeleteDialogOpen(false);
    }
  };

  const handleDocumentPreview = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setPreviewDialogOpen(true);
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case "tractor_unit": return "Unidade Tratora (Cavalo)";
      case "semi_trailer": return "Semirreboque";
      case "trailer": return "Reboque";
      case "dolly": return "Dolly";
      case "flatbed": return "Prancha";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Ativo</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Em Manutenção</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Inativo</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo de Veículo</TableHead>
                <TableHead>Tara (kg)</TableHead>
                <TableHead>Ano CRLV</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documentação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    Carregando veículos...
                  </TableCell>
                </TableRow>
              ) : vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.plate}</TableCell>
                    <TableCell>{getVehicleTypeLabel(vehicle.type)}</TableCell>
                    <TableCell>{vehicle.tare.toLocaleString()}</TableCell>
                    <TableCell>{vehicle.crlvYear}</TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell>
                      {vehicle.crlvUrl ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-blue-600"
                          onClick={() => handleDocumentPreview(vehicle)}
                        >
                          Ver CRLV
                        </Button>
                      ) : (
                        <span className="text-gray-500 text-sm">Não disponível</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(vehicle)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(vehicle)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-1"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum veículo cadastrado. Clique em "Cadastrar Veículo" para adicionar.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {vehicles.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-medium">{vehicles.length}</span> veículos
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Veículo</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir o veículo {selectedVehicle?.plate}?
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

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>CRLV do Veículo {selectedVehicle?.plate}</DialogTitle>
          </DialogHeader>
          
          {selectedVehicle?.crlvUrl ? (
            selectedVehicle.crlvUrl.endsWith('.pdf') ? (
              <div className="aspect-video">
                <iframe 
                  src={selectedVehicle.crlvUrl} 
                  className="w-full h-[500px]" 
                  title={`CRLV do veículo ${selectedVehicle.plate}`}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <img 
                  src={selectedVehicle.crlvUrl} 
                  alt={`CRLV do veículo ${selectedVehicle.plate}`}
                  className="max-h-[500px] object-contain"
                />
              </div>
            )
          ) : (
            <div className="py-12 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Documento não disponível.</p>
            </div>
          )}
          
          <div className="flex justify-center mt-4">
            <Button asChild>
              <a 
                href={selectedVehicle?.crlvUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                Abrir em Nova Aba
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
