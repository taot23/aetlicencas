import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  ClipboardList, 
  Building2, 
  Users, 
  Truck, 
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/ui/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const userInitials = user?.fullName
    ?.split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AD';

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      }
    });
  };
  
  const handleNavigate = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  // Função para verificar se o usuário tem permissão para acessar o item
  const canAccessMenuItem = (requireRole: string) => {
    if (requireRole === 'admin') {
      return user?.role === 'admin' || user?.isAdmin;
    }
    if (requireRole === 'supervisor') {
      return user?.role === 'admin' || user?.role === 'supervisor' || user?.isAdmin;
    }
    if (requireRole === 'operational') {
      return user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'operational' || user?.isAdmin;
    }
    return true;
  };

  const NavItems = () => (
    <>
      <div className="flex items-center justify-center h-16 px-4 bg-gray-900">
        <Logo width={120} className="py-2" />
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/admin" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/admin")}
        >
          <LayoutDashboard className="mr-3 h-5 w-5" />
          Painel de Controle
        </Button>
        
        {canAccessMenuItem('operational') && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-gray-700",
              location === "/admin/licenses" ? "bg-gray-700" : "bg-transparent"
            )}
            onClick={() => handleNavigate("/admin/licenses")}
          >
            <ClipboardList className="mr-3 h-5 w-5" />
            Gerenciar Licenças
          </Button>
        )}
        
        {canAccessMenuItem('operational') && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-gray-700",
              location === "/admin/transporters" ? "bg-gray-700" : "bg-transparent"
            )}
            onClick={() => handleNavigate("/admin/transporters")}
          >
            <Building2 className="mr-3 h-5 w-5" />
            Transportadores
          </Button>
        )}
        
        {canAccessMenuItem('admin') && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-gray-700",
              location === "/admin/users" ? "bg-gray-700" : "bg-transparent"
            )}
            onClick={() => handleNavigate("/admin/users")}
          >
            <Users className="mr-3 h-5 w-5" />
            Usuários
          </Button>
        )}
        
        {canAccessMenuItem('operational') && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-gray-700",
              location === "/admin/vehicles" ? "bg-gray-700" : "bg-transparent"
            )}
            onClick={() => handleNavigate("/admin/vehicles")}
          >
            <Truck className="mr-3 h-5 w-5" />
            Veículos
          </Button>
        )}
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            "mt-4 border-t border-gray-700 pt-4"
          )}
          onClick={() => handleNavigate("/")}
        >
          <ArrowLeft className="mr-3 h-5 w-5" />
          Voltar ao Sistema
        </Button>
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 bg-gray-500">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.fullName}</p>
            <p className="text-xs text-gray-300">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto text-gray-300 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {isMobile ? (
        <>
          <div className="md:hidden fixed inset-x-0 top-0 z-20 bg-gray-900 text-white flex items-center h-16 px-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-gray-800 text-white w-[250px]">
                <NavItems />
              </SheetContent>
            </Sheet>
            <div className="ml-2 flex items-center">
              <Logo width={100} className="ml-2" />
              <span className="ml-2 text-lg font-semibold">Admin</span>
            </div>
          </div>
          <div className="pt-16 md:pt-0 w-full">
            <main className="p-4">
              {children}
            </main>
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:flex md:flex-col md:w-64 fixed inset-y-0 bg-gray-800 text-white shadow-lg z-10">
            <NavItems />
          </div>
          <div className="flex-1 md:ml-64">
            <main className="md:py-8 md:px-6 p-4 md:pt-8 pt-4">
              {children}
            </main>
          </div>
        </>
      )}

      {/* Footer - apenas em telas maiores */}
      {!isMobile && (
        <footer className="fixed bottom-0 right-0 md:ml-64 w-full md:w-[calc(100%-16rem)] bg-white border-t py-2 z-10">
          <div className="container mx-auto px-4 text-center">
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} NVS Licenças. Todos os direitos reservados.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}