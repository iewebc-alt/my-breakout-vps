#!/bin/bash

# r.sh — Интерактивное восстановление (Авто-именование)
# Путь: /var/www/breakout_dev

PROJECT_PATH=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_PATH")
BACKUP_DIR="/var/www/backups/$PROJECT_NAME"

if [ ! -d "$BACKUP_DIR" ]; then 
    echo "❌ Бэкапов для проекта '$PROJECT_NAME' не найдено в $BACKUP_DIR"
    exit 1
fi

cd "$BACKUP_DIR" || exit

# 1. Вывод списка
echo "📂 Точки восстановления для $PROJECT_NAME:"
echo "-------------------------------------------------------"
i=1
files=(bk_*.tar.gz)

# Проверка на наличие файлов
if [ ! -e "${files[0]}" ]; then echo "Архивов нет"; exit 1; fi

for file in "${files[@]}"; do
    comment_file="${file%.tar.gz}.txt"
    comment=$(cat "$comment_file" 2>/dev/null || echo "Нет описания")
    echo "[$i] $file — $comment"
    ((i++))
done
echo "-------------------------------------------------------"

echo "🔢 Номер архива (или 'q'):"
read choice
if [[ "$choice" == "q" ]]; then exit; fi

selected_file="${files[$((choice-1))]}"
if [ -z "$selected_file" ]; then echo "❌ Ошибка выбора"; exit 1; fi

# 2. Выбор области (согласно Манифесту v2.3)
echo -e "\n🛠️ Что восстановить?"
echo "[1] Весь проект (Full Restore)"
echo "[2] Логика (physics, state, config)"
echo "[3] Визуал (renderer, index.html)"
echo "[4] Ввод (input.js)"
read type_choice

cd "$PROJECT_PATH" || exit

case $type_choice in
    1) tar -xzf "$BACKUP_DIR/$selected_file" ;;
    2) tar -xzf "$BACKUP_DIR/$selected_file" physics.js state.js config.js ;;
    3) tar -xzf "$BACKUP_DIR/$selected_file" renderer.js index.html ;;
    4) tar -xzf "$BACKUP_DIR/$selected_file" input.js ;;
    *) echo "Отмена"; exit 1 ;;
esac

echo "✅ Восстановление '$PROJECT_NAME' завершено!"
echo "🔄 Запустите ./u.sh для обновления Docker."
