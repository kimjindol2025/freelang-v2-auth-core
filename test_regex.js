const text = "필터영";
const match = text.match(/^(.*?)(을|는|이|를|에서|에|와|고|지만|영)$/);
console.log('text:', text);
console.log('match:', match);
if (match) {
  console.log('matched:', match[1]);
}
