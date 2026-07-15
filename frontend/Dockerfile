# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# cache de dependências separado do código-fonte
COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ─── Stage 2: Runtime (Nginx slim) ──────────────────────────────────────────
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# remove configuração padrão do nginx
RUN rm -rf ./*

# copia artefatos buildados
COPY --from=build /app/dist .

# configuração customizada para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
