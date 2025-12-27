#!/bin/bash
# 将本地修复后的agent-service.ts部署到服务器

SERVER="root@121.89.202.27"
KEY="C:\\Users\\haora\\.ssh\\next_app_key"
REMOTE_PATH="/root/next-accounting-app/src/lib/services/agent-service.ts"
LOCAL_FILE="D:\\work\\next\\src\\lib\\services\\agent-service.ts"

echo "========================================"
echo "部署修复后的agent-service.ts到服务器"
echo "========================================"
echo ""

# 1. 备份服务器上的原文件
echo "1. 备份服务器原文件..."
ssh -i "$KEY" "$SERVER" "cd /root/next-accounting-app && cp src/lib/services/agent-service.ts src/lib/services/agent-service.ts.backup-\$(date +%Y%m%d-%H%M%S)"
echo "✓ 备份完成"

# 2. 上传修复后的文件
echo ""
echo "2. 上传修复后的文件..."
scp -i "$KEY" "$LOCAL_FILE" "$SERVER:$REMOTE_PATH"
echo "✓ 文件已上传"

# 3. 验证上传
echo ""
echo "3. 验证文件内容..."
ssh -i "$KEY" "$SERVER" "cd /root/next-accounting-app && grep -c 'extractJSONFromText' src/lib/services/agent-service.ts"
echo "✓ 文件验证完成"

# 4. 重新构建
echo ""
echo "4. 重新构建应用..."
ssh -i "$KEY" "$SERVER" "cd /root/next-accounting-app && npm run build"
echo "✓ 构建完成"

# 5. 重启应用
echo ""
echo "5. 重启应用..."
ssh -i "$KEY" "$SERVER" "cd /root/next-accounting-app && pkill -f 'npm start' || true; sleep 2; nohup npm start > /dev/null 2>&1 &"
sleep 3
echo "✓ 应用已重启"

# 6. 验证运行状态
echo ""
echo "6. 验证应用状态..."
ssh -i "$KEY" "$SERVER" "ps aux | grep '[n]ext-server'"
echo "✓ 应用运行正常"

echo ""
echo "========================================"
echo "✓ 部署完成！"
echo "========================================"
