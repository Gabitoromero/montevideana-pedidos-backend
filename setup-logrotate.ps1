# Script para configurar PM2 Logrotate
# Ejecutar con: .\setup-logrotate.ps1

Write-Host "🔧 Configurando PM2 Logrotate..." -ForegroundColor Cyan

# Instalar módulo de rotación de logs
Write-Host "`n📦 Instalando pm2-logrotate..." -ForegroundColor Yellow
pm2 install pm2-logrotate

# Esperar a que se instale
Start-Sleep -Seconds 3

# Configurar parámetros
Write-Host "`n⚙️  Configurando parámetros..." -ForegroundColor Yellow

# Rotar cuando el archivo llegue a 10MB
pm2 set pm2-logrotate:max_size 10M
Write-Host "  ✅ Tamaño máximo: 10MB" -ForegroundColor Green

# Mantener últimos 30 archivos rotados
pm2 set pm2-logrotate:retain 30
Write-Host "  ✅ Retener: 30 archivos" -ForegroundColor Green

# Comprimir logs antiguos
pm2 set pm2-logrotate:compress true
Write-Host "  ✅ Compresión: activada" -ForegroundColor Green

# Formato de fecha para archivos rotados
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
Write-Host "  ✅ Formato fecha: YYYY-MM-DD_HH-mm-ss" -ForegroundColor Green

# Rotar también logs de módulos PM2
pm2 set pm2-logrotate:rotateModule true
Write-Host "  ✅ Rotar módulos PM2: activado" -ForegroundColor Green

# Intervalo de verificación (cada hora)
pm2 set pm2-logrotate:rotateInterval '0 * * * *'
Write-Host "  ✅ Intervalo: cada hora" -ForegroundColor Green

# Mostrar configuración actual
Write-Host "`n📋 Configuración actual:" -ForegroundColor Cyan
pm2 conf pm2-logrotate

Write-Host "`n✅ ¡PM2 Logrotate configurado exitosamente!" -ForegroundColor Green
Write-Host "`n📝 Comandos útiles:" -ForegroundColor Yellow
Write-Host "  - Ver logs en tiempo real:    pm2 logs montevideana-scheduler --lines 100" -ForegroundColor White
Write-Host "  - Buscar en logs:             pm2 logs montevideana-scheduler | Select-String 'LIQUIDACION'" -ForegroundColor White
Write-Host "  - Limpiar logs:               pm2 flush" -ForegroundColor White
Write-Host "  - Ver configuración:          pm2 conf pm2-logrotate" -ForegroundColor White
Write-Host "  - Ubicación de logs:          ~\.pm2\logs\" -ForegroundColor White

Write-Host "`n🎯 Los logs ahora se rotarán automáticamente cada 10MB" -ForegroundColor Cyan
Write-Host "   y se mantendrán los últimos 30 archivos comprimidos.`n" -ForegroundColor Cyan
