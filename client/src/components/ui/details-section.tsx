import { ReactNode } from "react";

interface DetailsSectionProps {
  title: string;
  children: ReactNode;
}

export function DetailsSection({ title, children }: DetailsSectionProps) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="text-sm">{children}</div>
    </div>
  );
}