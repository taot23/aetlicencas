import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <div className="md:py-8 md:px-6 p-4 md:pt-8 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
