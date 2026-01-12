-- Script de Migración para Renombrar liquidacionManual a liquidacion
-- Base de Datos: montevideana_pedidos
-- Fecha: 2026-01-12

-- ============================================
-- IMPORTANTE: Hacer backup antes de ejecutar
-- ============================================

-- Renombrar columna liquidacionManual a liquidacion
ALTER TABLE fleteros
CHANGE COLUMN liquidacion_manual liquidacion TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si el fletero se liquida por CHESS (1) o automáticamente (0)';

-- Verificar el cambio
DESCRIBE fleteros;

-- Verificar datos
SELECT * FROM fleteros ORDER BY id_fletero;