import { FC } from 'react';
import { Truck } from 'lucide-react';

// Importando as imagens dos tipos de veículos
import bitrain6AxlesImg from '../../assets/vehicles/bitrain_6_axles.png';
import bitrain7AxlesImg from '../../assets/vehicles/bitrain_7_axles.png';
import bitrain9AxlesImg from '../../assets/vehicles/bitrain_9_axles.png';
import roadtrain9AxlesImg from '../../assets/vehicles/roadtrain_9_axles.png';
import flatbedImg from '../../assets/vehicles/flatbed.png';
import romeoAndJulietImg from '../../assets/vehicles/romeo_and_juliet.png';

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
          className={`w-auto ${className}`}
          style={{ 
            height: `${iconSize}px`,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      );
    case 'bitrain_9_axles':
      return (
        <img 
          src={bitrain9AxlesImg} 
          alt="Bitrem 9 eixos" 
          className={`w-auto ${className}`}
          style={{ 
            height: `${iconSize}px`,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      );
    case 'bitrain_7_axles':
      return (
        <img 
          src={bitrain7AxlesImg} 
          alt="Bitrem 7 eixos" 
          className={`w-auto ${className}`}
          style={{ 
            height: `${iconSize}px`,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      );
    case 'roadtrain_9_axles':
      return (
        <img 
          src={roadtrain9AxlesImg} 
          alt="Rodotrem 9 eixos" 
          className={`w-auto ${className}`}
          style={{ 
            height: `${iconSize}px`,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      );
    case 'flatbed':
      return (
        <img 
          src={flatbedImg} 
          alt="Prancha" 
          className={`w-auto ${className}`}
          style={{ 
            height: `${iconSize}px`,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      );
    case 'romeo_and_juliet':
      return (
        <img 
          src={romeoAndJulietImg} 
          alt="Romeu e Julieta" 
          className={`w-auto ${className}`}
          style={{ 
            height: `${iconSize}px`,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      );
    // Adicionar mais cases para outros tipos conforme necessário
    
    default:
      // Para tipos sem imagem específica, usar o ícone padrão
      return <Truck className={className} size={iconSize} />;
  }
};