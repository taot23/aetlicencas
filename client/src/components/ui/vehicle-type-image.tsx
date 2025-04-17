import { FC } from 'react';
import { Truck } from 'lucide-react';

// Importando as imagens dos tipos de veículos
import bitrain6AxlesImg from '../../assets/vehicles/bitrain_6_axles.png';
import bitrain7AxlesImg from '../../assets/vehicles/bitrain_7_axles.png';
import bitrain9AxlesImg from '../../assets/vehicles/bitrain_9_axles.png';

interface VehicleTypeImageProps {
  type: string;
  className?: string;
  iconSize?: number;
}

export const VehicleTypeImage: FC<VehicleTypeImageProps> = ({ 
  type, 
  className = "",
  iconSize = 20
}) => {
  // Verificar o tipo de veículo e retornar a imagem apropriada
  switch (type) {
    case 'bitrain_6_axles':
      return (
        <img 
          src={bitrain6AxlesImg} 
          alt="Bitrem 6 eixos" 
          className={`w-auto h-${iconSize} ${className}`}
          style={{ maxHeight: `${iconSize * 4}px` }}
        />
      );
    case 'bitrain_9_axles':
      return (
        <img 
          src={bitrain9AxlesImg} 
          alt="Bitrem 9 eixos" 
          className={`w-auto h-${iconSize} ${className}`}
          style={{ maxHeight: `${iconSize * 4}px` }}
        />
      );
    case 'bitrain_7_axles':
      return (
        <img 
          src={bitrain7AxlesImg} 
          alt="Bitrem 7 eixos" 
          className={`w-auto h-${iconSize} ${className}`}
          style={{ maxHeight: `${iconSize * 4}px` }}
        />
      );
    // Adicionar mais cases para outros tipos conforme necessário
    
    default:
      // Para tipos sem imagem específica, usar o ícone padrão
      return <Truck className={className} size={iconSize} />;
  }
};