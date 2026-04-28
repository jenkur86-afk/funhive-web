#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
console.log('FunHive — Fix Age Range (months detection + detail page display)\n');
let changes = 0;

// =============================================================================
// FIX 1: detectAgeRange() — handle "months" after number ranges
// "ages 18 to 36 months" should return "18-36 months" not "18-36"
// Also handle: "ages 6-24 months", "12 to 18 mo", etc.
// =============================================================================
const adapterFile = path.join(ROOT, 'scrapers/helpers/supabase-adapter.js');
if (fs.existsSync(adapterFile)) {
  let adapter = fs.readFileSync(adapterFile, 'utf8');

  const oldDetect = `  // Explicit age ranges: "ages 3-5", "age 6 to 12", "ages 0-18"
  const ageMatch = text.match(/\\bages?\\s+(\\d{1,2})\\s*[-–to]+\\s*(\\d{1,2})\\b/);
  if (ageMatch) return \`\${ageMatch[1]}-\${ageMatch[2]}\`;

  // Parenthetical ages: "(ages 11-18)", "(3-5 yrs)"
  const parenMatch = text.match(/\\((?:ages?\\s+)?(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})(?:\\s*(?:yrs?|years?))?\\)/);
  if (parenMatch) return \`\${parenMatch[1]}-\${parenMatch[2]}\`;`;

  const newDetect = `  // Explicit age ranges: "ages 3-5", "age 6 to 12", "ages 0-18"
  // Check for "months" or "mo" after the range to preserve month-based ages
  const ageMatch = text.match(/\\bages?\\s+(\\d{1,2})\\s*[-–to]+\\s*(\\d{1,2})\\s*(months?|mos?\\.?)?\\b/);
  if (ageMatch) {
    const isMonths = ageMatch[3] || (parseInt(ageMatch[1]) <= 36 && parseInt(ageMatch[2]) <= 36 && /month|mo\\b/i.test(text));
    return isMonths ? \`\${ageMatch[1]}-\${ageMatch[2]} months\` : \`\${ageMatch[1]}-\${ageMatch[2]}\`;
  }

  // Parenthetical ages: "(ages 11-18)", "(3-5 yrs)", "(6-24 months)"
  const parenMatch = text.match(/\\((?:ages?\\s+)?(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})(?:\\s*(?:months?|mos?\\.?|yrs?|years?))?\\)/);
  if (parenMatch) {
    const parenText = text.substring(text.indexOf(parenMatch[0]), text.indexOf(parenMatch[0]) + parenMatch[0].length + 1);
    const isMonths = /month|mo[\\.\\)\\s]/i.test(parenText);
    return isMonths ? \`\${parenMatch[1]}-\${parenMatch[2]} months\` : \`\${parenMatch[1]}-\${parenMatch[2]}\`;
  }`;

  if (adapter.includes(oldDetect)) {
    adapter = adapter.replace(oldDetect, newDetect);
    fs.writeFileSync(adapterFile, adapter);
    console.log('✅ detectAgeRange() — now handles months vs years');
    changes++;
  } else {
    console.log('⚠️  detectAgeRange() — pattern not found');
    // Debug
    const idx = adapter.indexOf('Explicit age ranges');
    if (idx > -1) {
      console.log('   Found at position', idx);
      console.log('   Context:', JSON.stringify(adapter.substring(idx, idx + 200)));
    }
  }
} else {
  console.log('⚠️  supabase-adapter.js not found');
}

// =============================================================================
// FIX 2: Event detail page — add age range section between About and Actions
// =============================================================================
const detailFile = path.join(ROOT, 'src/app/events/[id]/page.tsx');
if (fs.existsSync(detailFile)) {
  let detail = fs.readFileSync(detailFile, 'utf8');

  // Check if age_range section already exists
  if (detail.includes('age_range') || detail.includes('Age Range')) {
    console.log('⚠️  Event detail page — age range section already exists');
  } else {
    const oldAbout = `          {/* Action Buttons */}
          <EventActions`;

    const newAbout = `          {/* Age Range Section */}
          {event.age_range && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Age Range</h2>
              </div>
              <p className="text-gray-700 ml-7">{event.age_range}</p>
            </div>
          )}

          {/* Action Buttons */}
          <EventActions`;

    if (detail.includes(oldAbout)) {
      detail = detail.replace(oldAbout, newAbout);
      fs.writeFileSync(detailFile, detail);
      console.log('✅ Event detail page — added age range section');
      changes++;
    } else {
      console.log('⚠️  Event detail page — insertion pattern not found');
      const idx = detail.indexOf('Action Buttons');
      if (idx > -1) {
        console.log('   Context:', JSON.stringify(detail.substring(idx - 20, idx + 50)));
      }
    }
  }
} else {
  console.log('⚠️  Event detail page not found');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`\nDone! ${changes} fix(es) applied.`);
if (changes > 0) {
  console.log('\nFiles modified:');
  if (changes >= 1) console.log('  scrapers/helpers/supabase-adapter.js');
  if (changes >= 2) console.log('  src/app/events/[id]/page.tsx');
  console.log('\nCommit with:');
  console.log('  git add scrapers/helpers/supabase-adapter.js src/app/events/\\[id\\]/page.tsx');
  console.log('  git commit -m "Fix age range: detect months, add display to event detail page"');
  console.log('  git push origin main');
}
