#!/bin/bash
# Скрипт для сбора контекста проекта для ИИ
echo "=== VPS PROJECT SNAPSHOT ==="
echo "Path: $(pwd)"
echo "Date: $(date)"
echo ""

# 1. Показываем структуру (без лишнего мусора)
echo "--- DIRECTORY STRUCTURE ---"
ls -R -I ".venv" -I ".git" -I "__pycache__" -I "*.jpg" -I "*.png" -I "data" -I "letsencrypt"
echo ""

# 2. Содержимое всех файлов кода (HTML, JS, CSS, Docker, Python)
find . -maxdepth 2 -not -path '*/.*' -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.py" -o -name "Dockerfile" -o -name "docker-compose.yml" \) | while read -r file; do
    echo "--- START FILE: $file ---"
    cat "$file"
    echo -e "\n--- END FILE ---\n"
done
