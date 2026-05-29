# Configuración de Backups Automáticos de MySQL

## 🔧 Configuración Inicial

### 1. Dar permisos de ejecución (Linux/Mac)

```bash
chmod +x scripts/backup-mysql.sh
```

### 2. Probar el script manualmente

**Linux/Mac:**

```bash
./scripts/backup-mysql.sh
```

**Windows:**

```cmd
scripts\backup-mysql.bat
```

---

## ⏰ Programar Backups Automáticos

### Linux/Mac - Usando Cron

1. Editar crontab:

```bash
crontab -e
```

2. Agregar una de estas líneas según la frecuencia deseada:

```bash
# Backup diario a las 2:00 AM
0 2 * * * cd /ruta/completa/al/proyecto && ./scripts/backup-mysql.sh

# Backup cada 6 horas
0 */6 * * * cd /ruta/completa/al/proyecto && ./scripts/backup-mysql.sh

# Backup cada hora
0 * * * * cd /ruta/completa/al/proyecto && ./scripts/backup-mysql.sh
```

3. Verificar que el cron está configurado:

```bash
crontab -l
```

---

### Windows - Usando Programador de Tareas

1. Abrir "Programador de tareas" (Task Scheduler)

2. Crear tarea básica:

   - Nombre: "Backup MySQL Montevideana"
   - Descripción: "Backup automático de base de datos"

3. Desencadenador:

   - Diariamente a las 2:00 AM
   - O según la frecuencia deseada

4. Acción:

   - Programa: `cmd.exe`
   - Argumentos: `/c "cd C:\ruta\completa\al\proyecto && scripts\backup-mysql.bat"`
   - Iniciar en: `C:\ruta\completa\al\proyecto`

5. Configuración adicional:
   - ✅ Ejecutar tanto si el usuario inició sesión como si no
   - ✅ Ejecutar con los privilegios más altos

---

## 📁 Estructura de Backups

Los backups se guardarán en:

```
backups/
└── mysql/
    ├── backup_montevideana_pedidos_20260102_020000.sql.gz
    ├── backup_montevideana_pedidos_20260103_020000.sql.gz
    ├── backup_montevideana_pedidos_20260104_020000.sql.gz
    └── backup.log
```

---

## 🔄 Restaurar un Backup

### Linux/Mac:

```bash
# Descomprimir
gunzip backups/mysql/backup_montevideana_pedidos_20260102_020000.sql.gz

# Restaurar
mysql -h localhost -u root -p montevideana_pedidos < backups/mysql/backup_montevideana_pedidos_20260102_020000.sql
```

### Windows:

```cmd
REM Descomprimir con 7-Zip
"C:\Program Files\7-Zip\7z.exe" x backups\mysql\backup_montevideana_pedidos_20260102_020000.sql.gz

REM Restaurar
mysql -h localhost -u root -p montevideana_pedidos < backups\mysql\backup_montevideana_pedidos_20260102_020000.sql
```

---

## 📊 Monitoreo de Backups

### Ver el log de backups:

```bash
tail -f backups/mysql/backup.log
```

### Ver backups existentes:

```bash
ls -lh backups/mysql/backup_*.sql.gz
```

### Verificar tamaño total de backups:

```bash
du -sh backups/mysql/
```

---

## ☁️ Backup Remoto (Opcional)

### AWS S3

1. Instalar AWS CLI:

```bash
# Linux/Mac
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Descargar desde: https://aws.amazon.com/cli/
```

2. Configurar credenciales:

```bash
aws configure
```

3. Descomentar en `backup-mysql.sh`:

```bash
aws s3 cp "$BACKUP_FILE" "s3://tu-bucket/backups/mysql/"
```

### Azure Blob Storage

1. Instalar Azure CLI:

```bash
# Linux/Mac
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Windows
# Descargar desde: https://aka.ms/installazurecliwindows
```

2. Login:

```bash
az login
```

3. Descomentar en `backup-mysql.sh`:

```bash
az storage blob upload --account-name tu-cuenta --container-name backups --file "$BACKUP_FILE"
```

---

## 🔒 Seguridad

### Proteger el directorio de backups:

**Linux/Mac:**

```bash
chmod 700 backups/
chmod 600 backups/mysql/*
```

**Windows:**

```cmd
icacls backups /inheritance:r
icacls backups /grant:r "%USERNAME%:(OI)(CI)F"
```

---

## ⚙️ Configuración Avanzada

### Cambiar retención de backups

Editar en el script:

```bash
RETENTION_DAYS=30  # Cambiar a 7, 15, 60, etc.
```

### Notificaciones por email (Linux)

Agregar al final del script:

```bash
# Enviar email con resultado
echo "Backup completado: $BACKUP_FILE" | mail -s "Backup MySQL OK" admin@tudominio.com
```

---

## 📝 Notas Importantes

1. **Espacio en disco:** Asegúrate de tener suficiente espacio para los backups
2. **Permisos MySQL:** El usuario debe tener permisos de `SELECT`, `LOCK TABLES`, `SHOW VIEW`
3. **Prueba de restauración:** Prueba restaurar un backup periódicamente
4. **Monitoreo:** Revisa el log regularmente para detectar fallos
5. **Backup remoto:** Considera subir backups a la nube para mayor seguridad

---

## 🆘 Solución de Problemas

### Error: "mysqldump: command not found"

**Linux/Mac:**

```bash
# Agregar MySQL al PATH
export PATH=$PATH:/usr/local/mysql/bin
```

**Windows:**

```cmd
# Agregar a PATH del sistema o usar ruta completa
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" ...
```

### Error: "Access denied"

Verificar credenciales en `.env`:

```bash
DB_USER=root
DB_PASSWORD=tu_password_correcto
```

### Backups muy grandes

Considerar:

- Comprimir con mayor nivel: `gzip -9`
- Excluir tablas temporales
- Usar backups incrementales
