import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Home, Truck, FileText, ClipboardList, ListChecks, LogOut, ChevronRight, Building2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isOperational = user?.role === 'operational' || user?.role === 'supervisor' || user?.isAdmin;
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const userInitials = user?.fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  const NavItems = () => (
    <>
      <div className="flex items-center justify-center h-16 px-4 bg-gray-900">
        <h1 className="text-xl font-bold">Sistema AET</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/")}
        >
          <Home className="mr-3 h-5 w-5" />
          Dashboard
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/my-companies" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/my-companies")}
        >
          <Building2 className="mr-3 h-5 w-5" />
          Minhas Empresas
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/vehicles" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/vehicles")}
        >
          <Truck className="mr-3 h-5 w-5" />
          Veículos Cadastrados
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/request-license" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/request-license")}
        >
          <FileText className="mr-3 h-5 w-5" />
          Solicitar Licença
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/track-license" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/track-license")}
        >
          <ClipboardList className="mr-3 h-5 w-5" />
          Acompanhar Licença
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-gray-700",
            location === "/issued-licenses" ? "bg-gray-700" : "bg-transparent"
          )}
          onClick={() => handleNavigate("/issued-licenses")}
        >
          <ListChecks className="mr-3 h-5 w-5" />
          Licenças Emitidas
        </Button>
        
        {isOperational && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-gray-700",
              location === "/gerenciar-licencas" ? "bg-gray-700" : "bg-transparent"
            )}
            onClick={() => handleNavigate("/gerenciar-licencas")}
          >
            <ClipboardCheck className="mr-3 h-5 w-5" />
            Gerenciar Licenças
          </Button>
        )}
        
        {user?.isAdmin && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-gray-700",
              location === "/admin" ? "bg-gray-700" : "bg-transparent"
            )}
            onClick={() => handleNavigate("/admin")}
          >
            <ChevronRight className="mr-3 h-5 w-5" />
            Painel Admin
          </Button>
        )}
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

  return isMobile ? (
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
        <h1 className="ml-2 text-lg font-semibold">Sistema AET</h1>
      </div>
      <div className="pt-16 md:pt-0"></div>
    </>
  ) : (
    <div className={cn("hidden md:flex md:flex-col md:w-64 fixed inset-y-0 bg-gray-800 text-white shadow-lg z-10", className)}>
      <NavItems />
    </div>
  );
}
