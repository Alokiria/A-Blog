# Valaxy 1.0 要求 Node.js >= 22.12.0
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine AS production-stage

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
