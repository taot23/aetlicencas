import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Transporter } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserSelect } from "./user-select";

interface TransporterLinkUserProps {
  transporter: Transporter;
  onSuccess?: () => void;
}

export function TransporterLinkUser({ transporter, onSuccess }: TransporterLinkUserProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(transporter.userId || null);

  // Mutação para vincular transportador a usuário
  const linkUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/transporters/${transporter.id}/link`, {
        userId: selectedUserId
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: selectedUserId ? "Usuário vinculado com sucesso" : "Vínculo removido com sucesso",
        description: selectedUserId 
          ? "O usuário selecionado agora pode gerenciar este transportador"
          : "O transportador não está mais vinculado a nenhum usuário",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao vincular usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const isPending = linkUserMutation.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Vinculação com Usuário</CardTitle>
        <CardDescription>
          Selecione o usuário que será responsável por gerenciar este transportador.
          Este usuário terá acesso aos veículos e licenças deste transportador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserSelect
          selectedUserId={selectedUserId}
          onChange={setSelectedUserId}
          description="O usuário selecionado terá acesso para gerenciar este transportador, seus veículos e licenças."
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={() => linkUserMutation.mutate()} 
          disabled={isPending || (selectedUserId === transporter.userId)}
        >
          {isPending ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Processando...</span>
            </>
          ) : selectedUserId ? (
            selectedUserId === transporter.userId ? "Já vinculado" : "Vincular Usuário"
          ) : (
            "Remover Vínculo"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}