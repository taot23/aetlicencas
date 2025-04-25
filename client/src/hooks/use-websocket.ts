import { useState, useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

// Tipos de mensagem
export type WebSocketMessage = {
  type: 'STATUS_UPDATE' | 'LICENSE_UPDATE' | 'CONNECTED';
  data?: any;
  message?: string;
};

// Hook para usar WebSocket
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Função para invalidar o cache e forçar o recarregamento de dados
  const invalidateQueryData = useCallback((type: string, data: any) => {
    if (type === 'STATUS_UPDATE') {
      // Quando status é atualizado, invalidar cache de licenças
      console.log('Invalidando cache de licenças:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/licenses'] });
      
      // Se tiver o ID específico da licença, invalidar essa licença também
      if (data.licenseId) {
        queryClient.invalidateQueries({ queryKey: [`/api/licenses/${data.licenseId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/licenses/${data.licenseId}`] });
      }
    }
  }, []);

  // Inicializar a conexão WebSocket
  useEffect(() => {
    // Função para conectar ao WebSocket
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Conectando ao WebSocket em ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
      };
      
      socket.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        // Tentar reconectar após 3 segundos
        setTimeout(connectWebSocket, 3000);
      };
      
      socket.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        socket.close();
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('Mensagem recebida:', message);
          setLastMessage(message);
          
          // Processar mensagem conforme o tipo
          if (message.type) {
            invalidateQueryData(message.type, message.data);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };
    };
    
    // Conectar ao WebSocket
    connectWebSocket();
    
    // Cleanup na desmontagem
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [invalidateQueryData]);
  
  return { isConnected, lastMessage };
}