import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/hooks/use-websocket";
import { Loader2 } from "lucide-react";

interface RenewLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: number;
  state: string;
}

export function RenewLicenseDialog({
  open,
  onOpenChange,
  licenseId,
  state,
}: RenewLicenseDialogProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { sendMessage } = useWebSocket();
  
  // Mutação para renovar a licença
  const renewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/licenses/${licenseId}/renew`,
        { state }
      );
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Erro ao renovar licença");
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Licença renovada com sucesso",
        description: `Um rascunho de renovação foi criado para o estado ${state}`,
      });
      
      // Invalidar consultas para atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/licenses/issued"] });
      queryClient.invalidateQueries({ queryKey: ["/api/licenses/track"] });
      queryClient.invalidateQueries({ queryKey: ["/api/licenses/drafts"] });
      
      // Notificar via WebSocket
      sendMessage({
        type: "LICENSE_UPDATE",
        data: { message: "Licença renovada" },
      });
      
      // Fechar o diálogo e redirecionar para edição do rascunho
      onOpenChange(false);
      
      // Redirecionar para o rascunho criado
      if (data.draft && data.draft.id) {
        navigate(`/request-license?draft=${data.draft.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao renovar licença",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Renovar Licença</DialogTitle>
          <DialogDescription>
            Você está prestes a renovar a licença para o estado {state}. 
            Um novo rascunho será criado com base na licença atual.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <div className="p-2 bg-muted rounded-md">
              {state}
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Após a renovação, você será redirecionado para a tela de edição do rascunho, 
              onde poderá revisar e atualizar as informações antes de submeter.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={renewMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => renewMutation.mutate()}
            disabled={renewMutation.isPending}
          >
            {renewMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Renovando...
              </>
            ) : (
              "Renovar Licença"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}