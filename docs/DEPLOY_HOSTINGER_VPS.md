# Deploy to Hostinger VPS (tsr.cercycle.com)

## 1) Server prerequisites

```bash
sudo apt update
sudo apt install -y nginx git curl build-essential postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2) Create PostgreSQL database/user

```bash
sudo -u postgres psql
```

```sql
CREATE USER circycle_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE circycle_prod OWNER circycle_user;
\q
```

## 3) Clone app and configure env

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/oxijay/circycle.git
cd circycle
cp env.production.example .env
```

Edit `.env`:

- `DATABASE_URL` -> production PostgreSQL URL
- `AUTOMIL_API_BASE_URL`
- `AUTOMIL_API_TOKEN`
- `NEXT_PUBLIC_APP_URL=https://tsr.cercycle.com`

## 4) First deploy

```bash
cd /var/www/circycle
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

## 5) Nginx reverse proxy

```bash
sudo cp deploy/nginx-tsr.cercycle.com.conf /etc/nginx/sites-available/tsr.cercycle.com
sudo ln -s /etc/nginx/sites-available/tsr.cercycle.com /etc/nginx/sites-enabled/tsr.cercycle.com
sudo nginx -t
sudo systemctl reload nginx
```

## 6) SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tsr.cercycle.com
```

## 7) Ongoing deployments

```bash
cd /var/www/circycle
./scripts/deploy-vps.sh
```

## 8) Health checks

```bash
pm2 status circycle
pm2 logs circycle --lines 100
curl -I http://127.0.0.1:3000
curl -I https://tsr.cercycle.com
```
