-- Adicionar uma unidade tratora
INSERT INTO vehicles (user_id, plate, renavam, type, brand, model, axles)
VALUES (
  2, -- ID do usuário transportador
  'ABC1D23', -- Placa no formato Mercosul
  '12345678901', -- Renavam
  'tractor_unit', -- Tipo: unidade tratora
  'VOLVO', -- Marca
  'FH 460', -- Modelo
  3 -- Eixos
);

-- Adicionar 20 semirreboques
INSERT INTO vehicles (user_id, plate, renavam, type, brand, model, axles)
VALUES 
(2, 'DEF2G45', '23456789012', 'semi_trailer', 'RANDON', 'SR GR', 3),
(2, 'GHI3J67', '34567890123', 'semi_trailer', 'GUERRA', 'SLIM', 2),
(2, 'JKL4M89', '45678901234', 'semi_trailer', 'FACCHINI', 'SRB', 4),
(2, 'MNO5P01', '56789012345', 'semi_trailer', 'NOMA', 'BITREM', 3),
(2, 'QRS6T23', '67890123456', 'semi_trailer', 'LIBRELATO', 'RODOTREM', 2),
(2, 'UVW7X45', '78901234567', 'semi_trailer', 'KRONE', 'VANDERLEIA', 3),
(2, 'YZA8B67', '89012345678', 'semi_trailer', 'RANDON', 'SR GR', 2),
(2, 'CDE9F89', '90123456789', 'semi_trailer', 'GUERRA', 'SLIM', 3),
(2, 'GHI0J01', '01234567890', 'semi_trailer', 'FACCHINI', 'SRB', 2),
(2, 'KLM1N23', '12345678902', 'semi_trailer', 'NOMA', 'BITREM', 4),
(2, 'OPQ2R45', '23456789023', 'semi_trailer', 'LIBRELATO', 'RODOTREM', 3),
(2, 'STU3V67', '34567890234', 'semi_trailer', 'KRONE', 'VANDERLEIA', 2),
(2, 'WXY4Z89', '45678902345', 'semi_trailer', 'RANDON', 'SR GR', 3),
(2, 'ABC5D01', '56789023456', 'semi_trailer', 'GUERRA', 'SLIM', 2),
(2, 'EFG6H23', '67890234567', 'semi_trailer', 'FACCHINI', 'SRB', 3),
(2, 'IJK7L45', '78902345678', 'semi_trailer', 'NOMA', 'BITREM', 2),
(2, 'MNO8P67', '89023456789', 'semi_trailer', 'LIBRELATO', 'RODOTREM', 4),
(2, 'QRS9T89', '90234567890', 'semi_trailer', 'KRONE', 'VANDERLEIA', 3),
(2, 'UVW0X01', '02345678901', 'semi_trailer', 'RANDON', 'SR GR', 2),
(2, 'YZA1B23', '12345678903', 'semi_trailer', 'GUERRA', 'SLIM', 3);