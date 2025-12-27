#!/bin/bash
set -e

echo "================================"
echo "修复服务器AI模型配置"
echo "================================"
echo ""

cd /root/next-accounting-app

echo "1. 更新AI模型为 glm-4-flash..."
node -e "
const { PrismaClient } = require('./node_modules/@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'accounting_app',
  user: 'postgres',
  password: 'your-secure-password',
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  const result = await prisma.aIModel.updateMany({
    where: { isActive: true },
    data: { model: 'glm-4-flash' }
  });

  console.log('✓ 已更新', result.count, '个活跃模型为 glm-4-flash');

  const activeModel = await prisma.aIModel.findFirst({ where: { isActive: true } });
  console.log('✓ 当前激活模型:', activeModel.name, '-', activeModel.model);

  await prisma.\$disconnect();
  await pool.end();
})();
"

echo ""
echo "2. 确认代码已包含 reasoning_content 修复..."
if grep -q "reasoning_content" src/lib/services/agent-service.ts; then
  echo "✓ 代码已包含 reasoning_content 支持"
else
  echo "✗ 代码未包含 reasoning_content 支持，正在应用修复..."
  bash /tmp/fix-agent-service.sh
fi

echo ""
echo "3. 检查 max_tokens 设置..."
if grep -q "max_tokens: 2000" src/lib/services/agent-service.ts; then
  echo "✓ max_tokens 已设置为 2000"
else
  echo "⚠ max_tokens 可能需要调整为 2000"
fi

echo ""
echo "4. 重新构建应用..."
npm run build

echo ""
echo "5. 重启应用..."
pkill -f "npm start" || true
sleep 2
nohup npm start > /dev/null 2>&1 &
sleep 3

echo ""
echo "6. 验证应用运行状态..."
if ps aux | grep -q "[n]ext-server"; then
  echo "✓ 应用已成功启动"
  ps aux | grep "[n]ext-server"
else
  echo "✗ 应用启动失败"
  exit 1
fi

echo ""
echo "================================"
echo "✓ 部署完成！"
echo "================================"
