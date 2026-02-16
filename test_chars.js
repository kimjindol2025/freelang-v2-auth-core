const word = "필터영";
console.log('word:', word);
console.log('chars:', [...word].map((c, i) => `${i}: ${c} (U+${c.charCodeAt(0).toString(16).toUpperCase()})`));

const word2 = "필터링";
console.log('\nword2:', word2);
console.log('chars:', [...word2].map((c, i) => `${i}: ${c} (U+${c.charCodeAt(0).toString(16).toUpperCase()})`));
