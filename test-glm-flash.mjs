// 测试不同的智谱AI模型
async function testModel(model) {
  console.log(`\n测试模型: ${model}`);
  console.log('='.repeat(50));

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 22181a7402044fe0938d124d44662535.j4CuaTbNsK0lvwfk'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个财务记录助手。请严格按照JSON格式返回：{"amount": 数字, "type": "INCOME"或"EXPENSE", "category": "分类", "description": "描述"}。不要包含任何其他内容。'
        },
        {
          role: 'user',
          content: '晚饭花了121元'
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  const message = data.choices[0].message;

  console.log('content不为空:', !!message.content);
  console.log('reasoning_content不为空:', !!message.reasoning_content);

  if (message.content) {
    console.log('✓ content字段有内容:', message.content.substring(0, 100));
  }
  if (message.reasoning_content) {
    console.log('✗ reasoning_content字段长度:', message.reasoning_content.length);
  }
}

// 测试多个模型
await testModel('glm-4-flash');
await testModel('glm-4-plus');
await testModel('glm-4.6');
