/**
 * Independent verification of the codemod: for every `X++` inserted inside a
 * `.duplicate` branch, confirm X is actually declared in the enclosing
 * function. Uses a DIFFERENT method from the codemod (forward brace-matching
 * from each function declaration) so a bug in one won't mask a bug in the
 * other. A ReferenceError here would be a runtime crash node -c cannot catch.
 */
const fs = require('fs');
const path = require('path');

const DIRS = ['C:/dev/funhive-web/scrapers', 'C:/dev/funhive-web/scrapers/helpers'];
const files = [];
for (const d of DIRS) for (const f of fs.readdirSync(d)) if (f.endsWith('.js')) files.push(path.join(d, f));

// Build [start,end) ranges for every function body in a file, forward.
function functionRanges(src) {
  const ranges = [];
  const re = /(?:\bfunction\b[^(){}]*\([^)]*\)\s*\{)|(?:=>\s*\{)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const open = src.indexOf('{', m.index + m[0].length - 1);
    if (open === -1) continue;
    let depth = 0, close = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close !== -1) ranges.push([open, close]);
  }
  return ranges;
}

let checked = 0, bad = 0;
const problems = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/\.duplicate\)\s*\{/.test(src)) continue;
  const ranges = functionRanges(src);

  // find each inserted duplicate branch and the counter it increments
  const re = /\.duplicate\)\s*\{([\s\S]{0,400}?)\n\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = m[1];
    const inc = body.match(/^\s*(\w+)\+\+;/m);
    if (!inc) continue; // empty branch — nothing to verify
    const name = inc[1];
    checked++;
    const idx = m.index;
    // innermost enclosing function range
    const encl = ranges
      .filter(([s, e]) => s < idx && idx < e)
      .sort((a, b) => (b[0] - a[0]))[0];
    if (!encl) { bad++; problems.push({ file: path.basename(file), name, why: 'no enclosing function found' }); continue; }
    const region = src.slice(encl[0], idx);
    const declRe = new RegExp(`\\b(?:let|var)\\b[^;\\n]*\\b${name}\\b`);
    if (!declRe.test(region)) {
      bad++;
      problems.push({ file: path.basename(file), name, why: 'declaration NOT found in enclosing function' });
    }
  }
}

console.log(`Verified ${checked} inserted counter increments.`);
console.log(bad === 0 ? '✅ all counters declared in their enclosing function' : `❌ ${bad} PROBLEMS:`);
problems.forEach(p => console.log(`   ${p.file}: ${p.name} — ${p.why}`));
