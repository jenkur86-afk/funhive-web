#!/usr/bin/env node
/**
 * resolve-collision-host-state.js — work out WHICH STATE a colliding host really serves.
 *
 * WHY A SECOND RESOLVER
 * ---------------------
 * verify-sites-puppeteer.js answers "can the scraper see events here?" and, as a side
 * effect, names a conflicting state when the page happens to carry an address-shaped
 * "ST 12345". Run with the sentinel expected state ZZ it resolved 53 of 140 colliding
 * hosts on 2026-08-22. The remaining 85 failed for two reasons that are both fixable,
 * and neither is "the host is unknowable":
 *
 *   1. ~56 rendered perfectly but the HOMEPAGE carried no address. Libraries put their
 *      address on a contact/about/hours/locations page, or in JSON-LD, or only as a
 *      phone number. Looking at one page and giving up under-reads the evidence.
 *   2. ~29 failed at the network layer — ERR_SSL_VERSION_OR_CIPHER_MISMATCH,
 *      ERR_CONNECTION_TIMED_OUT, ERR_CONNECTION_RESET — every one of them fetched as
 *      `https://www.<host>`. Plenty of these sites simply do not serve TLS on the www
 *      name. That is a property of the URL we chose, not of the site.
 *
 * So this script widens both axes: several URL variants, several pages per host, and
 * three independent state signals instead of one.
 *
 * SIGNALS, strongest first
 * ------------------------
 *   A. "ST 12345"           — a postal state + ZIP together. Near-unambiguous.
 *   B. phone area code      — NANP area codes are assigned per state. A few straddle a
 *                             border, and those are deliberately EXCLUDED from the map
 *                             rather than guessed at.
 *   C. "City, Full State"   — a spelled-out state name next to a comma.
 *
 * A signal only counts when it appears in address-like context. Bare state names in
 * running prose ("our Virginia Woolf reading group") are exactly how name-similarity
 * mistakes get made, and this file exists partly to avoid repeating them.
 *
 * OUTPUT IS EVIDENCE, NOT A DECISION. It prints, per host, every signal it found and
 * how many times. It only proposes a state when the signals AGREE and the winner clears
 * the runner-up by a margin. Anything else is reported as CONFLICTED or UNRESOLVED for a
 * human to look at — never silently resolved. Copy accepted lines into GROUND_TRUTH in
 * scripts/disable-collided-urls.js; nothing here writes to a config file.
 *
 * KNOWN LIMIT — read this before believing an UNREACHABLE
 * -------------------------------------------------------
 * On the 2026-08-23 run, 16 of the 18 UNREACHABLE hosts ended on
 * `net::ERR_BLOCKED_BY_CLIENT` against the `http://` variant. That is Chrome refusing to
 * issue the request locally — an extension, policy or interception rule in the launch
 * config — NOT evidence about the site. Those hosts had already timed out on both https
 * variants, so the honest verdict is inconclusive and they must NOT be marked DEAD.
 *
 * This is the same trap as the DNS sweep that reported 162/162 hosts dead in this
 * sandbox while `google.com` failed identically. When a whole class of probes fails the
 * same way, suspect the probe before the world.
 *
 * Usage:
 *   node scripts/resolve-collision-host-state.js --in=hosts.txt      # one host per line
 *   node scripts/resolve-collision-host-state.js --in=... --concurrency=2
 *   node scripts/resolve-collision-host-state.js --in=... --out=gt.txt
 */

const fs = require('fs');
const { launchBrowser } = require('../scrapers/helpers/puppeteer-config');

const args = process.argv.slice(2);
const arg = n => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : null; };
const IN = arg('in');
const OUT = arg('out');
const CONCURRENCY = parseInt(arg('concurrency') || '2', 10);
const NAV_TIMEOUT = 25000;

if (!IN) { console.error('Missing --in=<file with one host per line>'); process.exit(1); }

const STATE_NAMES = {
  alabama:'AL', alaska:'AK', arizona:'AZ', arkansas:'AR', california:'CA', colorado:'CO',
  connecticut:'CT', delaware:'DE', florida:'FL', georgia:'GA', hawaii:'HI', idaho:'ID',
  illinois:'IL', indiana:'IN', iowa:'IA', kansas:'KS', kentucky:'KY', louisiana:'LA',
  maine:'ME', maryland:'MD', massachusetts:'MA', michigan:'MI', minnesota:'MN',
  mississippi:'MS', missouri:'MO', montana:'MT', nebraska:'NE', nevada:'NV',
  'new hampshire':'NH', 'new jersey':'NJ', 'new mexico':'NM', 'new york':'NY',
  'north carolina':'NC', 'north dakota':'ND', ohio:'OH', oklahoma:'OK', oregon:'OR',
  pennsylvania:'PA', 'rhode island':'RI', 'south carolina':'SC', 'south dakota':'SD',
  tennessee:'TN', texas:'TX', utah:'UT', vermont:'VT', virginia:'VA', washington:'WA',
  'west virginia':'WV', wisconsin:'WI', wyoming:'WY',
};
const ST_SET = new Set(Object.values(STATE_NAMES));

// NANP area code -> state. Codes that serve more than one state are OMITTED on purpose:
// a signal that cannot pick one state is not evidence, and inventing a winner here would
// be the same guessing this whole exercise exists to undo.
const AREA_CODE = {
  205:'AL',251:'AL',256:'AL',334:'AL',659:'AL',938:'AL', 907:'AK',
  480:'AZ',520:'AZ',602:'AZ',623:'AZ',928:'AZ', 479:'AR',501:'AR',870:'AR',
  209:'CA',213:'CA',279:'CA',310:'CA',323:'CA',341:'CA',408:'CA',415:'CA',424:'CA',442:'CA',
  510:'CA',530:'CA',559:'CA',562:'CA',619:'CA',626:'CA',628:'CA',650:'CA',657:'CA',661:'CA',
  669:'CA',707:'CA',714:'CA',747:'CA',760:'CA',805:'CA',818:'CA',820:'CA',831:'CA',858:'CA',
  909:'CA',916:'CA',925:'CA',949:'CA',951:'CA',
  303:'CO',719:'CO',720:'CO',970:'CO', 203:'CT',475:'CT',860:'CT',959:'CT', 302:'DE',
  239:'FL',305:'FL',321:'FL',352:'FL',386:'FL',407:'FL',561:'FL',727:'FL',754:'FL',772:'FL',
  786:'FL',813:'FL',850:'FL',863:'FL',904:'FL',941:'FL',954:'FL',
  229:'GA',404:'GA',470:'GA',478:'GA',678:'GA',706:'GA',762:'GA',770:'GA',912:'GA',943:'GA',
  808:'HI', 208:'ID',986:'ID',
  217:'IL',224:'IL',309:'IL',312:'IL',331:'IL',447:'IL',464:'IL',618:'IL',630:'IL',708:'IL',
  773:'IL',779:'IL',815:'IL',847:'IL',872:'IL',
  219:'IN',260:'IN',317:'IN',463:'IN',574:'IN',765:'IN',812:'IN',930:'IN',
  319:'IA',515:'IA',563:'IA',641:'IA',712:'IA', 316:'KS',620:'KS',785:'KS',913:'KS',
  270:'KY',364:'KY',502:'KY',606:'KY',859:'KY',
  225:'LA',318:'LA',337:'LA',504:'LA',985:'LA', 207:'ME',
  240:'MD',301:'MD',410:'MD',443:'MD',667:'MD',
  339:'MA',351:'MA',413:'MA',508:'MA',617:'MA',774:'MA',781:'MA',857:'MA',978:'MA',
  231:'MI',248:'MI',269:'MI',313:'MI',517:'MI',586:'MI',616:'MI',679:'MI',734:'MI',810:'MI',
  906:'MI',947:'MI',989:'MI',
  218:'MN',320:'MN',507:'MN',612:'MN',651:'MN',763:'MN',952:'MN',
  228:'MS',601:'MS',662:'MS',769:'MS',
  314:'MO',417:'MO',557:'MO',573:'MO',636:'MO',660:'MO',816:'MO', 406:'MT',
  308:'NE',402:'NE',531:'NE', 702:'NV',725:'NV',775:'NV', 603:'NH',
  201:'NJ',551:'NJ',609:'NJ',640:'NJ',732:'NJ',848:'NJ',856:'NJ',862:'NJ',908:'NJ',973:'NJ',
  505:'NM',575:'NM',
  212:'NY',315:'NY',332:'NY',347:'NY',363:'NY',516:'NY',518:'NY',585:'NY',607:'NY',631:'NY',
  646:'NY',680:'NY',716:'NY',718:'NY',838:'NY',845:'NY',914:'NY',917:'NY',929:'NY',934:'NY',
  252:'NC',336:'NC',704:'NC',743:'NC',828:'NC',910:'NC',919:'NC',980:'NC',984:'NC', 701:'ND',
  216:'OH',220:'OH',234:'OH',326:'OH',330:'OH',380:'OH',419:'OH',440:'OH',513:'OH',567:'OH',
  614:'OH',740:'OH',937:'OH',
  405:'OK',539:'OK',572:'OK',580:'OK',918:'OK', 458:'OR',503:'OR',541:'OR',971:'OR',
  215:'PA',223:'PA',267:'PA',272:'PA',412:'PA',445:'PA',484:'PA',570:'PA',582:'PA',610:'PA',
  717:'PA',724:'PA',814:'PA',835:'PA',878:'PA',
  401:'RI', 803:'SC',839:'SC',843:'SC',854:'SC',864:'SC', 605:'SD',
  423:'TN',615:'TN',629:'TN',731:'TN',865:'TN',901:'TN',931:'TN',
  210:'TX',214:'TX',254:'TX',281:'TX',325:'TX',346:'TX',361:'TX',409:'TX',430:'TX',432:'TX',
  469:'TX',512:'TX',682:'TX',713:'TX',726:'TX',737:'TX',806:'TX',817:'TX',830:'TX',832:'TX',
  903:'TX',915:'TX',936:'TX',940:'TX',945:'TX',956:'TX',972:'TX',979:'TX',
  385:'UT',435:'UT',801:'UT', 802:'VT',
  276:'VA',434:'VA',540:'VA',571:'VA',703:'VA',757:'VA',804:'VA',826:'VA',948:'VA',
  206:'WA',253:'WA',360:'WA',425:'WA',509:'WA',564:'WA', 304:'WV',681:'WV',
  262:'WI',274:'WI',414:'WI',534:'WI',608:'WI',715:'WI',920:'WI', 307:'WY',
};

const PATHS = ['', '/contact', '/contact-us', '/about', '/about-us', '/hours', '/hours-and-locations', '/locations', '/visit'];

function extractSignals(text, html) {
  const sig = { zip: {}, area: {}, name: {} };
  const bump = (b, s) => { if (s && ST_SET.has(s)) b[s] = (b[s] || 0) + 1; };

  // A. "ST 12345" — postal abbreviation immediately followed by a 5-digit ZIP.
  for (const m of text.matchAll(/\b([A-Z]{2})[\s,]+(\d{5})(?:-\d{4})?\b/g)) bump(sig.zip, m[1]);

  // B. phone area codes, in phone-shaped context only.
  for (const m of text.matchAll(/(?:\(\s*(\d{3})\s*\)|\b(\d{3}))[\s.\-]\s*\d{3}[\s.\-]\d{4}\b/g)) {
    const code = parseInt(m[1] || m[2], 10);
    bump(sig.area, AREA_CODE[code]);
  }
  // tel: links are the cleanest form of the same signal.
  for (const m of html.matchAll(/tel:\+?1?[^0-9]{0,3}(\d{3})/gi)) bump(sig.area, AREA_CODE[parseInt(m[1], 10)]);

  // C. "City, Full State" — spelled-out name preceded by a comma, i.e. address context.
  //    Requiring the comma is what keeps "our Virginia Woolf group" out of the count.
  for (const [name, abbr] of Object.entries(STATE_NAMES)) {
    const re = new RegExp(`,\\s*${name}\\b`, 'gi');
    const hits = (text.match(re) || []).length;
    if (hits) sig.name[abbr] = (sig.name[abbr] || 0) + hits;
  }
  return sig;
}

function decide(sig) {
  // Weight by how decisive each signal class is. ZIP-anchored beats area code beats a
  // spelled-out name, because that is the order in which they can be faked by prose.
  const score = {};
  const add = (b, w) => { for (const [s, n] of Object.entries(b)) score[s] = (score[s] || 0) + n * w; };
  add(sig.zip, 5); add(sig.area, 3); add(sig.name, 1);
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { verdict: 'UNRESOLVED', state: null, score };
  const [top, second] = ranked;
  // Require a clear win: at least 3 points and double the runner-up. A near-tie means the
  // page genuinely mentions two states (branch lists, consortium sites) and a human
  // should look rather than a script picking.
  if (top[1] >= 3 && (!second || top[1] >= second[1] * 2)) return { verdict: 'RESOLVED', state: top[0], score };
  return { verdict: 'CONFLICTED', state: null, score };
}

async function probe(browser, host) {
  const variants = [`https://${host}`, `https://www.${host}`, `http://${host}`];
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  const merged = { zip: {}, area: {}, name: {} };
  let reached = null, lastErr = '';
  const mergeIn = s => { for (const k of ['zip', 'area', 'name']) for (const [st, n] of Object.entries(s[k])) merged[k][st] = (merged[k][st] || 0) + n; };

  try {
    for (const base of variants) {
      try {
        const r = await page.goto(base, { waitUntil: 'domcontentloaded' });
        if (r && r.status() < 400) { reached = base; break; }
        lastErr = r ? `HTTP ${r.status()}` : 'no response';
      } catch (e) { lastErr = String(e.message || e).slice(0, 60); }
    }
    if (!reached) { await page.close(); return { host, verdict: 'UNREACHABLE', note: lastErr }; }

    for (const p of PATHS) {
      try {
        if (p) {
          const r = await page.goto(reached + p, { waitUntil: 'domcontentloaded' });
          if (!r || r.status() >= 400) continue;
        }
        const { text, html } = await page.evaluate(() => ({
          text: (document.body && document.body.innerText || '').slice(0, 40000),
          html: document.documentElement.outerHTML.slice(0, 120000),
        }));
        mergeIn(extractSignals(text, html));
      } catch { /* a missing contact path is normal, not an error */ }
      // Stop early once the evidence is already decisive — most sites resolve on page 1.
      if (decide(merged).verdict === 'RESOLVED') break;
    }
  } finally { try { await page.close(); } catch {} }

  const d = decide(merged);
  return { host, ...d, reached, signals: merged };
}

async function main() {
  const hosts = fs.readFileSync(IN, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  console.log(`resolving ${hosts.length} hosts (concurrency ${CONCURRENCY})…`);
  const browser = await launchBrowser();
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < hosts.length) {
      const h = hosts[i++];
      const r = await probe(browser, h).catch(e => ({ host: h, verdict: 'ERROR', note: String(e.message || e).slice(0, 70) }));
      results.push(r);
      const fmt = r.state ? r.state : (r.note || r.verdict);
      console.log(`  ${results.length}/${hosts.length}  ${String(r.verdict).padEnd(12)} ${r.host.padEnd(32)} ${fmt}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  try { await browser.close(); } catch {}

  const by = {};
  for (const r of results) by[r.verdict] = (by[r.verdict] || 0) + 1;
  console.log('\n' + Object.entries(by).map(([k, v]) => `${k} ${v}`).join('   '));

  const resolved = results.filter(r => r.verdict === 'RESOLVED');
  if (OUT) {
    const lines = resolved.map(r => {
      const ev = ['zip', 'area', 'name'].map(k => `${k}=${JSON.stringify(r.signals[k])}`).join(' ');
      return `  '${r.host}':${' '.repeat(Math.max(1, 26 - r.host.length))}{ state: '${r.state}', evidence: 'resolve-collision-host-state.js 2026-08-23 via ${r.reached}; ${ev.replace(/'/g, '')}' },`;
    });
    fs.writeFileSync(OUT, lines.join('\n') + '\n');
    console.log(`wrote ${lines.length} GROUND_TRUTH lines to ${OUT}`);
  }
  console.log('\nCONFLICTED / UNRESOLVED need a human — they are NOT safe to disable:');
  results.filter(r => r.verdict === 'CONFLICTED' || r.verdict === 'UNRESOLVED')
    .forEach(r => console.log(`  ${r.host.padEnd(32)} ${JSON.stringify(r.score || {})}`));
}

main().catch(e => { console.error(e); process.exit(1); });
