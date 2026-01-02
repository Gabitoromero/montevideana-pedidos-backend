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
INSERT INTO
    tipos_estado (idEstado, nombreEstado)
VALUES (1, 'CHESS')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'CHESS';

-- Estado 1: Pendiente (primer estado real)
INSERT INTO
    tipos_estado (idEstado, nombreEstado)
VALUES (2, 'PENDIENTE')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'PENDIENTE';

-- Estado 2: En Preparacion
INSERT INTO
    tipos_estado (idEstado, nombreEstado)
VALUES (3, 'EN PREPARACION')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'EN PREPARACION';

-- Estado 3: Preparado
INSERT INTO
    tipos_estado (idEstado, nombreEstado)
VALUES (4, 'PREPARADO')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'PREPARADO';

-- Estado 4: Pagado
INSERT INTO
    tipos_estado (idEstado, nombreEstado)
VALUES (5, 'PAGADO')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'PAGADO';

-- Estado 5: Entregado
INSERT INTO
    tipos_estado (idEstado, nombreEstado)
VALUES (6, 'ENTREGADO')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'ENTREGADO';

-- 3. Crear Reglas de Transición básicas
INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 3, 2
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 3
            AND idEstadoNecesario = 2
    );

INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 4, 2
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 4
            AND idEstadoNecesario = 2
    );

INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 4, 3
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 4
            AND idEstadoNecesario = 3
    );

INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 6, 2
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 6
            AND idEstadoNecesario = 2
    );

INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 6, 3
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 6
            AND idEstadoNecesario = 3
    );

INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 6, 4
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 6
            AND idEstadoNecesario = 4
    );

INSERT INTO
    reglas (idEstado, idEstadoNecesario)
SELECT 6, 5
WHERE
    NOT EXISTS (
        SELECT 1
        FROM reglas
        WHERE
            idEstado = 6
            AND idEstadoNecesario = 5
    );

-- Verificar datos insertados
SELECT 'Usuario Sistema creado:' as mensaje;

SELECT * FROM usuarios WHERE id = 1;

SELECT 'Estados creados:' as mensaje;

SELECT * FROM tipos_estado ORDER BY idEstado;

SELECT 'Reglas creadas:' as mensaje;

SELECT
    r.*,
    e1.nombreEstado as estado_destino,
    e2.nombreEstado as estado_necesario
FROM
    reglas r
    JOIN tipos_estado e1 ON r.idEstado = e1.idEstado
    JOIN tipos_estado e2 ON r.idEstadoNecesario = e2.idEstado;