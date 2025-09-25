#!/bin/bash

# Fixed Database credentials
DB_NAME="db_main"
DB_USER="medusauser"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/path/to/backup"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Number of backups to keep for single DB
MAX_BACKUPS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "PostgreSQL Backup/Restore Script"
echo "--------------------------------"
echo "1) Backup single database ($DB_NAME)"
echo "2) Backup ALL databases"
echo "3) Restore single database ($DB_NAME)"
read -p "Choose an option (1, 2, or 3): " choice

if [ "$choice" == "1" ]; then
    # BACKUP SINGLE DB
    echo "Starting backup of $DB_NAME..."
    pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql"

    if [ $? -ne 0 ]; then
        echo "❌ Backup failed!"
        rm -f "$BACKUP_DIR/${DB_NAME}_${DATE}.sql"
        exit 1
    fi

    gzip "$BACKUP_DIR/${DB_NAME}_${DATE}.sql"

    # Keep only last $MAX_BACKUPS backups
    ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz | tail -n +$((MAX_BACKUPS+1)) | xargs -r rm --

    echo "✅ Backup completed: $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

elif [ "$choice" == "2" ]; then
    # BACKUP ALL DBS
    echo "Starting full cluster backup (all databases + roles)..."
    pg_dumpall -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" | gzip > "$BACKUP_DIR/all_databases_${DATE}.sql.gz"

    if [ $? -ne 0 ]; then
        echo "❌ Full backup failed!"
        exit 1
    fi

    echo "✅ Full cluster backup completed: $BACKUP_DIR/all_databases_${DATE}.sql.gz"

elif [ "$choice" == "3" ]; then
    # RESTORE SINGLE DB
    echo "Available backups:"
    ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz
    echo ""
    read -p "Enter full path of the backup file to restore: " BACKUP_FILE

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ Error: File does not exist!"
        exit 1
    fi

    echo "⚠️ WARNING: This will DROP and RECREATE the database '$DB_NAME'."
    read -p "Type 'yes' to continue: " confirm

    if [ "$confirm" != "yes" ]; then
        echo "❌ Restore cancelled."
        exit 1
    fi

    echo "Checking if user '$DB_USER' has CREATE DATABASE privilege..."
    HAS_PRIV=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -tAc "SELECT rolsuper OR rolcreatedb FROM pg_roles WHERE rolname='$DB_USER';")

    if [ "$HAS_PRIV" == "t" ]; then
        echo "User '$DB_USER' has permission. Dropping and recreating database..."
        psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
        psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"
    else
        echo "User '$DB_USER' does not have permission. Using 'postgres' for drop/create..."
        psql -U postgres -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
        psql -U postgres -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
    fi

    if [ $? -ne 0 ]; then
        echo "❌ Failed to recreate database '$DB_NAME'."
        exit 1
    fi

    echo "Restoring database '$DB_NAME' from $BACKUP_FILE..."
    gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME"

    if [ $? -ne 0 ]; then
        echo "❌ Restore failed!"
        exit 1
    fi

    echo "✅ Restore completed."

else
    echo "Invalid option. Exiting."
    exit 1
fi
