-- CPF passa a ser persistido só com dígitos (login por CPF normaliza igual no servidor).
-- Migra CPFs antigos cadastrados com máscara (pontos/traços/espaços) para o mesmo formato.
UPDATE operarios
   SET cpf = regexp_replace(cpf, '\D', '', 'g')
 WHERE cpf IS NOT NULL
   AND cpf <> regexp_replace(cpf, '\D', '', 'g');
