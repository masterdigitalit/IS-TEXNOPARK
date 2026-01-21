FROM oven/bun:1 AS build

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Копирование исходного кода
COPY . .

# Сборка приложения (создает dist/)
RUN bun run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
