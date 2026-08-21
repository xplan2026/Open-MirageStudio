#!/bin/bash
# Coordinator-Agent 部署到 4C4G 服务器
# 依赖: MirageStudio-ops Skill (utils.sh)
# 用法: bash scripts/deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE="$(dirname "$PROJECT_DIR")"
UTILS="$WORKSPACE/.codebuddy/skills/MirageStudio-ops/scripts/utils.sh"

if [ ! -f "$UTILS" ]; then
  echo "[ERROR] 找不到 utils.sh: $UTILS"
  exit 1
fi

source "$UTILS"

# ============= 配置 =============
load_config
extract_ssh_key

REMOTE_BASE="${SERVER_DEPLOY_PATH:-/opt/mirage-studio}"
REMOTE_PATH="$REMOTE_BASE/coordinator-agent"

echo ""
echo "=========================================="
echo "  Coordinator-Agent 部署"
echo "=========================================="
echo "  本地项目: $PROJECT_DIR"
echo "  目标主机: ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}"
echo ""

# ============= 1. 前置检查 =============
log_step "1" "测试服务器连接..."
if ! ssh_connect_user "echo ok" 5 > /dev/null 2>&1; then
  log_error "无法连接服务器"
fi
log_success "SSH 连接成功"

# ============= 2. 远程目录准备 =============
log_step "2" "准备远程目录..."
ssh_connect "mkdir -p $REMOTE_PATH && chown -R ${SERVER_USER}:${SERVER_USER} $REMOTE_PATH" 5
log_success "远程目录就绪"

# ============= 3. 打包 & 上传 =============
log_step "3" "打包项目文件..."
cd "$PROJECT_DIR"
TARFILE="/tmp/coordinator-deploy-$(date +%s).tar.gz"

# 打包：排除 node_modules、.git、日志
tar czf "$TARFILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='admin-ui/node_modules' \
  --exclude='admin-ui/dist' \
  .

log_info "上传到服务器: $TARFILE → $REMOTE_PATH"
scp_transfer "$TARFILE" "$REMOTE_PATH/deploy.tar.gz"
rm -f "$TARFILE"

# ============= 4. 远程解压 & 安装 =============
log_step "4" "远程安装依赖..."
ssh_connect_user "bash -c '
  cd $REMOTE_PATH
  tar xzf deploy.tar.gz --overwrite
  rm -f deploy.tar.gz
  npm install --production
  cd admin-ui && npm install && npm run build && cd ..
  echo \"安装完成\"
'" 60

log_success "远程依赖安装完成"

# ============= 5. 配置 .env =============
log_step "5" "创建远程 .env..."
# 从本地 .env 提取 Coordinator 需要的变量（注意：env.mjs 加载的是项目根目录 .env，而非 REMOTE_PATH 自身）
ENV_CONTENT=$(grep -E '^(DEEPSEEK_|ZHIPU_|COORDINATOR_|ADMIN_SECRET)' "$WORKSPACE/.env")
ENV_FILE="$REMOTE_PATH/../.env"

# 通过 SSH 写入：保留远程 .env 中不在部署范围内的变量（如 BAIDU_*、ACE_* 等），避免覆盖丢失
ssh_connect_user "bash -c '
  ENV_FILE=\"$ENV_FILE\"
  if [ -f \"\$ENV_FILE\" ]; then
    grep -vE \"^(DEEPSEEK_|ZHIPU_|COORDINATOR_|ADMIN_SECRET)\" \"\$ENV_FILE\" > \"\$ENV_FILE.keep\" || true
  fi
  cat > \"\$ENV_FILE\" << EOF
# Coordinator-Agent 环境变量（部署于 $(date +%F)）
$ENV_CONTENT
EOF
  if [ -f \"\$ENV_FILE.keep\" ]; then
    cat \"\$ENV_FILE.keep\" >> \"\$ENV_FILE\"
    rm -f \"\$ENV_FILE.keep\"
  fi
  chmod 600 \"\$ENV_FILE\"
  echo \"环境变量已写入 \$ENV_FILE\"
'"

log_success ".env 配置完成"

# ============= 6. PM2 启动 =============
log_step "6" "PM2 启动服务..."
ssh_connect_user "bash -c '
  cd $REMOTE_PATH
  pm2 delete coordinator 2>/dev/null || true
  pm2 start src/index.js --name coordinator --cwd $REMOTE_PATH
  pm2 save
  pm2 status coordinator
'"

log_success "PM2 Coordinator 已启动"

# ============= 7. 更新 Nginx =============
log_step "7" "更新 Nginx 配置..."
ssh_connect "bash -c '
  cp $REMOTE_PATH/nginx/coordinator.conf /etc/nginx/sites-available/coordinator 2>/dev/null || true
  ln -sf /etc/nginx/sites-available/coordinator /etc/nginx/sites-enabled/coordinator 2>/dev/null || true
  nginx -t && systemctl reload nginx
  echo \"Nginx 已重载\"
'" 10

log_success "Nginx 配置已更新"

# ============= 8. 验证 =============
log_step "8" "验证部署..."
sleep 2

echo ""
echo "--- Coordinator API ---"
ssh_connect_user "curl -s http://127.0.0.1:3100/health" 5

echo ""
echo "--- Agent Registry ---"
ssh_connect_user "curl -s -X POST http://127.0.0.1:3100/internal/agent.list -H 'Content-Type: application/json' -d '{}' | head -c 200" 5

echo ""
echo "--- Admin UI ---"
ssh_connect_user "curl -s http://127.0.0.1:3100/ | head -c 80" 5

echo ""
echo "--- PM2 Status ---"
ssh_connect_user "pm2 status coordinator" 5

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  Admin UI:  http://${SERVER_HOST}/"
echo "  API:       http://${SERVER_HOST}:3100/health"
echo "=========================================="
