-- Script de inicialización para el sistema
-- Ejecutar después de crear la base de datos

USE montevideana_pedidos;

-- 1. Crear Usuario Sistema (ID 1)
-- Password: "1234" (hash bcrypt)
-- INSERT INTO usuarios (id, nombre, apellido, sector, passwordHash) 
-- VALUES (
--   1, 
--   'Sistema', 
--   'Automático', 
--   'CHESS', 
--   '$2a$10$rYq5tP0H0XqZZlvZxCZqYeD3nP5h2wz5hJH7xLzZvZzJZZ7JZZ7JZ'
-- )
-- ON DUPLICATE KEY UPDATE 
--   nombre = 'Sistema',
--   apellido = 'Automático',
--   sector = 'CHESS';

-- 2. Crear Estados del Sistema
-- Estado 0: CHESS (estado virtual para pedidos nuevos)
INSERT INTO tipos_estado (idEstado, nombreEstado) 
VALUES (6, 'CHESS')
ON DUPLICATE KEY UPDATE nombreEstado = 'CHESS';

-- Estado 1: Pendiente (primer estado real)
INSERT INTO tipos_estado (idEstado, nombreEstado) 
VALUES (1, 'Pendiente')
ON DUPLICATE KEY UPDATE nombreEstado = 'Pendiente';

-- Estado 2: En Preparacion
INSERT INTO tipos_estado (idEstado, nombreEstado) 
VALUES (2, 'En Preparacion')
ON DUPLICATE KEY UPDATE nombreEstado = 'En Preparacion';

-- Estado 3: Preparado
INSERT INTO tipos_estado (idEstado, nombreEstado) 
VALUES (3, 'Preparado')
ON DUPLICATE KEY UPDATE nombreEstado = 'Preparado';

-- Estado 4: Pagado
INSERT INTO tipos_estado (idEstado, nombreEstado) 
VALUES (4, 'Pagado')
ON DUPLICATE KEY UPDATE nombreEstado = 'Pagado';

-- Estado 5: Entregado
INSERT INTO tipos_estado (idEstado, nombreEstado) 
VALUES (5, 'Entregado')
ON DUPLICATE KEY UPDATE nombreEstado = 'Entregado';

-- 3. Crear Reglas de Transición básicas
INSERT INTO reglas (idEstado, idEstadoNecesario)
SELECT 2, 1
WHERE NOT EXISTS (
    SELECT 1 FROM reglas WHERE idEstado = 2 AND idEstadoNecesario = 1
);

INSERT INTO reglas (idEstado, idEstadoNecesario)
SELECT 3, 2
WHERE NOT EXISTS (
    SELECT 1 FROM reglas WHERE idEstado = 3 AND idEstadoNecesario = 2
);

INSERT INTO reglas (idEstado, idEstadoNecesario)
SELECT 4, 1
WHERE NOT EXISTS (
    SELECT 1 FROM reglas WHERE idEstado = 4 AND idEstadoNecesario = 1
);

INSERT INTO reglas (idEstado, idEstadoNecesario)
SELECT 5, 3
WHERE NOT EXISTS (
    SELECT 1 FROM reglas WHERE idEstado = 5 AND idEstadoNecesario = 3
);

-- Verificar datos insertados
SELECT 'Usuario Sistema creado:' as mensaje;
SELECT * FROM usuarios WHERE id = 1;

SELECT 'Estados creados:' as mensaje;
SELECT * FROM tipos_estado ORDER BY idEstado;

SELECT 'Reglas creadas:' as mensaje;
SELECT r.*, 
        e1.nombreEstado as estado_destino,
        e2.nombreEstado as estado_necesario
FROM reglas r
JOIN tipos_estado e1 ON r.idEstado = e1.idEstado
JOIN tipos_estado e2 ON r.idEstadoNecesario = e2.idEstado;
