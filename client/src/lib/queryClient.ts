import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { 
    headers?: Record<string, string>;
    isFormData?: boolean;
  }
): Promise<Response> {
  // Verifica se é FormData diretamente ou pela flag
  const isFormData = data instanceof FormData || options?.isFormData === true;
  const headers = options?.headers || {};
  
  // Não definimos Content-Type para FormData, o navegador define automaticamente com o boundary correto
  if (data && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(url, {
    method,
    headers,
    // Para FormData não usamos JSON.stringify
    body: isFormData ? (data as BodyInit) : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Melhoria de performance: mantemos os dados em cache por 5 minutos
      staleTime: 5 * 60 * 1000, // 5 minutos
      // Melhoria de UX: recarregamos dados quando o usuário volta à janela
      refetchOnWindowFocus: true,
      // Tentamos mais uma vez para tolerância a falhas temporárias
      retry: 1,
      // Melhoria de UX: Reusamos cache enquanto revalidamos para mostrar dados mais rápido
      keepPreviousData: true,
      // Mostrar dados imediatamente, mesmo que desatualizados (sensação de UI mais rápida)
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1, // Uma tentativa adicional para mutações também
    },
  },
});
