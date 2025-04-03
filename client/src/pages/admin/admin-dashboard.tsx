import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { LicenseRequest } from "@shared/schema";
import { useLocation } from "wouter";
import { 
  UsersRound, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PanelTop
} from "lucide-react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  // Fetch stats
  const { data: licensesData, isLoading: isLoadingLicenses } = useQuery<LicenseRequest[]>({
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

  // Get stats
  const totalLicenses = licensesData?.length || 0;
  const pendingLicenses = licensesData?.filter(license => 
    license.status === "pending_registration" || 
    license.status === "registration_in_progress" || 
    license.status === "under_review"
  ).length || 0;
  const approvedLicenses = licensesData?.filter(license => license.status === "approved").length || 0;
  const rejectedLicenses = licensesData?.filter(license => license.status === "rejected").length || 0;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
        <p className="text-gray-600">Gerenciamento de licenças AET e usuários do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Licenças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">{isLoadingLicenses ? '...' : totalLicenses}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Licenças Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div className="text-2xl font-bold">{isLoadingLicenses ? '...' : pendingLicenses}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Licenças Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">{isLoadingLicenses ? '...' : approvedLicenses}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Licenças Rejeitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div className="text-2xl font-bold">{isLoadingLicenses ? '...' : rejectedLicenses}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Licenças</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Acompanhe todas as licenças AET, atualize status e emita licenças para os transportadores.
            </p>
            <Button onClick={() => navigate("/admin/licenses")}>
              Gerenciar Licenças
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro de Transportadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Cadastre, edite e gerencie transportadores no sistema.
            </p>
            <Button onClick={() => navigate("/admin/transporters")}>
              Gerenciar Transportadores
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}