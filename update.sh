#!/bin/bash

echo "🚀 Actualizando SmartSOS..."

cd /var/www/smartsos || exit

echo "🔓 Permisos..."
chown -R ubuntu:ubuntu .

echo "🧹 Limpiando cambios locales..."
git reset --hard
git clean -fd

echo "📥 Bajando cambios..."
git pull origin main

echo "📦 Instalando..."
npm install

echo "🧱 Build limpio..."
rm -rf dist
npm run build

echo "🔐 Permisos finales..."
chown -R www-data:www-data .

echo "🔄 Reload nginx..."
systemctl reload nginx

echo "✅ Listo"
