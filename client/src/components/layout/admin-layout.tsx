import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      }
    });
  };

  const MobileMenuLinks = () => (
    <>
      <div className="px-1 py-4 hover:bg-gray-100 rounded-md">
        <Link href="/admin">
          <span className={`text-sm font-medium block py-2 ${location === "/admin" ? "text-blue-600" : "text-gray-600"}`}>
            Painel de Controle
          </span>
        </Link>
      </div>
      <div className="px-1 py-4 hover:bg-gray-100 rounded-md">
        <Link href="/admin/transporters">
          <span className={`text-sm font-medium block py-2 ${location === "/admin/transporters" ? "text-blue-600" : "text-gray-600"}`}>
            Cadastro Transportador
          </span>
        </Link>
      </div>
      <div className="px-1 py-4 hover:bg-gray-100 rounded-md">
        <Link href="/admin/licenses">
          <span className={`text-sm font-medium block py-2 ${location === "/admin/licenses" ? "text-blue-600" : "text-gray-600"}`}>
            Gerenciar Licenças
          </span>
        </Link>
      </div>
      <div className="px-1 py-4 hover:bg-gray-100 rounded-md">
        <Link href="/">
          <span className="text-sm font-medium block py-2 text-gray-600">
            Voltar ao Sistema
          </span>
        </Link>
      </div>
    </>
  );
  
  const DesktopMenuLinks = () => (
    <>
      <Link href="/admin">
        <a className={`text-sm font-medium ${location === "/admin" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}>
          Painel de Controle
        </a>
      </Link>
      <Link href="/admin/transporters">
        <a className={`text-sm font-medium ${location === "/admin/transporters" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}>
          Cadastro Transportador
        </a>
      </Link>
      <Link href="/admin/licenses">
        <a className={`text-sm font-medium ${location === "/admin/licenses" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}>
          Gerenciar Licenças
        </a>
      </Link>
      <Link href="/">
        <a className="text-sm font-medium text-gray-600 hover:text-blue-600">
          Voltar ao Sistema
        </a>
      </Link>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with logo and top navigation */}
      <header className="bg-gray-800 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Portal Administrativo AET</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isMobile && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="text-white p-1" size="icon">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[250px]">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col mt-6">
                      <MobileMenuLinks />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              <Button 
                variant="ghost" 
                className="text-white hover:bg-gray-700"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main navigation - visible only on larger screens */}
      <div className="bg-white border-b hidden md:block">
        <div className="container mx-auto px-4">
          <nav className="flex items-center space-x-6 h-12">
            <DesktopMenuLinks />
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-grow py-4 md:py-6 px-3 md:px-4">
        <div className="container mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Portal Administrativo AET. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}