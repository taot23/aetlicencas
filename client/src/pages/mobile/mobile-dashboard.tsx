import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layouts/mobile-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Truck, FileText, ClipboardCheck, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminUser } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function MobileDashboardPage() {
  const { user } = useAuth();
  const [animatedStats, setAnimatedStats] = useState({
    totalVehicles: 0,
    activeLicenses: 0,
    pendingApproval: 0,
    expiringSoon: 0
  });
  
  // Buscar estatísticas do dashboard
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  
  // Animar os números para uma experiência mais agradável
  useEffect(() => {
    if (stats) {
      const interval = setInterval(() => {
        setAnimatedStats(prev => {
          const newStats = { ...prev };
          
          if (prev.totalVehicles < stats.totalVehicles) {
            newStats.totalVehicles = Math.min(prev.totalVehicles + Math.ceil(stats.totalVehicles / 20), stats.totalVehicles);
          }
          
          if (prev.activeLicenses < stats.activeLicenses) {
            newStats.activeLicenses = Math.min(prev.activeLicenses + Math.ceil(stats.activeLicenses / 20), stats.activeLicenses);
          }
          
          if (prev.pendingApproval < stats.pendingApproval) {
            newStats.pendingApproval = Math.min(prev.pendingApproval + Math.ceil(stats.pendingApproval / 20), stats.pendingApproval);
          }
          
          if (prev.expiringSoon < stats.expiringSoon) {
            newStats.expiringSoon = Math.min(prev.expiringSoon + Math.ceil(stats.expiringSoon / 20), stats.expiringSoon);
          }
          
          // Se todos os valores alcançaram seus alvos, limpar o intervalo
          if (
            newStats.totalVehicles === stats.totalVehicles &&
            newStats.activeLicenses === stats.activeLicenses &&
            newStats.pendingApproval === stats.pendingApproval &&
            newStats.expiringSoon === stats.expiringSoon
          ) {
            clearInterval(interval);
          }
          
          return newStats;
        });
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [stats]);
  
  // Calcular a porcentagem para o componente de progresso
  const calculateProgress = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
  };
  
  return (
    <MobileLayout title="Dashboard">
      <div className="space-y-4">
        {/* Saudação */}
        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Olá, {user?.fullName?.split(' ')[0] || 'Usuário'}
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao sistema de controle de licenças AET
          </p>
        </section>
        
        {/* Ações rápidas */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ações rápidas</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Link href="/vehicles">
              <Card className="h-full cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-4 h-full">
                  <Truck className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-sm font-medium text-center">Meus Veículos</span>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/request-license">
              <Card className="h-full cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-4 h-full">
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-sm font-medium text-center">Nova Licença</span>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/track-license">
              <Card className="h-full cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-4 h-full">
                  <ClipboardCheck className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-sm font-medium text-center">Acompanhar</span>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/issued-licenses">
              <Card className="h-full cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-4 h-full">
                  <Clock className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-sm font-medium text-center">Licenças Emitidas</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
        
        {/* Estatísticas */}
        <section className="space-y-3 mt-6">
          <h3 className="text-lg font-semibold">Estatísticas</h3>
          
          <div className="space-y-3">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-[120px]" />
                      <Skeleton className="h-6 w-[40px]" />
                    </div>
                    <Skeleton className="h-2 w-full mt-3" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Veículos Cadastrados</h4>
                      <span className="text-xl font-bold">{animatedStats.totalVehicles}</span>
                    </div>
                    <Progress value={100} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Licenças Ativas</h4>
                      <span className="text-xl font-bold">{animatedStats.activeLicenses}</span>
                    </div>
                    <Progress 
                      value={calculateProgress(animatedStats.activeLicenses, stats?.totalLicenses || 1)} 
                      className="h-2 mt-2" 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Pendentes de Aprovação</h4>
                      <span className="text-xl font-bold">{animatedStats.pendingApproval}</span>
                    </div>
                    <Progress 
                      value={calculateProgress(animatedStats.pendingApproval, stats?.totalLicenses || 1)} 
                      className="h-2 mt-2" 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Expirando em Breve</h4>
                      <span className="text-xl font-bold">{animatedStats.expiringSoon}</span>
                    </div>
                    <Progress 
                      value={calculateProgress(animatedStats.expiringSoon, stats?.activeLicenses || 1)} 
                      className="h-2 mt-2 bg-amber-200"
                      indicatorClassName="bg-amber-500" 
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>
        
        {/* Admin Link (apenas para usuários administrativos) */}
        {user && isAdminUser(user) && (
          <div className="mt-6">
            <Link href="/admin">
              <Button className="w-full" variant="outline">
                Acessar Painel Administrativo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}