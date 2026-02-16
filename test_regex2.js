const token = "필터링";
const match = token.match(/^(.*?)(을|는|이|를|에서|에|와|고|지만|영)$/);
console.log('token:', token);
console.log('match:', match);
if (match) {
  console.log('result:', match[1]);
} else {
  console.log('no match - original:', token);
}
