import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DetailsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  titleClassName?: string;
}

export function DetailsSection({
  title,
  children,
  className,
  defaultOpen = false,
  titleClassName
}: DetailsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border rounded-lg overflow-hidden mb-4", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors",
          titleClassName
        )}
      >
        <span className="font-medium">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}