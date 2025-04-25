import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useMobileDetector } from './use-mobile-detector';

interface MobileContextType {
  isMobile: boolean;
  isMobileNav: boolean;
  isTablet: boolean;
}

// Cria o contexto com valor default
const MobileContext = createContext<MobileContextType>({
  isMobile: false,
  isMobileNav: false,
  isTablet: false
});

// Hook para usar o contexto
export function useMobileContext() {
  return useContext(MobileContext);
}

// Provider para o contexto de dispositivo móvel
export function MobileProvider({ children }: { children: ReactNode }) {
  const { isMobile } = useMobileDetector();
  
  // Valores calculados para diferentes tipos de dispositivos
  const values = useMemo(() => {
    // Verificar também outros tipos de dispositivos baseados em largura
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    const isMobileNav = window.innerWidth <= 1024;
    
    return {
      isMobile,
      isMobileNav,
      isTablet
    };
  }, [isMobile]);
  
  return (
    <MobileContext.Provider value={values}>
      {children}
    </MobileContext.Provider>
  );
}