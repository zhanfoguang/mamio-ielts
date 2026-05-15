#!/bin/bash
# Mimio IELTS - 部署脚本
# 用法: ./deploy/deploy.sh user@your-vps

set -e

VPS=${1:-root@your-vps}
REMOTE_DIR="/var/www/mimio"

echo "=== Deploying Mimio IELTS to $VPS ==="

# 1. 本地构建
echo "[1/3] Building frontend..."
npm run build

# 2. 同步文件到 VPS
echo "[2/3] Syncing files to VPS..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'server/mimio.db' \
    --exclude 'server/node_modules' \
    ./ $VPS:$REMOTE_DIR/

# 3. 远程安装依赖并重启
echo "[3/3] Installing dependencies and restarting..."
ssh $VPS "cd $REMOTE_DIR && npm install --production=false && cd server && npm install --production && cd .. && pm2 restart mimio-server || pm2 start deploy/ecosystem.config.cjs && pm2 save"

echo ""
echo "=== Deploy Complete ==="
echo "Visit: http://$VPS"
