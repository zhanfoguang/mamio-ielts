#!/bin/bash
# Mamio SQLite backup script
# Run daily via cron: 0 3 * * * /var/www/mimio/deploy/backup-db.sh

DB_PATH="/var/www/mimio/server/mamio.db"
BACKUP_DIR="/var/www/mimio/backups"
KEEP_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: database not found: $DB_PATH" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "ERROR: sqlite3 command not found" >&2
  exit 1
fi

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mamio_${TIMESTAMP}.db"

# Use SQLite backup (safe for concurrent reads)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress
gzip "$BACKUP_FILE"

if [ ! -s "${BACKUP_FILE}.gz" ]; then
  echo "ERROR: backup file was not created: ${BACKUP_FILE}.gz" >&2
  exit 1
fi

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "mamio_*.db.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | awk '{print $1}'))"
