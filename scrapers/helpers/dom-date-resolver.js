/**
 * Shared browser-side date resolver for the WordPress-{state} library scrapers.
 *
 * WHY THIS EXISTS
 * ---------------
 * Both extraction variants in that family picked a date element and took its
 * `.textContent`:
 *
 *   CT-variant: card.querySelector('[class*="date"], time').textContent
 *   GA-variant: possibleDates[0].textContent   // candidate list includes [class*="time"]
 *
 * On most of these themes the rendered text of the date/time element is the
 * CLOCK TIME, while the real date lives in the `datetime` attribute of a
 * <time> tag (`<time datetime="2026-08-13T10:00">10:00 AM</time>`). Neither
 * variant ever read an attribute, so the family's InvalidDate counts were
 * dominated by bare times — measured 2026-08-10 across a full Group 1 run, the
 * top skipped values were "6:00pm-7:00pm" (106), "1:00pm-2:00pm" (86),
 * "2:00pm-3:00pm" (78), "All Day" (65), "10:30 AM" (56). That is the exact
 * symptom described in SCRAPER-DIAGNOSIS-PROMPT.md section 2.
 *
 * This resolver prefers machine-readable attributes, rejects time-only strings
 * instead of returning them, and falls back to an ancestor walk for list views
 * that hang a day heading above several event cards.
 *
 * The resolver runs inside page.evaluate(), where it cannot close over Node
 * scope — so it is shipped as SOURCE and rehydrated in the browser:
 *
 *   const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');
 *   await page.evaluate((libName, src) => {
 *     const resolveEventDate = new Function('return ' + src)();
 *     ...
 *   }, library.name, RESOLVER_SRC);
 */

// ---------------------------------------------------------------- predicates
// Exported for Node-side unit testing; the browser copy lives inside the
// resolver source below so it stays self-contained when injected.

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';

/** True when the string carries an actual calendar date, not just a clock time. */
function hasRealDate(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  return (
    /\d{4}-\d{2}-\d{2}/.test(t) ||                                  // ISO 2026-08-13
    /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t) ||                          // 8/13/2026
    // (?!\d) so a bare month+year is NOT read as a date: "August 2026" would
    // otherwise match "August 20". That false positive made the resolver return
    // a calendar's caption ("Event dates for August 2026") as if it were the
    // event's date, on every event in a month-grid calendar.
    new RegExp(MONTH + '[a-z]*\\.?\\s+\\d{1,2}(?!\\d)', 'i').test(t) ||   // August 13
    new RegExp('\\d{1,2}\\s+' + MONTH, 'i').test(t)                       // 13 August
  );
}

/** True when the string is only a time, a time range, or an all-day marker. */
function isTimeOnly(s) {
  if (!s) return true;
  const t = String(s).trim();
  if (!t) return true;
  if (hasRealDate(t)) return false;
  if (/^all\s*day$/i.test(t)) return true;
  // 10:00 AM | 6:00pm-7:00pm | 6:00pm – 7:00pm | 10:00
  return /^\d{1,2}(:\d{2})?\s*(am|pm)?\s*(?:[-–—to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)?)?$/i.test(t);
}

// ---------------------------------------------------------------- resolver

/**
 * Browser-side. Given an event card element, return the best date string found,
 * or '' when the card carries no recoverable date.
 */
function resolveEventDate(card) {
  const MONTH_RE = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';

  function hasRealDate(s) {
    if (!s) return false;
    const t = String(s).trim();
    if (!t) return false;
    return (
      /\d{4}-\d{2}-\d{2}/.test(t) ||
      /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t) ||
      new RegExp(MONTH_RE + '[a-z]*\\.?\\s+\\d{1,2}(?!\\d)', 'i').test(t) ||
      new RegExp('\\d{1,2}\\s+' + MONTH_RE, 'i').test(t)
    );
  }

  // Month-grid calendars (CivicPlus and friends) put the month+year once in a
  // <caption> or heading and the day number in the grid cell, so no single
  // element carries a full date. Recombine them: walk up to the containing <td>,
  // take its day number, and pair it with the nearest month+year above.
  function fromMonthGrid(el) {
    let td = el;
    while (td && td.tagName !== 'TD') td = td.parentElement;
    if (!td) return '';

    // Day number: the cell's own day label, not a time or a room number.
    let day = '';
    const dayNodes = td.querySelectorAll('*');
    for (let i = 0; i < dayNodes.length; i++) {
      if (dayNodes[i].children.length) continue;
      const t = (dayNodes[i].textContent || '').trim();
      if (/^\d{1,2}$/.test(t) && +t >= 1 && +t <= 31) { day = t; break; }
    }
    if (!day) {
      const own = (td.childNodes[0] && td.childNodes[0].nodeValue || '').trim();
      if (/^\d{1,2}$/.test(own) && +own >= 1 && +own <= 31) day = own;
    }
    if (!day) return '';

    // Month + year: the table's caption, else any heading above it.
    let table = td;
    while (table && table.tagName !== 'TABLE') table = table.parentElement;
    const MY = new RegExp('(' + MONTH_RE + '[a-z]*)\\.?\\s+(\\d{4})', 'i');

    let m = null;
    if (table && table.caption) m = MY.exec(table.caption.textContent || '');
    if (!m && table) {
      let n = table.previousElementSibling, guard = 0;
      while (n && guard < 6 && !m) { m = MY.exec(n.textContent || ''); n = n.previousElementSibling; guard++; }
    }
    if (!m) {
      const h = document.querySelector('[class*="month"], caption, h1, h2, h3');
      if (h) m = MY.exec(h.textContent || '');
    }
    if (!m) return '';

    return m[1] + ' ' + day + ', ' + m[2];
  }

  if (!card) return '';

  // 1. Machine-readable attributes on the card or its descendants. These are
  //    authoritative when present — TEC, Squarespace and most block themes all
  //    emit an ISO value here even when the visible text is a clock time.
  var ATTR_SELECTORS = [
    'time[datetime]',
    '[data-start-date]',
    '[data-event-date]',
    '[data-date]',
    '[itemprop="startDate"]'
  ];
  var ATTRS = ['datetime', 'data-start-date', 'data-event-date', 'data-date', 'content'];

  for (var i = 0; i < ATTR_SELECTORS.length; i++) {
    var nodes = card.querySelectorAll(ATTR_SELECTORS[i]);
    for (var n = 0; n < nodes.length; n++) {
      for (var a = 0; a < ATTRS.length; a++) {
        var v = nodes[n].getAttribute(ATTRS[a]);
        if (v && hasRealDate(v)) return v.trim();
      }
    }
  }
  // The card itself may carry the attribute.
  for (var a2 = 0; a2 < ATTRS.length; a2++) {
    var own = card.getAttribute && card.getAttribute(ATTRS[a2]);
    if (own && hasRealDate(own)) return own.trim();
  }

  // 2. Visible text on date-ish elements — but only when it really is a date.
  //    Previously this step ran first and returned time-only values.
  var TEXT_SELECTORS = ['[class*="date"]', 'time', '[class*="when"]', '[class*="day"]'];
  for (var j = 0; j < TEXT_SELECTORS.length; j++) {
    var els = card.querySelectorAll(TEXT_SELECTORS[j]);
    for (var k = 0; k < els.length; k++) {
      var txt = (els[k].textContent || '').trim();
      if (hasRealDate(txt)) return txt;
    }
  }

  // 3. Any descendant whose text contains a date.
  var all = card.querySelectorAll('*');
  for (var m = 0; m < all.length; m++) {
    if (all[m].children.length) continue;           // leaf nodes only, avoids huge blobs
    var t2 = (all[m].textContent || '').trim();
    if (t2.length <= 60 && hasRealDate(t2)) return t2;
  }

  // 4. List views that group cards under a shared day heading: walk ancestors
  //    and look back at preceding siblings for a date. Bounded to 6 levels so a
  //    stray match from elsewhere on the page cannot be picked up.
  var node = card.parentElement;
  for (var depth = 0; depth < 6 && node; depth++) {
    var timeEl = node.querySelector && node.querySelector('time[datetime]');
    if (timeEl) {
      var dv = timeEl.getAttribute('datetime');
      if (dv && hasRealDate(dv)) return dv.trim();
    }
    var sib = card.previousElementSibling || node.previousElementSibling;
    var guard = 0;
    while (sib && guard < 5) {
      var st = (sib.textContent || '').trim();
      if (st.length <= 60 && hasRealDate(st)) return st;
      sib = sib.previousElementSibling;
      guard++;
    }
    node = node.parentElement;
  }

  // Last: a month-grid cell, where the full date exists only as day + caption.
  return fromMonthGrid(card) || '';
}

const RESOLVER_SRC = resolveEventDate.toString();

module.exports = { resolveEventDate, RESOLVER_SRC, hasRealDate, isTimeOnly };
