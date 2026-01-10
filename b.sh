#!/bin/bash

# b.sh — Умный бэкап проекта
# Путь: /var/www/breakout_dev

# 1. Подготовка
PROJECT_DIR="/var/www/breakout_dev"
BACKUP_DIR="$PROJECT_DIR/ARX"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="bk_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR" || exit

echo "📦 Подготовка бэкапа..."

# 2. Генерация автоматического комментария на основе изменений (если есть git)
AUTO_COMMENT=$(git status -s 2>/dev/null | head -n 3 | tr '\n' '; ')
if [ -z "$AUTO_COMMENT" ]; then
    AUTO_COMMENT="Плановый бэкап (изменений не обнаружено)"
fi

# 3. Запрос комментария у пользователя
echo "💬 Текущее состояние: $AUTO_COMMENT"
echo "📝 Введите свой комментарий (или нажмите Enter, чтобы оставить авто):"
read user_comment

FINAL_COMMENT=${user_comment:-$AUTO_COMMENT}

# 4. Создание архива (исключая саму папку ARX)
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" --exclude='./ARX' .

# 5. Сохранение комментария
echo "$FINAL_COMMENT" > "$BACKUP_DIR/bk_$TIMESTAMP.txt"

echo "✅ Архив создан: ARX/$ARCHIVE_NAME"
echo "📝 Комментарий: $FINAL_COMMENT"