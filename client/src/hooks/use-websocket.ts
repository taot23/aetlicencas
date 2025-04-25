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
          console.log('Dados WebSocket recebidos:', event.data);
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('Mensagem processada:', message);
          
          // Verificações mais rigorosas da estrutura da mensagem
          if (!message || typeof message !== 'object') {
            console.error('Mensagem inválida recebida:', message);
            return;
          }
          
          // Log detalhado para mensagens de tipo STATUS_UPDATE
          if (message.type === 'STATUS_UPDATE') {
            console.log('STATUS_UPDATE detalhado:', {
              licenseId: message.data?.licenseId,
              state: message.data?.state,
              status: message.data?.status,
              hasStateStatuses: !!message.data?.stateStatuses,
              stateStatusesLength: message.data?.stateStatuses?.length,
              stateStatuses: message.data?.stateStatuses
            });
            
            // Se a mensagem contém stateStatuses, fazer verificação adicional
            if (message.data?.stateStatuses) {
              // Verificar se é um array e tem elementos
              if (Array.isArray(message.data.stateStatuses) && message.data.stateStatuses.length > 0) {
                console.log('Dados de status válidos encontrados na mensagem');
              } else {
                console.warn('Array de stateStatuses está vazio ou inválido');
              }
            }
          }
          
          // Atualizar último estado da mensagem
          setLastMessage(message);
          
          // Processar mensagem conforme o tipo
          if (message.type) {
            invalidateQueryData(message.type, message.data);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
          console.error('Texto da mensagem:', event.data);
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