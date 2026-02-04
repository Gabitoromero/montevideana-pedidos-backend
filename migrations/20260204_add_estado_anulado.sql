-- Migración: Agregar estado ANULADO y campo motivoAnulacion
-- Fecha: 2026-02-04
-- Descripción: Agrega el estado ANULADO (ID: 7) y el campo motivoAnulacion a la tabla movimientos

-- 1. Agregar estado ANULADO a tipos_estado
INSERT INTO
    tipos_estado (id, nombreEstado)
VALUES (7, 'ANULADO')
ON DUPLICATE KEY UPDATE
    nombreEstado = 'ANULADO';

-- 2. Agregar columna motivoAnulacion a movimientos
ALTER TABLE movimientos
ADD COLUMN motivoAnulacion TEXT NULL COMMENT 'Motivo de anulación del pedido (obligatorio cuando estadoFinal = 7)';

-- Verificación
SELECT * FROM tipos_estado WHERE id = 7;

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_NAME = 'movimientos'
    AND COLUMN_NAME = 'motivo_anulacion';