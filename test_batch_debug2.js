const { BatchMode } = require('./dist/cli/batch-mode');

async function test() {
  const batch = new BatchMode();
  const requests = [
    { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
    { id: 'req-2', input: '필터링', userAction: 'modify', feedback: '타입 수정 필요' },
  ];

  const report = await batch.processBatch(requests);
  
  console.log('Results:');
  report.results.forEach(r => {
    console.log(`  ${r.requestId}: operation=${r.operation}, error=${r.error}, feedbackCollected=${r.feedbackCollected}`);
  });
  
  console.log(`\nTotal feedback collected: ${report.stats.totalFeedback}`);
}

test().catch(console.error);
