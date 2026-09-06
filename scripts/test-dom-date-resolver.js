#!/usr/bin/env node
/**
 * Regression suite for scrapers/helpers/dom-date-resolver.js.
 *
 * WHY: 14 WordPress-{state} scrapers share this resolver, so a change here is
 * fleet-wide and a regression is silent — a wrong date does not error, it just
 * lands the event in the InvalidDate bucket (or worse, saves under the wrong
 * day). Age detection broke three separate times for exactly this reason before
 * scripts/test-age-detection.js existed; this is the same guard for dates.
 *
 * WHAT IT TESTS: the REAL browser source. The resolver ships to page.evaluate()
 * as a string (RESOLVER_SRC) and is rehydrated with new Function, so this file
 * rehydrates it the same way and drives it with a minimal fake DOM. Testing a
 * mirrored Node-side copy instead would let the two drift, which is the failure
 * this suite is meant to catch.
 *
 * Read-only. No database, no network. Run after ANY edit to the resolver:
 *   node scripts/test-dom-date-resolver.js
 */

const { RESOLVER_SRC, hasRealDate, isTimeOnly } = require('../scrapers/helpers/dom-date-resolver');

const resolveEventDate = new Function('return ' + RESOLVER_SRC)();

// ------------------------------------------------------------------ fake DOM
// Only the surface the resolver actually touches.
function el(opts = {}) {
  const node = {
    tagName: (opts.tag || 'DIV').toUpperCase(),
    _attrs: opts.attrs || {},
    _text: opts.text || '',
    children: opts.children || [],
    childNodes: [],
    parentElement: null,
    previousElementSibling: null,
    caption: opts.caption || null,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null;
    },
    get textContent() {
      if (this.children.length) return this.children.map(c => c.textContent).join(' ');
      return this._text;
    },
    querySelectorAll(sel) {
      return this._descendants().filter(d => d._matches(sel));
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    _descendants() {
      const out = [];
      for (const c of this.children) { out.push(c); out.push(...c._descendants()); }
      return out;
    },
    // Enough selector support for the resolver's fixed selector list.
    _matches(sel) {
      if (sel === '*') return true;
      for (const part of sel.split(',').map(s => s.trim())) {
        if (part === 'time' && this.tagName === 'TIME') return true;
        if (part === 'time[datetime]' && this.tagName === 'TIME' && this.getAttribute('datetime')) return true;
        const attr = part.match(/^\[([a-z-]+)\]$/);
        if (attr && this.getAttribute(attr[1]) !== null) return true;
        const exact = part.match(/^\[([a-z-]+)="([^"]+)"\]$/);
        if (exact && this.getAttribute(exact[1]) === exact[2]) return true;
        const cls = part.match(/^\[class\*="([^"]+)"\]$/);
        if (cls && (this._attrs.class || '').includes(cls[1])) return true;
      }
      return false;
    }
  };
  for (const c of node.children) c.parentElement = node;
  return node;
}

/** Build a parent whose children are siblings, wired in document order. */
function siblings(...nodes) {
  const parent = el({ children: nodes });
  nodes.forEach((n, i) => {
    n.parentElement = parent;
    n.previousElementSibling = i > 0 ? nodes[i - 1] : null;
  });
  return parent;
}

// fromMonthGrid touches `document` when every earlier step misses.
global.document = { querySelector: () => null };

// ------------------------------------------------------------------- cases
const cases = [];
const t = (name, fn) => cases.push({ name, fn });

// --- predicates ---------------------------------------------------------
t('hasRealDate accepts ISO', () => hasRealDate('2026-09-14') === true);
t('hasRealDate accepts slashed', () => hasRealDate('9/14/26') === true);
t('hasRealDate accepts month+day', () => hasRealDate('September 14') === true);
t('hasRealDate rejects bare month+year', () => hasRealDate('September 2026') === false);
t('hasRealDate rejects a clock time', () => hasRealDate('10:30 AM') === false);
t('isTimeOnly flags a time range', () => isTimeOnly('6:00pm-7:00pm') === true);
t('isTimeOnly flags All Day', () => isTimeOnly('All Day') === true);
t('isTimeOnly clears a real date', () => isTimeOnly('September 14, 2026') === false);

// --- step 1: machine-readable attributes --------------------------------
t('prefers time[datetime] over visible clock text', () => {
  const card = el({ children: [el({ tag: 'time', attrs: { datetime: '2026-09-14T10:00' }, text: '10:00 AM' })] });
  return resolveEventDate(card) === '2026-09-14T10:00';
});
t('reads data-start-date on the card itself', () => {
  const card = el({ attrs: { 'data-start-date': '2026-09-14' } });
  return resolveEventDate(card) === '2026-09-14';
});
t('ignores a time[datetime] holding only a clock value', () => {
  const card = el({ children: [el({ tag: 'time', attrs: { datetime: '10:00' }, text: '10:00 AM' })] });
  return resolveEventDate(card) === '';
});

// --- step 2/3: visible text ---------------------------------------------
t('takes a real date from a .date element', () => {
  const card = el({ children: [el({ attrs: { class: 'event-date' }, text: 'September 14, 2026' })] });
  return resolveEventDate(card) === 'September 14, 2026';
});
t('does NOT take a time-only .date element', () => {
  const card = el({ children: [el({ attrs: { class: 'event-date' }, text: '10:30 AM' })] });
  return resolveEventDate(card) === '';
});

// --- step 4: sibling day headings — the 2026-09-06 Oldham regression ------
t('borrows a real day heading from a preceding sibling', () => {
  const heading = el({ tag: 'h3', text: 'Saturday, September 14, 2026' });
  const card = el({ children: [el({ text: 'Story Time' })] });
  siblings(heading, card);
  return resolveEventDate(card) === 'Saturday, September 14, 2026';
});
t('REJECTS a preceding sibling that is itself an event card (Oldham)', () => {
  const prev = el({ text: 'Cozy Corner 9/14/26@LaGrange10 - 11am' });
  const card = el({ children: [el({ text: 'Tot Time' })] });
  siblings(prev, card);
  return resolveEventDate(card) === '';
});
t('REJECTS a titled sibling carrying a month name', () => {
  const prev = el({ text: 'Tuesday Story Time - Re-starts September 22' });
  const card = el({ children: [el({ text: 'Open Play Cafe' })] });
  siblings(prev, card);
  return resolveEventDate(card) === '';
});
t('accepts a terse numeric heading', () => {
  const heading = el({ tag: 'h3', text: '9/14/26' });
  const card = el({ children: [el({ text: 'Bluey Beach Bash' })] });
  siblings(heading, card);
  return resolveEventDate(card) === '9/14/26';
});
t('accepts an "Events for <date>" heading', () => {
  const heading = el({ tag: 'h2', text: 'Events for September 14, 2026' });
  const card = el({ children: [el({ text: 'Sensory Play Time' })] });
  siblings(heading, card);
  return resolveEventDate(card) === 'Events for September 14, 2026';
});

// --- general -------------------------------------------------------------
t('returns empty string for a null card', () => resolveEventDate(null) === '');
t('returns empty string when no date exists anywhere', () => {
  const card = el({ children: [el({ text: 'Craft Night' })] });
  return resolveEventDate(card) === '';
});

// -------------------------------------------------------------------- run
let pass = 0;
const failures = [];
for (const c of cases) {
  let ok = false;
  try { ok = c.fn() === true; } catch (e) { failures.push(`${c.name} — threw ${e.message}`); continue; }
  if (ok) pass++; else failures.push(c.name);
}

console.log(`\nDOM date resolver — ${pass}/${cases.length} passed`);
if (failures.length) {
  console.log('\nFAILED:');
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('All cases passed.\n');
