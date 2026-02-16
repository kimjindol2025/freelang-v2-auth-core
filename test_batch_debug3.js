const { BatchMode } = require('./dist/cli/batch-mode');

async function test() {
  const batch = new BatchMode();
  
  const inputs = [
    '배열 더하기',
    '배열 필터',
    '최댓값',
    '최솟값',
    '필터링',
    '정렬',
    '합산',
    '개수 세기',
    '배열 변환',
    '중복 제거',
  ];

  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push({
      id: `req-${i + 1}`,
      input: inputs[i],
      userAction: i % 3 === 0 ? 'approve' : 'modify',
    });
  }

  const report = await batch.processBatch(requests);
  
  console.log('Results:');
  report.results.forEach((r, i) => {
    const status = r.error ? '❌' : '✅';
    console.log(`  ${status} ${r.requestId}: "${r.input}" -> operation=${r.operation}, error=${r.error}`);
  });
  
  console.log(`\nTotal feedback collected: ${report.stats.totalFeedback} / 10`);
}

test().catch(console.error);
