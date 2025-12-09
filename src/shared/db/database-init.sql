-- Script de inicialización para Montevideana Pedidos
-- Este script crea datos iniciales para pruebas

-- 1. Crear tipos de estado básicos
-- Nota: Ajustar según los estados reales de La Montevideana
INSERT INTO tipos_estado (cod_estado, nombre_estado) VALUES
(1, 'Pendiente'),
(2, 'En Preparación'),
(3, 'Listo para Envío'),
(4, 'En Tránsito'),
(5, 'Entregado'),
(6, 'Cancelado')
ON DUPLICATE KEY UPDATE nombre_estado = VALUES(nombre_estado);

-- 2. Crear reglas de transición de estados
-- Ejemplo: Para pasar a "En Preparación" (2), el pedido debe haber estado en "Pendiente" (1)
INSERT INTO estados_necesarios (cod_estado, cod_necesario) VALUES
(2, 1),  -- Para ir a "En Preparación" necesita "Pendiente"
(3, 2),  -- Para ir a "Listo para Envío" necesita "En Preparación"
(4, 3),  -- Para ir a "En Tránsito" necesita "Listo para Envío"
(5, 4)   -- Para ir a "Entregado" necesita "En Tránsito"
ON DUPLICATE KEY UPDATE cod_estado = VALUES(cod_estado);

-- 3. Crear usuario administrador por defecto
-- Contraseña: admin123 (hash bcrypt)
INSERT INTO usuarios (nombre, apellido, sector, password_hash) VALUES
('Admin', 'Sistema', 'Administración', '$2a$10$YourBcryptHashHere')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Notas:
-- - Los códigos de estado deben coincidir con la lógica de negocio real
-- - Las reglas de transición se pueden ajustar según el workflow real
-- - El hash de password debe generarse con bcrypt (ver README para crear usuarios)
-- - Este es un ejemplo, ajustar según necesidades reales de La Montevideana
