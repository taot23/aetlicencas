import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2, AlertCircle } from "lucide-react";

interface UserSelectProps {
  selectedUserId: number | null;
  onChange: (userId: number | null) => void;
  label?: string;
  description?: string;
  required?: boolean;
}

export function UserSelect({ 
  selectedUserId, 
  onChange, 
  label = "Usuário Vinculado", 
  description,
  required = false 
}: UserSelectProps) {
  const [value, setValue] = useState<string>(selectedUserId ? String(selectedUserId) : "");

  // Buscar usuários não-admin
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["/api/admin/non-admin-users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/non-admin-users");
      return await response.json();
    },
  });

  useEffect(() => {
    // Atualizar o valor quando selectedUserId mudar
    setValue(selectedUserId ? String(selectedUserId) : "");
  }, [selectedUserId]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onChange(newValue ? parseInt(newValue) : null);
  };

  const handleClear = () => {
    setValue("");
    onChange(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>}
        <div className="flex items-center justify-center h-10 border rounded-md px-3">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">Carregando usuários...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>Erro ao carregar usuários</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>}
      {description && <p className="text-sm text-gray-500 mb-2">{description}</p>}
      <div className="flex gap-2">
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {users.length === 0 ? (
              <div className="p-2 text-center text-sm text-gray-500">
                Nenhum usuário disponível
              </div>
            ) : (
              users.map((user: User) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  <div className="flex items-center gap-2">
                    <UserCircle2 size={16} className="text-gray-400" />
                    <span>{user.fullName}</span>
                    <span className="text-sm text-gray-500">({user.email})</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {value && (
          <Button variant="outline" type="button" onClick={handleClear}>
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}