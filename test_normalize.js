const { TextNormalizer } = require('./dist/engine/text-normalizer');

const inputs = ['배열 더하기', '필터링', '정렬'];
inputs.forEach(input => {
  const tokens = TextNormalizer.normalize(input);
  console.log(`"${input}" -> [${tokens.join(', ')}]`);
});
