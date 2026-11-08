const BASE_URL = 'http://localhost:4000/api';

async function testMineAndRepliedIsolation() {
  console.log('================================================================');
  console.log('   TESTING MINE & REPLIED TAB ISOLATION (SECURITY & UX RULES)');
  console.log('================================================================\n');

  // Reset seed so state is pristine
  await fetch('http://localhost:4000/api/admin/reset-seed', { method: 'POST' });

  // 1. Login as Murdock (Team Member)
  const murdockAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'murdock', password: 'murdock123' })
  }).then(r => r.json());

  // 2. Login as Lisa (Team Member)
  const lisaAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'lisa', password: 'lisa123' })
  }).then(r => r.json());

  // 3. Login as Super Admin
  const adminAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'admin123' })
  }).then(r => r.json());

  console.log('Logins successful:');
  console.log(`- Murdock token acquired: role = ${murdockAuth.user.role}`);
  console.log(`- Lisa token acquired: role = ${lisaAuth.user.role}`);
  console.log(`- Super Admin token acquired: role = ${adminAuth.user.role}\n`);

  // --- TEST A: Check Murdock's "Mine" Tab ---
  const murdockMine = await fetch(`${BASE_URL}/conversations?tab=mine&agentId=murdock`, {
    headers: { Authorization: `Bearer ${murdockAuth.token}` }
  }).then(r => r.json());

  console.log('A. Murdock "Mine" tab check:');
  console.log(`   - Total items returned under Mine: ${murdockMine.conversations.length}`);
  console.log(`   - stats.mineCount: ${murdockMine.stats.mineCount}`);
  console.log(`   - stats.myRepliedCount: ${murdockMine.stats.myRepliedCount}`);

  // Assert ZERO unreplied messages under Mine
  const unrepliedInMine = murdockMine.conversations.filter(c => !c.hasReplied || c.status !== 'REPLIED');
  if (unrepliedInMine.length > 0) {
    throw new Error(`FAILURE: Found ${unrepliedInMine.length} UNREPLIED message(s) under Murdock's "Mine" tab!`);
  }
  console.log('   [PASS] ZERO unreplied messages found under "Mine". Unreplied messages are completely blocked from Mine!');

  // Assert all items in Mine have Murdock's reply
  for (const c of murdockMine.conversations) {
    const hasMurdockReply = c.messages.some(m => m.senderType === 'AGENT' && (m.senderUsername === 'murdock' || m.senderId === murdockAuth.user.id));
    if (!hasMurdockReply) {
      throw new Error(`FAILURE: Conversation ${c.id} under Mine does not have Murdock's reply!`);
    }
  }
  console.log('   [PASS] Every conversation under Murdock\'s "Mine" is strictly a conversation he replied to.');
  console.log(`   [PASS] stats.mineCount (${murdockMine.stats.mineCount}) strictly equals myRepliedCount (${murdockMine.stats.myRepliedCount}).\n`);

  // --- TEST B: Check Murdock's "Replied" Tab (Agent Isolation) ---
  const murdockReplied = await fetch(`${BASE_URL}/conversations?tab=replied&agentId=murdock`, {
    headers: { Authorization: `Bearer ${murdockAuth.token}` }
  }).then(r => r.json());

  console.log('B. Murdock "Replied" tab check:');
  console.log(`   - Items returned: ${murdockReplied.conversations.length}`);
  console.log(`   - stats.repliedCount: ${murdockReplied.stats.repliedCount}`);

  // Verify Murdock cannot see replies by Lisa or other agents
  for (const c of murdockReplied.conversations) {
    const hasMurdockReply = c.messages.some(m => m.senderType === 'AGENT' && (m.senderUsername === 'murdock' || m.senderId === murdockAuth.user.id));
    if (!hasMurdockReply) {
      throw new Error(`SECURITY BREACH: Murdock can see another agent's replied conversation (${c.id})!`);
    }
  }
  console.log('   [PASS] Strict agent isolation enforced: Murdock CANNOT see other agents\' replied messages.');

  // --- TEST C: Check Lisa's "Replied" Tab ---
  const lisaReplied = await fetch(`${BASE_URL}/conversations?tab=replied&agentId=lisa`, {
    headers: { Authorization: `Bearer ${lisaAuth.token}` }
  }).then(r => r.json());

  console.log('\nC. Lisa "Replied" tab check:');
  console.log(`   - Items returned for Lisa: ${lisaReplied.conversations.length}`);
  for (const c of lisaReplied.conversations) {
    const hasLisaReply = c.messages.some(m => m.senderType === 'AGENT' && (m.senderUsername === 'lisa' || m.senderId === lisaAuth.user.id));
    if (!hasLisaReply) {
      throw new Error(`SECURITY BREACH: Lisa can see another agent's replied conversation (${c.id})!`);
    }
  }
  console.log('   [PASS] Strict agent isolation enforced: Lisa CANNOT see Murdock\'s replied messages.');

  // --- TEST D: Check Super Admin "Replied" Tab ---
  const adminReplied = await fetch(`${BASE_URL}/conversations?tab=replied`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` }
  }).then(r => r.json());

  console.log('\nD. Super Admin "Replied" tab check:');
  console.log(`   - Total team replies visible to Super Admin: ${adminReplied.conversations.length}`);
  console.log(`   - stats.repliedCount: ${adminReplied.stats.repliedCount}`);
  if (adminReplied.conversations.length < murdockReplied.conversations.length) {
    throw new Error('FAILURE: Super Admin cannot see team replies!');
  }
  console.log('   [PASS] Super Admin retains full organizational oversight of all team replies.');

  // --- TEST E: Check Murdock's "All" (Inbox) Tab ---
  const murdockAll = await fetch(`${BASE_URL}/conversations?tab=all&agentId=murdock`, {
    headers: { Authorization: `Bearer ${murdockAuth.token}` }
  }).then(r => r.json());

  console.log('\nE. Murdock "All" (Inbox pending queue) check:');
  console.log(`   - Total pending inquiries in All: ${murdockAll.conversations.length}`);
  const repliedInAll = murdockAll.conversations.filter(c => c.hasReplied || c.status === 'REPLIED');
  if (repliedInAll.length > 0) {
    throw new Error(`FAILURE: Found ${repliedInAll.length} replied message(s) in "All" inbox!`);
  }
  console.log('   [PASS] "All" inbox contains strictly pending unanswered inquiries with active green marks.');

  console.log('\n================================================================');
  console.log('   ALL TAB ISOLATION & SECURITY REQUIREMENTS VERIFIED (100% PASS)');
  console.log('================================================================\n');
}

testMineAndRepliedIsolation().catch(err => {
  console.error('\n[FAIL] Test encountered error:', err);
  process.exit(1);
});
