# IS-TEXNOPARK

Проект для управления событиями и файлами.

## Структура проекта

- `backend/` - Django REST API
  - `backend/.env.example` - пример переменных окружения для backend
- `frontend/` - React приложение на Bun
  - `frontend/.env.example` - пример переменных окружения для frontend
- `docker-compose.minio.yml` - MinIO для хранения файлов
- `.env.minio.example` - пример переменных окружения для MinIO

## Деплой через Dokploy

### Backend (Django)

1. В Dokploy создайте новое приложение
2. Укажите путь к Dockerfile: `backend/Dockerfile`
3. Настройте переменные окружения (см. ниже)
4. **Настройка портов в Dokploy:**
   - **Host порт** - это порт, на который Dokploy будет пробрасывать трафик с хоста на контейнер. 
     Укажите здесь значение из переменной `BACKEND_PORT` (например, `8000` или ваш кастомный порт).
   - **Ingress порт** - используется только если вы настраиваете ingress/домен. 
     Обычно это `80` для HTTP или `443` для HTTPS. Если не используете домен, оставьте пустым.
   - **Важно**: `BACKEND_PORT` (в переменных окружения) должен совпадать с **Host портом** в настройках приложения.

### Frontend (Bun)

1. В Dokploy создайте новое приложение
2. Укажите путь к Dockerfile: `frontend/Dockerfile`
3. Настройте переменные окружения
4. Укажите порт: `3000`

### MinIO (отдельный сервис)

1. В Dokploy создайте новое приложение из docker-compose
2. Используйте файл: `docker-compose.minio.yml`
3. Настройте переменные окружения (см. ниже) — в том числе порты
4. Порты берутся из переменных `MINIO_API_PORT` и `MINIO_CONSOLE_PORT` (по умолчанию 9000 и 9001)

## Переменные окружения

В проекте есть примеры файлов с переменными окружения:
- `backend/.env.example` - для Django backend
- `frontend/.env.example` - для frontend (если нужен)
- `.env.minio.example` - для MinIO

Скопируйте эти файлы в `.env` и заполните своими значениями:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend (если нужен)
cp frontend/.env.example frontend/.env

# MinIO
cp .env.minio.example .env.minio
```

### Backend (.env)

Основные переменные (см. `backend/.env.example`):

```env
# Порт backend (можно задать любой, например 8080, 3000 и т.д.)
BACKEND_PORT=8000

SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,localhost

USE_SQLITE=False
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=db_host
DB_PORT=5432

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=media
MINIO_ENDPOINT=http://minio:9000
MINIO_REGION=us-east-1
MINIO_USE_SSL=False
```

**Важно для Dokploy**: 
- Задайте переменную `BACKEND_PORT` в настройках приложения (например, `8080`)
- В настройках приложения в поле **Host порт** укажите тот же порт, что и в `BACKEND_PORT` (например, `8080`)
- **Ingress порт** используйте только если настраиваете домен/ingress (обычно `80` или `443`), иначе оставьте пустым
- Внутри контейнера приложение будет слушать на порту из `BACKEND_PORT`

### MinIO (.env.minio)

Основные переменные (см. `.env.minio.example`):

```env
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BROWSER_REDIRECT_URL=http://your-domain:9001
```

## Локальная разработка

### Запуск MinIO

```bash
docker-compose -f docker-compose.minio.yml up -d
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
bun install
bun run dev
```

## Примечания

- MinIO должен быть доступен извне для подключения из backend
- В production используйте внешний URL для `MINIO_ENDPOINT` (например, `http://your-minio-domain:9000`)
- В production убедитесь, что `DEBUG=False`
- Настройте `ALLOWED_HOSTS` для вашего домена (через запятую, без пробелов)
- После запуска MinIO создайте bucket с именем из `MINIO_BUCKET_NAME` через веб-консоль (порт 9001)
- Для первого запуска backend выполните миграции: `python manage.py migrate`

