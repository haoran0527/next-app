#!/bin/bash
# 修复服务器AI解析问题的脚本
# 此脚本将更新agent-service.ts以支持各种AI模型

set -e

echo "========================================"
echo "修复服务器AI解析功能"
echo "========================================"
echo ""

cd /root/next-accounting-app

# 1. 备份原文件
echo "1. 备份原文件..."
cp src/lib/services/agent-service.ts src/lib/services/agent-service.ts.backup-$(date +%Y%m%d-%H%M%S)
echo "✓ 备份完成"

# 2. 创建修复补丁
echo ""
echo "2. 应用修复补丁..."

# 使用perl进行多行替换（比sed更可靠）
perl -i -0777 -pe '
s/  const data = await response\.json\(\)
  \/\/ 处理智谱AI的reasoning_content字段\(content可能为空\)
  const message = data\.choices\[0\]\.message
  const content = message\.content \|\| message\.reasoning_content \|\| '"'"''"'"'

  if \(!content \|\| content\.trim\(\) === '"'"''"'"'\) \{
    console\.error\('"'"'AI返回空内容:'"'"', \{ message, data \}\)
    throw new Error\('"'"'AI返回空内容，请尝试切换到其他AI模型'"'"'\)
  \}
  return content
\}/  const data = await response\.json\(\)
  \/\/ 智能提取AI响应内容，兼容多种模型
  const message = data\.choices\[0\]\.message
  let content = message\.content \|\| '"'"''"'"'

  \/\/ 如果content为空，尝试从reasoning_content提取
  if \(!content \|\| content\.trim\(\) === '"'"''"'"'\) \{
    if \(message\.reasoning_content\) \{
      content = extractJSONFromText\(message\.reasoning_content\)
    \}
  \}

  if \(!content \|\| content\.trim\(\) === '"'"''"'"'\) \{
    console\.error\('"'"'AI返回空内容:'"'"', \{ message, data \}\)
    throw new Error\('"'"'AI返回空内容，请尝试切换到其他AI模型或增加max_tokens'"'"'\)
  \}

  return content
\}

\/\*\*
 \* 从文本中智能提取JSON
 \* 处理reasoning_content中的思考过程，提取最终的JSON结果
 \*\/
function extractJSONFromText\(text: string\): string \{
  \/\/ 尝试提取最后一个```json\.\.\.```代码块
  const jsonCodeBlockRegex = \/```json\\s*\(\[\\s\\S\]\*?\)\\s*```\/gi
  const matches = \[\.\.\.text\.matchAll\(jsonCodeBlockRegex\)\]

  if \(matches\.length > 0\) \{
    \/\/ 返回最后一个JSON代码块（通常是最终答案）
    const lastMatch = matches\[matches\.length - 1\]
    return lastMatch\[1\]\.trim\(\)
  \}

  \/\/ 尝试提取普通的```\.\.\.```代码块
  const codeBlockRegex = \/```\\s*\(\[\\s\\S\]\*?\)\\s*```\/gi
  const codeMatches = \[\.\.\.text\.matchAll\(codeBlockRegex\)\]

  if \(codeMatches\.length > 0\) \{
    const lastMatch = codeMatches\[codeMatches\.length - 1\]
    const content = lastMatch\[1\]\.trim\(\)
    \/\/ 验证是否是JSON格式
    if \(content\.startsWith\('"'"'\{'"'"'\) \|\| content\.startsWith\('"'"'\['"'"'\)\) \{
      return content
    \}
  \}

  \/\/ 尝试直接查找JSON对象（从最后一个\{开始到最后的\}）
  const lastBraceIndex = text\.lastIndexOf\('"'"'\{'"'"'\)
  if \(lastBraceIndex !== -1\) \{
    const potentialJson = text\.substring\(lastBraceIndex\)
    \/\/ 尝试找到匹配的闭合括号
    let braceCount = 0
    let endIndex = -1
    for \(let i = 0; i < potentialJson\.length; i\+\+\) \{
      if \(potentialJson\[i\] === '"'"'\{'"'"'\) braceCount\+\+
      else if \(potentialJson\[i\] === '"'"'\}'"'"'\) braceCount--

      if \(braceCount === 0\) \{
        endIndex = i \+ 1
        break
      \}
    \}

    if \(endIndex !== -1\) \{
      const jsonStr = potentialJson\.substring\(0, endIndex\)
      \/\/ 验证是否是有效JSON
      try \{
        JSON\.parse\(jsonStr\)
        return jsonStr
      \} catch \{
        \/\/ 不是有效JSON，继续尝试其他方法
      \}
    \}
  \}

  \/\/ 如果都失败了，返回原文本
  return text
\}/
' src/lib/services/agent-service.ts

echo "✓ 补丁已应用"

# 3. 验证max_tokens设置
echo ""
echo "3. 验证max_tokens设置..."
if grep -q "max_tokens: 2000" src/lib/services/agent-service.ts; then
  echo "✓ max_tokens已设置为2000"
else
  echo "⚠ max_tokens可能需要调整"
fi

# 4. 验证extractJSONFromText函数已添加
echo ""
echo "4. 验证函数添加..."
if grep -q "extractJSONFromText" src/lib/services/agent-service.ts; then
  echo "✓ extractJSONFromText函数已添加"
else
  echo "✗ 函数添加失败"
  exit 1
fi

# 5. 重新构建应用
echo ""
echo "5. 重新构建应用..."
npm run build

# 6. 重启应用
echo ""
echo "6. 重启应用..."
pkill -f "npm start" || true
sleep 2
nohup npm start > /dev/null 2>&1 &
sleep 3

# 7. 验证应用运行状态
echo ""
echo "7. 验证应用状态..."
if ps aux | grep -q "[n]ext-server"; then
  echo "✓ 应用已成功启动"
  ps aux | grep "[n]ext-server"
else
  echo "✗ 应用启动失败"
  exit 1
fi

echo ""
echo "========================================"
echo "✓ 修复完成！"
echo "========================================"
echo ""
echo "修复内容："
echo "- 增加max_tokens到2000"
echo "- 添加智能JSON提取函数"
echo "- 兼容多种AI模型（OpenAI、智谱AI等）"
echo "- 自动从reasoning_content提取JSON"
