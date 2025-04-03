import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { User } from "@shared/schema";
import { UsersRound, Truck, FileCheck, FileWarning, Calendar, ArrowRight } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusChart } from "@/components/dashboard/status-chart";
import { LicenseTable } from "@/components/dashboard/license-table";
import { getQueryFn } from "@/lib/queryClient";

// Definição do tipo de dados para o dashboard
type DashboardStats = {
  issuedLicenses: number;
  pendingLicenses: number;
  registeredVehicles: number;
  activeVehicles: number;
  recentLicenses: Array<{
    id: number;
    requestNumber: string;
    type: string;
    mainVehiclePlate: string;
    states: string[];
    status: string;
    createdAt: string;
  }>;
};

export default function AdminDashboardPage() {
  const [_, navigate] = useLocation();
  
  // Buscar estatísticas do painel
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Buscar stats de veículos
  const { data: vehicleStats = [] } = useQuery({
    queryKey: ["/api/admin/dashboard/vehicle-stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Buscar stats de estados
  const { data: stateStats = [] } = useQuery({
    queryKey: ["/api/admin/dashboard/state-stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Últimos 6 meses para o gráfico de linha
  const monthlyData = [
    { name: "Jan", licenças: 4 },
    { name: "Fev", licenças: 6 },
    { name: "Mar", licenças: 8 },
    { name: "Abr", licenças: 7 },
    { name: "Mai", licenças: 12 },
    { name: "Jun", licenças: 9 },
  ];
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-muted-foreground">
              Bem-vindo ao painel de controle de licenças AET.
            </p>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Tabs defaultValue="day">
              <TabsList>
                <TabsTrigger value="day">Hoje</TabsTrigger>
                <TabsTrigger value="week">Esta Semana</TabsTrigger>
                <TabsTrigger value="month">Este Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Transportadores"
            value={stats?.issuedLicenses || 0}
            icon={<UsersRound className="h-5 w-5 text-muted-foreground" />}
            trend={12}
            trendText="em relação ao mês anterior"
            color="primary"
          />
          <StatsCard
            title="Veículos Cadastrados"
            value={stats?.registeredVehicles || 0}
            icon={<Truck className="h-5 w-5 text-muted-foreground" />}
            trend={-2}
            trendText="em relação ao mês anterior"
            color="blue"
          />
          <StatsCard
            title="Licenças Emitidas"
            value={stats?.issuedLicenses || 0}
            icon={<FileCheck className="h-5 w-5 text-muted-foreground" />}
            trend={8}
            trendText="em relação ao mês anterior"
            color="yellow"
          />
          <StatsCard
            title="Licenças Pendentes"
            value={stats?.pendingLicenses || 0}
            icon={<FileWarning className="h-5 w-5 text-muted-foreground" />}
            trend={5}
            trendText="em relação ao mês anterior"
            color="primary"
          />
        </div>
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-4">
          <Card className="col-span-1 md:col-span-2 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-normal">Histórico de Licenças Emitidas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="licenças" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs text-muted-foreground" />
                    <YAxis className="text-xs text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="licenças"
                      stroke="var(--color-primary)"
                      fillOpacity={1}
                      fill="url(#licenças)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-normal">Solicitações por Status</CardTitle>
              <CardDescription>
                Distribuição de status das licenças
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusChart type="vehicle" isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-4">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Licenças Recentes</CardTitle>
                <CardDescription>Últimas solicitações recebidas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/licenses")}>
                Ver Todas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              <LicenseTable licenses={stats?.recentLicenses || []} isLoading={isLoading} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-normal">Solicitações por Estado</CardTitle>
              <CardDescription>
                Distribuição geográfica das licenças
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusChart type="state" isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}