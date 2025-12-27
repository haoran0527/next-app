// 测试本地AI解析功能
async function testLocal() {
  try {
    const { parseNaturalLanguageToTransaction } = await import('./src/lib/services/agent-service.ts');

    console.log('测试本地AI解析: "晚饭花了121"');
    console.log('='.repeat(50));

    const result = await parseNaturalLanguageToTransaction('晚饭花了121');

    if (result.success) {
      console.log('✓ 解析成功!');
      console.log('交易详情:', JSON.stringify(result.transaction, null, 2));
    } else {
      console.log('✗ 解析失败!');
      console.log('错误:', result.error);
      console.log('原始响应:', result.rawResponse?.substring(0, 200));
    }
  } catch (error) {
    console.error('测试出错:', error.message);
    console.error(error.stack);
  }
}

testLocal();
