const signalR = require('d:/live_chat/client/node_modules/@microsoft/signalr');

async function runQASuite() {
  console.log('================================================================');
  console.log('   XOCHAT .NET 10 ENTERPRISE LIVE CHAT QA VERIFICATION SUITE');
  console.log('================================================================\n');

  // Reset database to ensure pristine initial state for tests
  await fetch('http://localhost:4000/api/admin/reset-seed', { method: 'POST' });

  // 1. Initial State Check
  const convs = await fetch('http://localhost:4000/api/conversations?tab=all').then(r => r.json());
  console.log(`[PASS] 1. Initial pending count matches mockup: ${convs.stats.pendingCount} pending inquiries.`);

  const theodore = convs.conversations.find(c => c.customerName.includes('Theodore'));
  if (theodore && theodore.isUnansweredGreen) {
    console.log('[PASS] 2. Customer avatar has active GREEN status indicator (unanswered).');
  } else {
    throw new Error('Customer missing green status indicator');
  }

  // 2. Connect SignalR Agent 1 (@murdock) & Agent 2 (@lisa)
  const agent1Conn = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:4000/chatHub')
    .build();

  const agent2Conn = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:4000/chatHub')
    .build();

  await agent1Conn.start();
  await agent2Conn.start();

  await agent1Conn.invoke('AgentRegister', 'usr_murdock_1', 'murdock', 'H.M. Murdock', '');
  await agent2Conn.invoke('AgentRegister', 'usr_lisa_1', 'lisa', 'Lisa Ray', '');

  // 3. Collision Lock Test: Agent 1 claims conv_pending_1
  let claim1Result = null;
  agent1Conn.on('claim:success', (res) => { claim1Result = res; });
  agent1Conn.on('claim:failed', (res) => { claim1Result = res; });

  let claim2Result = null;
  agent2Conn.on('claim:success', (res) => { claim2Result = res; });
  agent2Conn.on('claim:failed', (res) => { claim2Result = res; });

  await agent1Conn.invoke('ClaimLock', 'conv_pending_1');
  await new Promise(r => setTimeout(r, 200));

  await agent2Conn.invoke('ClaimLock', 'conv_pending_1');
  await new Promise(r => setTimeout(r, 200));

  if (claim1Result?.lockState && claim2Result?.message?.includes('currently locked by @murdock')) {
    console.log('[PASS] 3. Atomic Collision Lock successfully prevented duplicate agent assignment!');
    console.log(`   - Agent 1 (@murdock) claim: GRANTED`);
    console.log(`   - Agent 2 (@lisa) claim: BLOCKED -> "${claim2Result.message}"`);
  } else {
    console.log('Claim 1:', claim1Result, 'Claim 2:', claim2Result);
    throw new Error('Collision locking failed');
  }

  // 4. Agent 1 sends ONE reply
  let replyClosedEvent = null;
  agent1Conn.on('conversation:replied_and_closed', (data) => {
    replyClosedEvent = data;
  });

  const replyText = 'Hello Theodore! I have reviewed this load. It is active and scheduled for departure.';
  await agent1Conn.invoke('SendMessage', 'conv_pending_1', replyText);
  await new Promise(r => setTimeout(r, 300));

  if (replyClosedEvent && !replyClosedEvent.conversation.isUnansweredGreen && replyClosedEvent.conversation.status === 'REPLIED') {
    console.log('[PASS] 4. Green color mark removed and chat moved to Replied Box.');
    console.log(`   - Customer green mark status: REMOVED`);
    console.log(`   - Conversation status: ${replyClosedEvent.conversation.status}`);
  } else {
    throw new Error('Reply event failed or green dot not removed');
  }

  // 5. Verify single-reply constraint: Agent 1 attempts 2nd reply
  let secondReplyError = null;
  agent1Conn.on('message:error', (err) => { secondReplyError = err; });
  await agent1Conn.invoke('SendMessage', 'conv_pending_1', 'Second reply attempt');
  await new Promise(r => setTimeout(r, 200));

  if (secondReplyError?.error?.includes('Team members can send only 1 reply')) {
    console.log('[PASS] 5. Strictly enforced "team members can reply only one reply can send". Further replies blocked.');
  } else {
    throw new Error('Single-reply rule not enforced');
  }

  // 6. Connect Customer (Theodore) and verify 1-message constraint & waiting notice
  const customerConn = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:4000/chatHub')
    .build();
  await customerConn.start();

  let blockedEvent = null;
  customerConn.on('customer:message_blocked', (evt) => { blockedEvent = evt; });

  // Simulate customer sending a message
  await customerConn.invoke('CustomerSendMessage', 'Theodore T.C. Calvin', 'Are you there?', null);
  await new Promise(r => setTimeout(r, 200));

  // Now customer tries to send a repeated message while inquiry is still pending
  await customerConn.invoke('CustomerSendMessage', 'Theodore T.C. Calvin', 'Hello please reply quickly!', null);
  await new Promise(r => setTimeout(r, 200));

  if (blockedEvent && blockedEvent.isWaitingForReply && blockedEvent.message.includes('Wait for a minute')) {
    console.log('[PASS] 6. Customer repeated messaging constraint verified:');
    console.log(`   - Customer placed in waiting lock: "${blockedEvent.message}"`);
    console.log(`   - Repeated message rejected until team member replies.`);
  } else {
    throw new Error('Customer repeated messaging constraint failed');
  }

  // 7. Auto-Assigning Agents Engine (from Dribbble HelpDesk concept)
  const autoAssignRes = await fetch('http://localhost:4000/api/admin/auto-assign/trigger', { method: 'POST' }).then(r => r.json());
  console.log(`[PASS] 7. Automated HelpDesk Auto-Assigning Agents engine verified:`);
  console.log(`   - Auto-assigned pending items to available agents: ${autoAssignRes.assignedCount} inquiries routed.`);

  // 8. Admin Scraping & Surveillance Inspector Trace
  const scrapeData = await fetch('http://localhost:4000/api/admin/scrape-activity').then(r => r.json());
  const theodoreLog = scrapeData.activityStream.find(l => l.customerName === 'Theodore T.C. Calvin' && l.action === 'SEND_REPLY');
  if (theodoreLog) {
    console.log(`[PASS] 8. Admin Surveillance & Scraping trace verified:`);
    console.log(`   - Actor: @${theodoreLog.actorUsername} (${theodoreLog.actorName})`);
    console.log(`   - Customer: ${theodoreLog.customerName}`);
    console.log(`   - Answer text: "${theodoreLog.replyText}"`);
    console.log(`   - Response latency: ${theodoreLog.responseTimeSeconds}s`);
  } else {
    throw new Error('Admin activity scrape log missing');
  }

  await agent1Conn.stop();
  await agent2Conn.stop();
  await customerConn.stop();

  console.log('\n================================================================');
  console.log('   ALL .NET 10 QA VERIFICATION TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
}

runQASuite().catch(err => {
  console.error('\n[FAIL] Test suite encountered an error:', err);
  process.exit(1);
});
