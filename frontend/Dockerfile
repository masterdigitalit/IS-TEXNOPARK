FROM oven/bun:1

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Копирование исходного кода
COPY . .

# Сборка приложения (создает dist/)
RUN bun run build

# Порт для приложения
EXPOSE 3000

# Команда запуска (Bun serve будет раздавать статику из dist/)
ENV NODE_ENV=production
CMD ["bun", "src/index.ts"]

