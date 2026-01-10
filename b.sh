#!/bin/bash

# b.sh — Умный бэкап (Авто-именование)
# Путь: /var/www/breakout_dev

# 1. Определяем имена
PROJECT_PATH=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_PATH")
BACKUP_ROOT="/var/www/backups"
BACKUP_DIR="$BACKUP_ROOT/$PROJECT_NAME"

# Создаем структуру папок
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="bk_$TIMESTAMP.tar.gz"

echo "📦 Создание бэкапа для проекта: $PROJECT_NAME..."

# 2. Авто-комментарий
AUTO_COMMENT=$(git status -s 2>/dev/null | head -n 3 | tr '\n' '; ')
if [ -z "$AUTO_COMMENT" ]; then AUTO_COMMENT="Плановый бэкап"; fi

echo "📝 Комментарий (или Enter для авто):"
read user_comment
FINAL_COMMENT=${user_comment:-$AUTO_COMMENT}

# 3. Архивирование (исключая Docker-мусор и логи)
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" .

# 4. Сохранение лога
echo "$FINAL_COMMENT" > "$BACKUP_DIR/bk_$TIMESTAMP.txt"

echo "-------------------------------------------------------"
echo "✅ Готово! Архив: $BACKUP_DIR/$ARCHIVE_NAME"
echo "📝 Описание: $FINAL_COMMENT"
echo "-------------------------------------------------------"
