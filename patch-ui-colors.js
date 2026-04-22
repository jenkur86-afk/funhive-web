#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.env.HOME, 'funhive-web');

console.log('FunHive UI Patcher - Category Colors + Venue Age Tags\n');

let changes = 0;

// --- 1. Events page: category badge uses category color ---
const eventsFile = path.join(ROOT, 'src/app/events/page.tsx');
let ev = fs.readFileSync(eventsFile, 'utf8');

const evOld = `<span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={catIcon.color}>
                            <path d={catIcon.path} />
                          </svg>
                          {event.category}
                        </span>`;

const evNew = `<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ color: catIcon.color, backgroundColor: catIcon.color + '15' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d={catIcon.path} />
                          </svg>
                          {event.category}
                        </span>`;

if (ev.includes(evOld)) {
  ev = ev.replace(evOld, evNew);
  fs.writeFileSync(eventsFile, ev);
  console.log('✅ Events page - category badge colors');
  changes++;
} else {
  console.log('⚠️  Events page - pattern not found (may already be patched)');
}

// --- 2. Activities page: category badge uses category color ---
const actFile = path.join(ROOT, 'src/app/activities/page.tsx');
let act = fs.readFileSync(actFile, 'utf8');

const actOld = `<span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={catIcon.color}>
                            <path d={catIcon.path} />
                          </svg>
                          {venue.category}
                        </span>`;

const actNew = `<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ color: catIcon.color, backgroundColor: catIcon.color + '15' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d={catIcon.path} />
                          </svg>
                          {venue.category}
                        </span>`;

if (act.includes(actOld)) {
  act = act.replace(actOld, actNew);
  fs.writeFileSync(actFile, act);
  console.log('✅ Activities page - category badge colors');
  changes++;
} else {
  console.log('⚠️  Activities page - pattern not found (may already be patched)');
}

// --- 3. Homepage: add getCategoryIcon import + colored category badges ---
const homeFile = path.join(ROOT, 'src/app/page.tsx');
let home = fs.readFileSync(homeFile, 'utf8');

// Add import
if (!home.includes('getCategoryIcon')) {
  home = home.replace(
    "import { createServerClient } from '@/lib/supabase-server'",
    "import { createServerClient } from '@/lib/supabase-server'\nimport { getCategoryIcon } from '@/lib/category-icons'"
  );
}

// Replace both category badges (upcoming + weekend sections)
const homeOld = `{event.category && (
                    <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                      {event.category}
                    </span>
                  )}`;

const homeNew = `{event.category && (() => {
                    const ci = getCategoryIcon(event.category)
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ color: ci.color, backgroundColor: ci.color + '15' }}>
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d={ci.path} />
                        </svg>
                        {event.category}
                      </span>
                    )
                  })()}`;

const homeCount = home.split(homeOld).length - 1;
if (homeCount > 0) {
  home = home.split(homeOld).join(homeNew);
  fs.writeFileSync(homeFile, home);
  console.log(`✅ Homepage - ${homeCount} category badge(s) updated with colors + icons`);
  changes++;
} else {
  console.log('⚠️  Homepage - pattern not found (may already be patched)');
}

// --- 4. Supabase adapter: add detectAgeRange fallback for activities ---
const adapterFile = path.join(ROOT, 'scrapers/helpers/supabase-adapter.js');
let adapter = fs.readFileSync(adapterFile, 'utf8');

const adOld = '    age_range: data.ageRange || null,';
const adNew = '    age_range: data.ageRange || detectAgeRange(data.name, data.description) || null,';

const adOccurrences = adapter.split(adOld).length - 1;
if (adOccurrences === 1) {
  adapter = adapter.replace(adOld, adNew);
  fs.writeFileSync(adapterFile, adapter);
  console.log('✅ Supabase adapter - venue age auto-detection enabled');
  changes++;
} else if (adOccurrences === 0) {
  console.log('⚠️  Supabase adapter - pattern not found (may already be patched)');
} else {
  console.log('⚠️  Supabase adapter - multiple matches, skipping (manual fix needed)');
}

console.log(`\nDone! ${changes} file(s) patched.`);
