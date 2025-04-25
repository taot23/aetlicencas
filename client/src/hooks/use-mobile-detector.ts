import { useState, useEffect } from 'react';

export function useMobileDetector() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Verificar se está em um dispositivo móvel
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      
      // Verificar também tamanho de tela como indício de dispositivo móvel
      const isMobileBySize = window.innerWidth <= 768;
      const isMobileByAgent = mobileRegex.test(userAgent);
      
      setIsMobile(isMobileByAgent || isMobileBySize);
    };
    
    // Verifique ao carregar e ao redimensionar
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  return { isMobile };
}