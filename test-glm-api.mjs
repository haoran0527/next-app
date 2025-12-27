// 测试智谱AI的完整API响应
async function testGLMAPI() {
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 22181a7402044fe0938d124d44662535.j4CuaTbNsK0lvwfk'
    },
    body: JSON.stringify({
      model: 'glm-4.6',
      messages: [
        {
          role: 'user',
          content: '晚饭花了121元，请用JSON格式返回：{"amount": 数字, "type": "INCOME"或"EXPENSE", "category": "分类", "description": "描述"}'
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  const data = await response.json();

  console.log('完整响应结构:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('content字段:', data.choices[0].message.content);
  console.log('\nreasoning_content长度:', data.choices[0].message.reasoning_content?.length);
  console.log('reasoning_content前200字符:', data.choices[0].message.reasoning_content?.substring(0, 200));
}

testGLMAPI();
