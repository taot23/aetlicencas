import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/licenses/status-badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface License {
  id: number;
  requestNumber: string;
  type: string;
  mainVehiclePlate: string;
  states: string[];
  status: string;
  createdAt: string;
}

interface LicenseTableProps {
  licenses: License[];
  isLoading: boolean;
}

export function LicenseTable({ licenses, isLoading }: LicenseTableProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº do Pedido</TableHead>
            <TableHead>Conjunto</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Estados</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licenses.length > 0 ? (
            licenses.map((license) => (
              <TableRow key={license.id}>
                <TableCell className="font-medium">{license.requestNumber}</TableCell>
                <TableCell>
                  {license.type === "roadtrain_9_axles" && "Rodotrem 9 eixos"}
                  {license.type === "bitrain_9_axles" && "Bitrem 9 eixos"}
                  {license.type === "bitrain_7_axles" && "Bitrem 7 eixos"}
                  {license.type === "bitrain_6_axles" && "Bitrem 6 eixos"}
                  {license.type === "flatbed" && "Prancha"}
                </TableCell>
                <TableCell>{license.mainVehiclePlate}</TableCell>
                <TableCell>{license.states.join(", ")}</TableCell>
                <TableCell>
                  <StatusBadge status={license.status} />
                </TableCell>
                <TableCell>
                  {license.createdAt && format(new Date(license.createdAt), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">Nenhuma licença encontrada.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
