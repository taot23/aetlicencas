import { ReactNode } from "react";
import { UnifiedLayout } from "./unified-layout";

interface MainLayoutProps {
  children: ReactNode;
  contentKey?: string;
}

export function MainLayout({ children, contentKey }: MainLayoutProps) {
  return (
    <UnifiedLayout contentKey={contentKey}>
      {children}
    </UnifiedLayout>
  );
}
