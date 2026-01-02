#!/bin/bash

# Script de Backup Automático de MySQL
# Configuración para Montevideana Pedidos Backend

# ============================================
# CONFIGURACIÓN
# ============================================

# Cargar variables de entorno desde .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuración de backup
BACKUP_DIR="./backups/mysql"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"

# ============================================
# FUNCIONES
# ============================================

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ============================================
# CREAR DIRECTORIO DE BACKUPS
# ============================================

mkdir -p "$BACKUP_DIR"

# ============================================
# REALIZAR BACKUP
# ============================================

log_message "Iniciando backup de base de datos: $DB_NAME"

# Ejecutar mysqldump
mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --databases "$DB_NAME" \
    > "$BACKUP_FILE" 2>&1

# Verificar si el backup fue exitoso
if [ $? -eq 0 ]; then
    # Comprimir el backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_message "✅ Backup completado exitosamente: $BACKUP_FILE (Tamaño: $BACKUP_SIZE)"
else
    log_message "❌ Error al realizar el backup"
    exit 1
fi

# ============================================
# LIMPIAR BACKUPS ANTIGUOS
# ============================================

log_message "Limpiando backups antiguos (> $RETENTION_DAYS días)..."

find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
log_message "Backups restantes: $REMAINING_BACKUPS"

# ============================================
# OPCIONAL: SUBIR A ALMACENAMIENTO REMOTO
# ============================================

# Descomentar y configurar según tu proveedor de almacenamiento

# AWS S3
# aws s3 cp "$BACKUP_FILE" "s3://tu-bucket/backups/mysql/"

# Azure Blob Storage
# az storage blob upload --account-name tu-cuenta --container-name backups --file "$BACKUP_FILE"

# Google Cloud Storage
# gsutil cp "$BACKUP_FILE" "gs://tu-bucket/backups/mysql/"

log_message "Proceso de backup finalizado"
