const token = '8ef62c8320f79764055b0fa1cf9f266ce33c0734aae5c2b88edf8aeb4193a94c';

console.log('Token to verify:', token.substring(0, 20) + '...');
console.log('Token length:', token.length);
console.log('\nPlease manually run this query on the server:');
console.log(`psql -U postgres -d accounting_app -c "SELECT id, user_id, created_at, expires_at FROM sessions WHERE token = '${token}';"`);
