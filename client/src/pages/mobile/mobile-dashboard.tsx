import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layouts/mobile-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowRight, 
  Truck, 
  FileText, 
  ClipboardCheck, 
  Clock, 
  Users, 
  FileCheck, 
  AlertTriangle 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminUser } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/mobile/stat-card";

interface DashboardStats {
  totalVehicles: number;
  activeLicenses: number;
  pendingApproval: number;
  expiringSoon: number;
  totalLicenses?: number;
}

export default function MobileDashboardPage() {
  const { user } = useAuth();
  const [animatedStats, setAnimatedStats] = useState({
    totalVehicles: 0,
    activeLicenses: 0,
    pendingApproval: 0,
    expiringSoon: 0
  });
  
  // Buscar estatísticas do dashboard
  const { data: stats, isLoading } = useQuery<DashboardStats>({
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
      <div className="space-y-6">
        {/* Saudação */}
        <section className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            Olá, {user?.fullName?.split(' ')[0] || 'Usuário'}
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao sistema de controle de licenças AET
          </p>
        </section>
        
        {/* Ações rápidas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ações rápidas</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Link href="/vehicles" className="no-underline">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm h-full border border-blue-100 hover:shadow-md transition-all flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-800 text-center">Meus Veículos</span>
              </div>
            </Link>
            
            <Link href="/request-license" className="no-underline">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm h-full border border-green-100 hover:shadow-md transition-all flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-800 text-center">Nova Licença</span>
              </div>
            </Link>
            
            <Link href="/track-license" className="no-underline">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm h-full border border-purple-100 hover:shadow-md transition-all flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-3">
                  <ClipboardCheck className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-purple-800 text-center">Acompanhar</span>
              </div>
            </Link>
            
            <Link href="/issued-licenses" className="no-underline">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 shadow-sm h-full border border-amber-100 hover:shadow-md transition-all flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-amber-800 text-center">Licenças Emitidas</span>
              </div>
            </Link>
          </div>
        </section>
        
        {/* Estatísticas */}
        <section className="space-y-3 mt-6">
          <h3 className="text-lg font-semibold">Estatísticas</h3>
          
          <div className="space-y-3">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                  <Skeleton className="h-5 w-[120px] mb-2" />
                  <div className="flex items-center">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-8 w-16 ml-3" />
                  </div>
                  <Skeleton className="h-4 w-32 mt-2" />
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard
                  title="Veículos Cadastrados"
                  value={animatedStats.totalVehicles}
                  icon={<Truck className="h-6 w-6 text-blue-500" />}
                  changePercentage={2}
                  iconClassName="bg-blue-50"
                />
                
                <StatCard
                  title="Licenças Ativas"
                  value={animatedStats.activeLicenses}
                  icon={<FileCheck className="h-6 w-6 text-green-500" />}
                  changePercentage={8}
                  iconClassName="bg-green-50"
                  valueClassName="text-green-600"
                />
                
                <StatCard
                  title="Pendentes de Aprovação"
                  value={animatedStats.pendingApproval}
                  icon={<Clock className="h-6 w-6 text-purple-500" />}
                  changePercentage={-5}
                  iconClassName="bg-purple-50"
                  valueClassName="text-purple-600"
                />
                
                <StatCard
                  title="Expirando em Breve"
                  value={animatedStats.expiringSoon}
                  icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
                  changePercentage={12}
                  iconClassName="bg-amber-50"
                  valueClassName="text-amber-600"
                />
              </div>
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