const signalR = require('d:/live_chat/client/node_modules/@microsoft/signalr');
const assert = require('assert');

async function testDateFiltering() {
  console.log('================================================================');
  console.log('   TESTING DATE FILTERING FOR TEAM MEMBER CHATS & PROOF');
  console.log('================================================================');

  // 1. Reset seed
  await fetch('http://localhost:4000/api/admin/reset-seed', { method: 'POST' });

  // 2. Login Murdock
  const murdockRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'murdock', password: 'murdock123' })
  }).then(r => r.json());
  const murdockToken = murdockRes.token;
  assert(murdockToken, 'Murdock login failed');

  // 3. Connect Murdock to SignalR
  const agentConn = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:4000/chatHub', {
      headers: { Authorization: `Bearer ${murdockToken}` }
    })
    .build();

  await agentConn.start();
  await agentConn.invoke('AgentRegister', 'usr_murdock_1', 'murdock', 'H.M. Murdock', '');

  // 4. Claim and send reply to Theodore (conv_pending_1)
  await agentConn.invoke('ClaimLock', 'conv_pending_1');
  await new Promise(r => setTimeout(r, 200));

  await agentConn.invoke('SendMessage', 'conv_pending_1', 'Hello ? Interested in this loads?');
  await new Promise(r => setTimeout(r, 400));
  await agentConn.stop();

  // 5. Check the conversation message date formatting
  const convDetail = await fetch('http://localhost:4000/api/conversations/conv_pending_1', {
    headers: { Authorization: `Bearer ${murdockToken}` }
  }).then(r => r.json());

  assert.strictEqual(convDetail.conversation.status, 'REPLIED');
  assert.strictEqual(convDetail.conversation.messages.length, 2);
  const agentMsg = convDetail.conversation.messages[1];

  console.log('[PASS] 1. Agent reply recorded with full date & time proof:');
  console.log('   - Time Formatted:', agentMsg.timeFormatted);
  console.log('   - Date Formatted:', agentMsg.dateFormatted);
  console.log('   - Sender:', agentMsg.senderUsername);
  console.log('   - Text:', agentMsg.text);

  // 6. Test date filtering with today's date in both DD.MM.YYYY and MM.DD.YYYY
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  const ddmm = `${dd}.${mm}.${yyyy}`;
  const mmdd = `${mm}.${dd}.${yyyy}`;

  console.log(`\nTesting filter with today date: ${ddmm} (DD.MM.YYYY) and ${mmdd} (MM.DD.YYYY):`);

  // Mine tab check with DD.MM.YYYY
  const mineDD = await fetch(`http://localhost:4000/api/conversations?tab=mine&date=${ddmm}&agentId=usr_murdock_1`, {
    headers: { Authorization: `Bearer ${murdockToken}` }
  }).then(r => r.json());

  assert.strictEqual(mineDD.conversations.length, 1, `Mine tab must return 1 conversation for ${ddmm}`);
  assert.strictEqual(mineDD.conversations[0].id, 'conv_pending_1');
  console.log(`[PASS] 2. "Mine" tab on ${ddmm} (DD.MM.YYYY) returns Murdock's replied chat!`);

  // Mine tab check with MM.DD.YYYY
  const mineMM = await fetch(`http://localhost:4000/api/conversations?tab=mine&date=${mmdd}&agentId=usr_murdock_1`, {
    headers: { Authorization: `Bearer ${murdockToken}` }
  }).then(r => r.json());

  assert.strictEqual(mineMM.conversations.length, 1, `Mine tab must return 1 conversation for ${mmdd}`);
  console.log(`[PASS] 3. "Mine" tab on ${mmdd} (MM.DD.YYYY) returns Murdock's replied chat!`);

  // Replied tab check
  const repliedDD = await fetch(`http://localhost:4000/api/conversations?tab=replied&date=${ddmm}&agentId=usr_murdock_1`, {
    headers: { Authorization: `Bearer ${murdockToken}` }
  }).then(r => r.json());

  assert.strictEqual(repliedDD.conversations.length, 1);
  console.log(`[PASS] 4. "Replied" tab on ${ddmm} returns Murdock's replied chat!`);

  // Inquiry date check (10.28.2026) - original inquiry date also retains the chat under Mine
  const octMine = await fetch(`http://localhost:4000/api/conversations?tab=mine&date=10.28.2026&agentId=usr_murdock_1`, {
    headers: { Authorization: `Bearer ${murdockToken}` }
  }).then(r => r.json());
  assert.strictEqual(octMine.conversations.length, 2, 'Oct 28 must have both Theodore and Martin Riggs');
  console.log(`[PASS] 5. Inquiry date (10.28.2026) also preserves the chat under Mine (${octMine.conversations.length} found).`);

  // "All" tab pending on 10.28.2026: 10 pending (since Theodore is replied)
  const octAll = await fetch(`http://localhost:4000/api/conversations?tab=all&date=10.28.2026`, {
    headers: { Authorization: `Bearer ${murdockToken}` }
  }).then(r => r.json());
  assert.strictEqual(octAll.conversations.length, 10);
  console.log(`[PASS] 6. "All" tab on 10.28.2026 returns remaining pending inquiries (${octAll.conversations.length} pending).`);

  console.log('\n================================================================');
  console.log('   ALL DATE FILTERING & PROOF TESTS PASSED (100%)');
  console.log('================================================================');
}

testDateFiltering().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
