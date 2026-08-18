# Wuaze Tools — multi-stage Dockerfile
# Canlı site (toolss.wuaze.com) InfinityFree/PHP çalıştırıyor: index.html + proxy.php YAN YANA
# durmalı. Bu görüntü o yığını birebir yeniden üretir (statik sayfa + mail.tm vekili).
#
# Yapı: build (JS sözdizimi doğrulaması) → test (php -l) → runtime (yalnızca çalıştırma için
# gereken iki dosya; root olmayan kullanıcı; PHP built-in server).

# Sabitlenmiş sürümler (tekrarlanabilir build) — ihtiyaç olursa --build-arg ile değiştirilebilir
ARG NODE_TAG=20.15.1-alpine
ARG PHP_TAG=8.3.10-cli-alpine

# ---- build: kaynak doğrulaması (derleme yok, sözdizimi kontrolü) ----
FROM node:${NODE_TAG} AS build
WORKDIR /src
COPY index.html ./
COPY deploy/api/mailtm.js ./api-mailtm.js
# index.html içindeki inline script'i ve Vercel vekilini sözdizimsel olarak doğrula
RUN node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);if(!m){console.error('inline script bulunamadi');process.exit(1)}new Function(m[1]);console.log('index.html script OK')" \
 && node --check api-mailtm.js \
 && echo 'build stage OK'

# ---- test: PHP sözdizimi doğrulaması ----
FROM php:${PHP_TAG} AS test
WORKDIR /src
COPY proxy.php ./
RUN php -l proxy.php && echo 'test stage OK'

# ---- runtime: yalnızca çalıştırma için gerekenler ----
FROM php:${PHP_TAG} AS runtime

# root olmayan kullanıcı (güvenlik)
RUN addgroup -S -g 10001 app \
 && adduser -S -D -H -u 10001 -G app app

WORKDIR /app
# Yalnızca gerekli iki dosya; sahiplik tek adımda
COPY --chown=app:app index.html proxy.php ./

ENV PHP_CLI_SERVER_WORKERS=4

USER app
EXPOSE 8080

# built-in server /proxy.php?p=... yolunu da statik olarak hizmet eder (CORS'u proxy.php kendisi koyar)
CMD ["php", "-S", "0.0.0.0:8080", "-t", "/app"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
