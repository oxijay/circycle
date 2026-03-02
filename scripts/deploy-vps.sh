#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/circycle}"
BRANCH="${BRANCH:-main}"

echo "Deploying branch: ${BRANCH}"
echo "App directory: ${APP_DIR}"

cd "${APP_DIR}"

if [ ! -f ".env" ]; then
  echo "ERROR: ${APP_DIR}/.env not found"
  echo "Create .env from env.production.example first."
  exit 1
fi

git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

npm ci
npx prisma generate
npx prisma db push
npm run build

if pm2 describe circycle >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --only circycle --update-env
else
  pm2 start ecosystem.config.cjs --only circycle --update-env
fi

pm2 save
pm2 status circycle

echo "Deploy completed."
