#!/bin/bash

TARGET_DIR="/var/www/breakout_dev"

if [ "$PWD" != "$TARGET_DIR" ]; then
    echo "Ошибка: Команда 'g' работает только внутри $TARGET_DIR"
    exit 1
fi

# Получаем имя текущей ветки, чтобы знать, куда пушить
current_branch=$(git branch --show-current)

read -e -p "[$current_branch] Введите комментарий: " msg

if [ -z "$msg" ]; then
    echo "Отмена: Пустой комментарий."
    exit 1
fi

git add .
git commit -m "$msg"

# Пушим именно в текущую ветку
git push origin "$current_branch"

echo "Готово! Изменения отправлены в ветку $current_branch."
