#!/bin/bash
#
# Script de instalación y configuración de PM2 Logrotate
# Para servidor Ubuntu/Linux
# Ejecutar con: bash setup-pm2-logrotate.sh
#

set -e  # Salir si hay algún error

echo "🔧 =========================================="
echo "   Configuración de PM2 Logrotate"
echo "   Servidor: $(hostname)"
echo "   Fecha: $(date)"
echo "=========================================="
echo ""

# Verificar que PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ Error: PM2 no está instalado"
    echo "   Instala PM2 primero: npm install -g pm2"
    exit 1
fi

echo "✅ PM2 encontrado: $(pm2 --version)"
echo ""

# 1. Instalar pm2-logrotate
echo "📦 Instalando pm2-logrotate..."
pm2 install pm2-logrotate

# Esperar a que se instale
echo "⏳ Esperando instalación..."
sleep 5

# 2. Configurar parámetros
echo ""
echo "⚙️  Configurando parámetros..."

# Rotar cuando llegue a 10MB
pm2 set pm2-logrotate:max_size 10M
echo "  ✅ Tamaño máximo: 10MB"

# Mantener últimos 30 archivos
pm2 set pm2-logrotate:retain 30
echo "  ✅ Retener: 30 archivos"

# Comprimir logs antiguos
pm2 set pm2-logrotate:compress true
echo "  ✅ Compresión: activada"

# Formato de fecha
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
echo "  ✅ Formato fecha: YYYY-MM-DD_HH-mm-ss"

# Rotar también logs de módulos PM2
pm2 set pm2-logrotate:rotateModule true
echo "  ✅ Rotar módulos PM2: activado"

# Intervalo de verificación (cada hora)
pm2 set pm2-logrotate:rotateInterval '0 * * * *'
echo "  ✅ Intervalo: cada hora"

# Workaround para logs que no rotan
pm2 set pm2-logrotate:workerInterval 30
echo "  ✅ Worker interval: 30 segundos"

# Rotar logs al inicio
pm2 set pm2-logrotate:rotateOnStartup true
echo "  ✅ Rotar al inicio: activado"

# 3. Guardar configuración de PM2
echo ""
echo "💾 Guardando configuración de PM2..."
pm2 save

# 4. Mostrar configuración actual
echo ""
echo "📋 Configuración actual de pm2-logrotate:"
echo "=========================================="
pm2 conf pm2-logrotate

# 5. Verificar que el módulo está corriendo
echo ""
echo "🔍 Verificando estado del módulo..."
pm2 list | grep pm2-logrotate || echo "⚠️  Módulo no visible en pm2 list (esto es normal)"

# 6. Mostrar ubicación de logs
echo ""
echo "📁 Ubicación de logs:"
echo "   $HOME/.pm2/logs/"
echo ""
echo "   Archivos actuales:"
ls -lh ~/.pm2/logs/*.log 2>/dev/null || echo "   (No hay logs aún)"

# 7. Información útil
echo ""
echo "✅ =========================================="
echo "   Instalación completada exitosamente"
echo "=========================================="
echo ""
echo "📝 Comandos útiles:"
echo ""
echo "  Ver logs en tiempo real:"
echo "    pm2 logs montevideana-scheduler --lines 100"
echo ""
echo "  Buscar en logs:"
echo "    pm2 logs montevideana-scheduler --lines 5000 | grep 'LIQUIDACION'"
echo ""
echo "  Forzar rotación manual:"
echo "    pm2 trigger pm2-logrotate rotate"
echo ""
echo "  Ver logs rotados:"
echo "    ls -lh ~/.pm2/logs/*.gz"
echo ""
echo "  Ver contenido de log rotado:"
echo "    zcat ~/.pm2/logs/nombre-archivo.log.gz | less"
echo ""
echo "  Ver configuración:"
echo "    pm2 conf pm2-logrotate"
echo ""
echo "  Limpiar todos los logs (¡cuidado!):"
echo "    pm2 flush"
echo ""
echo "🎯 Los logs se rotarán automáticamente cada 10MB"
echo "   y se mantendrán los últimos 30 archivos comprimidos."
echo ""
