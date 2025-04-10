import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transporter } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Building2, Users, FileText, PackageCheck, Info, AlertCircle } from "lucide-react";

export default function MyCompaniesPage() {
  const { user } = useAuth();
  const [userTransporters, setUserTransporters] = useState<Transporter[]>([]);
  
  // Buscar todos os transportadores para filtrar os vinculados ao usuário
  const { data: transporters = [], isLoading, error } = useQuery({
    queryKey: ["/api/user/transporters"],
    queryFn: async () => {
      // Esta rota pode não existir ainda, então vamos tratar os erros corretamente
      try {
        const response = await apiRequest("GET", "/api/user/transporters");
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar transportadores:", error);
        return [];
      }
    }
  });
  
  useEffect(() => {
    if (transporters && transporters.length > 0) {
      setUserTransporters(transporters);
    }
  }, [transporters]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minhas Empresas</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as empresas vinculadas ao seu perfil.
        </p>
      </div>
      
      <Separator className="mb-8" />
      
      {userTransporters.length === 0 ? (
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nenhuma empresa vinculada</AlertTitle>
          <AlertDescription>
            Você ainda não possui empresas vinculadas ao seu perfil. 
            Entre em contato com o administrador do sistema para vincular uma empresa à sua conta.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userTransporters.map((transporter) => (
            <Card key={transporter.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {transporter.name}
                </CardTitle>
                <CardDescription>
                  {transporter.personType === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Documento</p>
                    <p className="text-base">{transporter.documentNumber}</p>
                  </div>
                  
                  {transporter.personType === "pj" && transporter.tradeName && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Nome Fantasia</p>
                      <p className="text-base">{transporter.tradeName}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Contato</p>
                    <p className="text-base">{transporter.email}</p>
                    <p className="text-sm">{transporter.phone}</p>
                  </div>
                  
                  {(transporter.city || transporter.state) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Localização</p>
                      <p className="text-base">
                        {transporter.city}
                        {transporter.city && transporter.state && ", "}
                        {transporter.state}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-4 flex justify-end">
                    <Button variant="outline" className="w-full" size="sm">
                      <Info className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}