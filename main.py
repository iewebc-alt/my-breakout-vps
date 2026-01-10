from flask import Flask, send_from_directory
import os

# Указываем, что статические файлы лежат в текущей папке
app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    # Проверяем, какой файл отдавать основным
    if os.path.exists('index.html'):
        return send_from_directory('.', 'index.html')
    return "Файл index.html не найден", 404

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

# Этот блок нужен для запуска просто командой 'python main.py'
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))