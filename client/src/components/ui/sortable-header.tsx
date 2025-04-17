import React from 'react';
import { TableHead } from './table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort: string | null;
  currentDirection: SortDirection;
  onSort: (column: string) => void;
  className?: string;
}

export function SortableHeader({
  column,
  label,
  currentSort,
  currentDirection,
  onSort,
  className
}: SortableHeaderProps) {
  // Determina qual ícone mostrar com base no estado atual de ordenação
  const renderSortIcon = () => {
    if (currentSort !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    
    if (currentDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4 text-primary" />;
    }
    
    if (currentDirection === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    }
    
    return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
  };

  return (
    <TableHead 
      className={cn("cursor-pointer select-none", className)}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center">
        {label}
        {renderSortIcon()}
      </div>
    </TableHead>
  );
}