# 1. Compilation du site
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Coordonnées publiques validées (vides = blocs masqués)
ARG VITE_BUSINESS_PHONE=""
ARG VITE_BUSINESS_WHATSAPP=""
ARG VITE_BUSINESS_ADDRESS=""
RUN npm run build

# 2. Service par Nginx (relaie /api et /admin vers Django)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
