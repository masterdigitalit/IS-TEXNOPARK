FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements и установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода приложения
COPY . .

# Создание директории для статики
RUN mkdir -p /app/staticfiles

# Порт backend внутри контейнера (можно переопределить через переменную окружения BACKEND_PORT)
ENV BACKEND_PORT=23458

# Сборка статики (если нужно)
# RUN python manage.py collectstatic --noinput

# Порт для приложения (должен совпадать с BACKEND_PORT)
EXPOSE ${BACKEND_PORT}

# Команда запуска
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:${BACKEND_PORT} --workers 3"]

