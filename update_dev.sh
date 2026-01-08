#!/bin/bash

# Скрипт обновления DEV-окружения (Локально на этом VPS)
# Путь: /var/www/breakout_dev

echo "🏗️  Пересборка DEV-контейнера с новыми модулями..."

# Переходим в папку проекта
cd /var/www/breakout_dev || exit

# Проверяем, какая команда доступна: 'docker compose' или 'docker-compose'
if docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
elif docker-compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker-compose"
else
    echo "❌ Ошибка: Docker Compose не установлен!"
    exit 1
fi

echo "📦 Использую команду: $DOCKER_CMD"

# Пересобираем образ и перезапускаем контейне
