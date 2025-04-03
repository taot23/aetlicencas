import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with logo and top navigation */}
      <header className="bg-gray-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Portal Administrativo AET</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-gray-700"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <nav className="flex items-center space-x-6 h-12">
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
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-grow py-6 px-4">
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