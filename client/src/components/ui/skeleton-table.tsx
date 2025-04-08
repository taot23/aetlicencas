import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonTableProps {
  columns: number;
  rows: number;
  className?: string;
}

export function SkeletonTable({ columns, rows, className }: SkeletonTableProps) {
  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {/* Header row */}
        {Array.from({ length: columns }).map((_, index) => (
          <div key={`header-${index}`} className="p-3 border-b">
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
        
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={`cell-${rowIndex}-${colIndex}`} 
              className="p-3 border-b"
            >
              <Skeleton 
                className={cn(
                  "h-5", 
                  colIndex === 0 ? "w-full" : "w-2/3"
                )} 
              />
            </div>
          ))
        ))}
      </div>
    </div>
  );
}