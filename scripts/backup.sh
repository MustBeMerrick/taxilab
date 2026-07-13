#!/usr/bin/env bash
# Nightly (or manual) backup of the SQLite database to iCloud Drive.
# Usage: ./scripts/backup.sh
# Cron:  0 3 * * * /path/to/taxilab/scripts/backup.sh >> /path/to/taxilab/logs/backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/tax.db"
BACKUP_DIR="${TAXILAB_BACKUP_DIR:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/tax-backups}"
DATE="$(date +%Y-%m-%d)"
BACKUP_FILE="$BACKUP_DIR/tax-$DATE.sql"
RETENTION_DAYS=30

if [ ! -f "$DB_PATH" ]; then
  echo "No database found at $DB_PATH -- nothing to back up."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".dump" > "$BACKUP_FILE"
echo "Backed up $DB_PATH to $BACKUP_FILE"

# Keep only the last RETENTION_DAYS days of backups.
find "$BACKUP_DIR" -name 'tax-*.sql' -mtime "+$RETENTION_DAYS" -delete

echo "Backup complete."
