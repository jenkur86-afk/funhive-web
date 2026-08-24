#!/usr/bin/env node
/**
 * Finds the real Assabet Interactive instance behind a library's own website.
 *
 *   node scripts/find-assabet-instances.js --in=candidates.json --out=found.json
 *   node scripts/find-assabet-instances.js --in=... --concurrency=4
 *
 * Input is detect-site-platform.js's shape: [{name,url,state,scraper}].
 *
 * WHY THIS EXISTS RATHER THAN A SLUG GUESS
 * ----------------------------------------
 * Assabet calendars live at https://<slug>.assabetinteractive.com/calendar/, and
 * the slug is NOT derivable from the library or town name — the configured set
 * already contains 'dovernh', 'derrypl', 'londonderrynh', 'wadleighlibrary' and
 * 'hampton', five different naming conventions across five libraries. Guessing
 * {city}.assabetinteractive.com would be the exact same defect as the guessed
 * {city}library.org that produced 355 cross-state collisions (CLAUDE.md, Defect A).
 *
 * So the slug is only ever READ from the library's own page — the site links to
 * its own calendar, and that link is the evidence. A library whose page names no
 * instance is reported as NOT FOUND and stays a gap; it is never guessed.
 *
 * Uses node:http/https rather than Chrome deliberately: this only needs the raw
 * HTML for a hostname match, and the plain fetch does not contend with a running
 * rotation's browsers.
 */
const fs = require('fs');
const http = require('http');
const https = require('https');

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const IN = getArg('in');
const OUT = getArg('out');
const CONC = parseInt(getArg('concurrency', '4'), 10);
if (!IN) { console.error('Missing --in=<json>'); process.exit(1); }

const TIMEOUT = 25000;
// Match any Assabet instance hostname, capturing the slug.
const INSTANCE_RE = /\b([a-z0-9][a-z0-9-]*)\.assabetinteractive\.com/gi;

function fetchOnce(url, redirects = 0) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    let mod, u;
    try { u = new URL(url); mod = u.protocol === 'http:' ? http : https; }
    catch (e) { return finish({ ok: false, why: 'BAD_URL' }); }
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FunHive/1.0)' },
      rejectUnauthorized: false,
      timeout: TIMEOUT,
    }, res => {
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc && redirects < 4) {
        res.resume();
        let next;
        try { next = new URL(loc, url).href; } catch (e) { return finish({ ok: false, why: 'BAD_REDIRECT' }); }
        return finish(fetchOnce(next, redirects + 1));
      }
      let body = '';
      res.on('data', c => {
        body += c;
        if (body.length > 3_000_000) { req.destroy(); finish({ ok: true, status: res.statusCode, body }); }
      });
      res.on('end', () => finish({ ok: true, status: res.statusCode, body }));
    });
    req.on('timeout', () => { req.destroy(); finish({ ok: false, why: 'TIMEOUT' }); });
    req.on('error', e => finish({ ok: false, why: (e.code || 'ERROR') }));
  });
}

// A library's homepage often links the calendar only from a nav page, so try a
// few obvious paths before declaring the instance absent.
const PATHS = ['', '/calendar', '/events', '/calendar/', '/events/'];

async function resolveOne(site) {
  const tried = [];
  for (const p of PATHS) {
    const url = site.url.replace(/\/+$/, '') + p;
    const r = await fetchOnce(url);
    tried.push(`${p || '/'}:${r.ok ? r.status : r.why}`);
    if (!r.ok || !r.body) continue;
    const hits = new Map();
    let m;
    INSTANCE_RE.lastIndex = 0;
    while ((m = INSTANCE_RE.exec(r.body)) !== null) {
      const slug = m[1].toLowerCase();
      // 'www' and bare vendor references identify the vendor, not the library.
      if (slug === 'www' || slug === 'assabetinteractive') continue;
      hits.set(slug, (hits.get(slug) || 0) + 1);
    }
    if (hits.size) {
      const ranked = [...hits.entries()].sort((a, b) => b[1] - a[1]);
      return {
        ...site,
        found: true,
        slug: ranked[0][0],
        allSlugs: ranked.map(([s, n]) => `${s}(${n})`).join(', '),
        foundOn: url,
        eventsUrl: `https://${ranked[0][0]}.assabetinteractive.com/calendar/`,
        tried: tried.join(' '),
      };
    }
  }
  return { ...site, found: false, tried: tried.join(' ') };
}

async function main() {
  const sites = JSON.parse(fs.readFileSync(IN, 'utf8'));
  console.log(`resolving Assabet instances for ${sites.length} sites (concurrency ${CONC})…\n`);
  const out = [];
  let i = 0;
  async function worker() {
    while (i < sites.length) {
      const site = sites[i++];
      const r = await resolveOne(site);
      out.push(r);
      console.log(
        `  ${out.length}/${sites.length}  ${r.found ? 'FOUND    ' + r.slug.padEnd(22) : 'NOT FOUND'.padEnd(31)}` +
        `${(r.state || '--')} ${r.name}`
      );
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, sites.length) }, worker));

  const found = out.filter(r => r.found);
  console.log(`\nFOUND ${found.length}   NOT FOUND ${out.length - found.length}`);

  // A slug claimed by two different libraries is a collision, not coverage.
  const bySlug = new Map();
  found.forEach(r => {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug).push(r.name);
  });
  const dupes = [...bySlug.entries()].filter(([, v]) => v.length > 1);
  if (dupes.length) {
    console.log('\n⚠️  SLUG CLAIMED BY MORE THAN ONE LIBRARY — do not wire these blindly:');
    dupes.forEach(([s, v]) => console.log(`   ${s}: ${v.join(' | ')}`));
  }

  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(`\nwrote ${OUT}`); }
}

main().catch(e => { console.error(e); process.exit(1); });
