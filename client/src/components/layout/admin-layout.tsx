import { ReactNode } from "react";
import { UnifiedLayout } from "./unified-layout";

interface AdminLayoutProps {
  children: ReactNode;
  contentKey?: string;
}

export function AdminLayout({ children, contentKey }: AdminLayoutProps) {
  return (
    <UnifiedLayout contentKey={contentKey}>
      {children}
    </UnifiedLayout>
  );
}