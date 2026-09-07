#!/usr/bin/env node
/**
 * probe-dead-endpoint-paths.js — for entries recorded as "HTTP 404 on the
 * configured URL", find out whether the HOST is dead or only the PATH is wrong.
 *
 * WHY: those two need opposite responses and the verdict text cannot tell them
 * apart. A 404 on /events says nothing about the site — Seekonk PL's LibCal root
 * returns 200 for the right library while every calendar path 404s, and Florence
 * County's /events 301s to a month grid. Treating a bare 404 as a dead domain
 * guards a library that is merely misconfigured, which converts a fixable URL
 * into a permanent gap.
 *
 * For each entry this loads the host root plus the usual calendar paths and
 * reports, per path, the HTTP status and whether the page carries dated events.
 * Output is a worklist:
 *   PATH-FOUND   a path returns 200 WITH dated events -> fix the URL, real recovery
 *   HOST-ALIVE   root answers but no path shows events -> needs a human look
 *   HOST-DEAD    nothing answers -> safe to guard
 *
 * It edits no config. Keep --concurrency low; Chrome is heavy.
 *
 *   node scripts/probe-dead-endpoint-paths.js --in=sites.txt --out=paths.tsv
 *
 * --in lines are `Site | Scraper | URL | STATE` (verify-sites-puppeteer format).
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, createStealthPage } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'puppeteer-config'));

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const IN = arg('in'), OUT = arg('out'), CONC = Math.max(1, parseInt(arg('concurrency', '2'), 10));
if (!IN || !OUT) { console.error('Usage: --in=sites.txt --out=paths.tsv'); process.exit(1); }

const PATHS = ['', '/events', '/events/', '/calendar', '/calendar/', '/events/upcoming', '/whats-on', '/programs'];

const rows = fs.readFileSync(IN, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  .map(l => { const p = l.split('|').map(s => s.trim()); return { site: p[0], scraper: p[1], url: p[2], state: p[3] || '' }; })
  .filter(r => r.url && r.url !== 'NO-URL');

function origin(u) { try { return new URL(u).origin; } catch { return null; } }

async function probe(browser, r) {
  const base = origin(r.url);
  if (!base) return { ...r, verdict: 'NO-URL', best: '', detail: 'unparseable url' };
  let rootOk = false, best = null;

  for (const p of PATHS) {
    const page = await createStealthPage(browser);
    try {
      const resp = await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const status = resp ? resp.status() : 0;
      if (status >= 200 && status < 400) {
        rootOk = true;
        await new Promise(s => setTimeout(s, 1200));
        const info = await page.evaluate(() => {
          const t = document.body ? document.body.innerText : '';
          return {
            dates: (t.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/g) || []).length,
            items: document.querySelectorAll('[class*="event"], [class*="tribe"], article, .lc-event, .s-lc-ea-e').length,
            title: (document.title || '').slice(0, 60)
          };
        });
        if (info.dates >= 3 && info.items >= 3 && (!best || info.items > best.items)) {
          best = { path: p || '/', ...info, status };
        }
      }
    } catch { /* try next path */ }
    await page.close();
    if (best) break;   // first path with real events is good enough
  }

  if (best) return { ...r, verdict: 'PATH-FOUND', best: base + best.path, detail: `HTTP ${best.status} dates=${best.dates} items=${best.items} "${best.title}"` };
  if (rootOk) return { ...r, verdict: 'HOST-ALIVE', best: base, detail: 'host answers but no probed path showed dated events' };
  return { ...r, verdict: 'HOST-DEAD', best: '', detail: 'no probed path answered' };
}

(async () => {
  const browser = await launchBrowser();
  const out = [];
  let i = 0;
  async function worker() {
    while (i < rows.length) {
      const r = rows[i++]; const n = i;
      const res = await probe(browser, r);
      out.push(res);
      console.log(`  ${n}/${rows.length}  ${res.verdict.padEnd(11)} ${res.site.slice(0, 38).padEnd(40)} ${res.best || ''}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  await browser.close();

  fs.writeFileSync(OUT, ['site\tscraper\tstate\tverdict\tworking_url\tdetail']
    .concat(out.map(r => [r.site, r.scraper, r.state, r.verdict, r.best, r.detail].join('\t'))).join('\n') + '\n', 'utf8');
  const by = {}; out.forEach(r => { by[r.verdict] = (by[r.verdict] || 0) + 1; });
  console.log('\n' + Object.entries(by).map(([k, v]) => `${k} ${v}`).join('  '));
  console.log(`wrote ${OUT}`);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
