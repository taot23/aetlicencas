import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Vehicle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Search, AlertCircle, Truck } from "lucide-react";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";

export default function AdminVehiclesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Buscar todos os veículos
  const { data: vehicles, isLoading, error } = useQuery<Vehicle[]>({
    queryKey: ["/api/admin/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/admin/vehicles", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Falha ao buscar veículos");
      }
      return response.json();
    }
  });

  // Filtrar veículos pela placa
  const filteredVehicles = vehicles?.filter(
    (vehicle) => vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVehicleTypeLabel = (type: string): string => {
    const typeMapping: Record<string, string> = {
      tractor: "Unidade Tratora (Cavalo)",
      semitrailer: "Semirreboque",
      trailer: "Reboque",
      dolly: "Dolly",
      flatbed: "Prancha"
    };
    return typeMapping[type] || type;
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Veículos Cadastrados</h1>
          <p className="text-gray-600 mt-1">
            Gerencie todos os veículos cadastrados no sistema
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Utilize os filtros abaixo para encontrar veículos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar por placa..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center my-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Carregando veículos...</span>
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Erro ao carregar veículos. Por favor, tente novamente.</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Visualização para desktop */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tara (kg)</TableHead>
                      <TableHead>Ano CRLV</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles && filteredVehicles.length > 0 ? (
                      filteredVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plate}</TableCell>
                          <TableCell>{getVehicleTypeLabel(vehicle.type)}</TableCell>
                          <TableCell>{vehicle.tare}</TableCell>
                          <TableCell>{vehicle.crlvYear}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              vehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {vehicle.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(vehicle)}
                            >
                              Ver Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                          Nenhum veículo encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Visualização para mobile (cards) */}
          <div className="md:hidden space-y-4">
            {filteredVehicles && filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{vehicle.plate}</CardTitle>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {vehicle.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <CardDescription>{getVehicleTypeLabel(vehicle.type)}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Tara:</span>
                        <span className="text-sm">{vehicle.tare} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Ano CRLV:</span>
                        <span className="text-sm">{vehicle.crlvYear}</span>
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant="outline"
                          className="w-full" 
                          size="sm"
                          onClick={() => handleViewDetails(vehicle)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Truck className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-center">Nenhum veículo encontrado</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Modal de Detalhes do Veículo */}
      {selectedVehicle && (
        <Dialog open={!!selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Veículo</DialogTitle>
              <DialogDescription>
                Informações completas do veículo
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 font-medium">Placa:</div>
                <div className="col-span-3">{selectedVehicle.plate}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 font-medium">Tipo:</div>
                <div className="col-span-3">{getVehicleTypeLabel(selectedVehicle.type)}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 font-medium">Tara:</div>
                <div className="col-span-3">{selectedVehicle.tare} kg</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 font-medium">Ano CRLV:</div>
                <div className="col-span-3">{selectedVehicle.crlvYear}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 font-medium">Status:</div>
                <div className="col-span-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedVehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {selectedVehicle.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              {selectedVehicle.crlvUrl && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1 font-medium">CRLV:</div>
                  <div className="col-span-3">
                    <Button asChild variant="outline" size="sm">
                      <a href={selectedVehicle.crlvUrl} target="_blank" rel="noreferrer">
                        Visualizar CRLV
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedVehicle(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}