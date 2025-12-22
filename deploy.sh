#!/bin/bash
echo "🚀 Отправляем код в GitHub..."
git add .
git commit -m "update from studio"
git push origin main

echo "🌐 Обновляем сервер Aeza..."
# Эта команда заставляет сервер скачать новый код и пересобрать контейнер
ssh root@45.80.228.104 "cd /var/www/breakout && git pull && docker compose up -d --build"

echo "✅ Готово! Проверяйте на https://breakout-ball.mooo.com:444"