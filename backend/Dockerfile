# Local development image only (production is cPanel shared hosting — see docs/08-OPERATIONS.md).
FROM php:8.2-cli

RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev libpng-dev libicu-dev \
    && docker-php-ext-install pdo_mysql zip gd bcmath intl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
EXPOSE 8000

CMD ["sh", "-c", "[ -f .env ] || cp .env.example .env; [ -d vendor ] || composer install; grep -q '^APP_KEY=base64' .env || php artisan key:generate; php artisan serve --host=0.0.0.0 --port=8000"]
