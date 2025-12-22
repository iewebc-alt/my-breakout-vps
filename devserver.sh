#!/bin/sh
if [ ! -d ".venv" ]; then
    python -m venv .venv
fi
source .venv/bin/activate
pip install flask
# Просто пробрасываем все аргументы, которые прислала Студия
python -m flask --app main run "$@"