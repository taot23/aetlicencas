import { FC } from 'react';
import { Truck } from 'lucide-react';

// Importando a imagem do Bitrem 6 eixos
import bitrain6AxlesImg from '../../assets/vehicles/bitrain_6_axles.png';

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
    // Adicionar mais cases para outros tipos conforme necessário
    
    default:
      // Para tipos sem imagem específica, usar o ícone padrão
      return <Truck className={className} size={iconSize} />;
  }
};