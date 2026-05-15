#!/bin/bash
# Mimio IELTS - VPS 初始化脚本
# 用法: ssh root@your-vps 'bash -s' < setup-vps.sh

set -e

echo "=== Mimio IELTS VPS Setup ==="

# 1. 更新系统
echo "[1/6] Updating system..."
apt update && apt upgrade -y

# 2. 安装 Node.js 20
echo "[2/6] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js $(node -v), npm $(npm -v)"

# 3. 安装 nginx
echo "[3/6] Installing nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi
systemctl enable nginx
systemctl start nginx

# 4. 安装 PM2
echo "[4/6] Installing PM2..."
npm install -g pm2

# 5. 创建部署目录
echo "[5/6] Creating deploy directory..."
mkdir -p /var/www/mimio

# 6. 配置防火墙
echo "[6/6] Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw --force enable
fi

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "  1. Upload project: rsync -avz --exclude node_modules --exclude dist ./ root@your-vps:/var/www/mimio/"
echo "  2. On VPS: cd /var/www/mimio && npm install && cd server && npm install && cd .. && npm run build"
echo "  3. Copy nginx config: cp /var/www/mimio/deploy/nginx.conf /etc/nginx/sites-available/mimio"
echo "  4. Link nginx config: ln -sf /etc/nginx/sites-available/mimio /etc/nginx/sites-enabled/"
echo "  5. Restart nginx: systemctl restart nginx"
echo "  6. Start server: cd /var/www/mimio && pm2 start deploy/ecosystem.config.cjs && pm2 save"
echo "  7. (Optional) SSL: apt install certbot python3-certbot-nginx && certbot --nginx"
