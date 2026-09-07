#!/usr/bin/env node
/**
 * enumerate-libcal-calendars.js — list the individual calendars (cid values) a
 * shared LibCal instance exposes.
 *
 * WHY: several libraries publish on a CONSORTIUM LibCal tenant — bccls.libcal.com
 * serves seven Bergen County NJ libraries, oslri.libcal.com is Ocean State
 * Libraries statewide, delcolibraries.libcal.com lists 254 library names. Pointing
 * one library's config entry at the bare consortium host would import the whole
 * consortium under that library's name, which is worse than the zero it replaces.
 *
 * LibCal already solves this: `?cid=<n>` restricts the calendar to one library,
 * and 20 entries in the LibCal config already use a specific cid. The only missing
 * piece is the mapping from library name to cid, which the instance itself
 * publishes in its calendar picker. This reads that picker.
 *
 * Output is a TSV of host, cid, calendar name — a lookup table, not a config edit.
 * Matching a target library to a cid is still a judgement: consortium calendars
 * are named inconsistently ("Main", "Children's Room", "Tenafly"), so the caller
 * checks the name against the library before using it.
 *
 *   node scripts/enumerate-libcal-calendars.js --hosts=bccls.libcal.com,oslri.libcal.com --out=cids.tsv
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, createStealthPage } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'puppeteer-config'));

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const HOSTS = String(arg('hosts', '')).split(',').map(s => s.trim()).filter(Boolean);
const OUT = arg('out');
if (!HOSTS.length || !OUT) { console.error('Usage: --hosts=a.libcal.com,b.libcal.com --out=cids.tsv'); process.exit(1); }

async function forHost(browser, host) {
  const page = await createStealthPage(browser);
  const rows = [];
  try {
    // The calendar picker lives on the main calendar view.
    await page.goto(`https://${host}/calendar`, { waitUntil: 'networkidle2', timeout: 45000 })
      .catch(() => page.goto(`https://${host}/`, { waitUntil: 'networkidle2', timeout: 45000 }));
    await new Promise(r => setTimeout(r, 2500));

    const found = await page.evaluate(() => {
      const out = [];
      // 1. A <select> of calendars — the usual shape.
      document.querySelectorAll('select option').forEach(o => {
        const v = (o.getAttribute('value') || '').trim();
        if (/^\d+$/.test(v) && o.textContent.trim()) out.push({ cid: v, name: o.textContent.trim(), from: 'select' });
      });
      // 2. Links that carry cid= directly.
      document.querySelectorAll('a[href*="cid="]').forEach(a => {
        const m = /cid=(\d+)/.exec(a.getAttribute('href') || '');
        if (m && a.textContent.trim()) out.push({ cid: m[1], name: a.textContent.trim(), from: 'link' });
      });
      // 3. Checkbox/radio filters keyed by cid.
      document.querySelectorAll('input[value]').forEach(i => {
        const v = (i.getAttribute('value') || '').trim();
        if (!/^\d+$/.test(v)) return;
        const lab = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
        const name = (lab ? lab.textContent : (i.getAttribute('aria-label') || '')).trim();
        if (name) out.push({ cid: v, name, from: 'input' });
      });
      return out;
    });

    const seen = new Set();
    for (const f of found) {
      const k = f.cid + '|' + f.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push({ host, ...f });
    }
  } catch (e) {
    rows.push({ host, cid: '', name: '', from: 'ERROR: ' + e.message.slice(0, 70) });
  }
  await page.close();
  return rows;
}

(async () => {
  const browser = await launchBrowser();
  const all = [];
  for (const h of HOSTS) {
    const rows = await forHost(browser, h);
    console.log(`${h}: ${rows.filter(r => r.cid).length} calendars`);
    for (const r of rows.filter(x => x.cid).slice(0, 60)) console.log(`    ${String(r.cid).padEnd(8)} ${r.name.slice(0, 60)}`);
    const err = rows.find(r => /^ERROR/.test(r.from));
    if (err) console.log('    ' + err.from);
    all.push(...rows);
  }
  await browser.close();
  fs.writeFileSync(OUT, ['host\tcid\tname\tsource'].concat(all.map(r => [r.host, r.cid, r.name, r.from].join('\t'))).join('\n') + '\n', 'utf8');
  console.log(`\nwrote ${OUT}`);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
