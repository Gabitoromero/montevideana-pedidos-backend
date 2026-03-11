-- Migración: Agregar estado ANULADO y campo motivoAnulacion
-- Fecha: 2026-02-04
-- Descripción: Agrega el estado ANULADO (ID: 7) y el campo motivoAnulacion a la tabla movimientos

-- 1. Agregar estado ANULADO a tipos_estado
start transaction;
    INSERT INTO
        tipos_estado (id, nombre_estado)
    VALUES (7, 'ANULADO');
commit;
-- 2. Agregar columna motivoAnulacion a movimientos
ALTER TABLE movimientos ADD COLUMN motivo_anulacion;

-- Agregar columna telefono1
ALTER TABLE fleteros
ADD COLUMN telefono1 VARCHAR(255) NULL AFTER liquidacion;
-- Agregar columna telefono2
ALTER TABLE fleteros
ADD COLUMN telefono2 VARCHAR(255) NULL AFTER telefono1;

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