#!/bin/bash
# Mamio SQLite backup script
# Run daily via cron: 0 3 * * * /var/www/mimio/deploy/backup-db.sh

DB_PATH="/var/www/mimio/server/mamio.db"
BACKUP_DIR="/var/www/mimio/backups"
KEEP_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mamio_${TIMESTAMP}.db"

# Use SQLite backup (safe for concurrent reads)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress
gzip "$BACKUP_FILE"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "mamio_*.db.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
