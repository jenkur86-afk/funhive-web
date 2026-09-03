# UNVERIFIABLE backlog — triage worklist

**Built 2026-09-02** (SITE-IMPROVEMENT-REVIEW §2.1). Regenerate the counts any time from
`reports/verification-comments.json`; this file is the *plan*, not a data store.

Purpose: turn gate 4's single number into per-class detail with a decision rule for each,
the same way `list-url-collisions.js` did for gate 2. Nobody had grouped this backlog
before, and the composition turned out to be very different from what §2.1 assumed.

---

## Composition — measured, and it corrects the review

§2.1 planned around "network errors 149, JS-gated shells 71, platform-mismatch 55, Google
Calendar iframes 20, dead endpoints 18". Measured against the live store:

| Bucket | Count | Share | Status |
|---|---|---|---|
| **JS-gated / renders nothing** | **491** | **58%** | **Out of §2.1 scope** — MASTER-PLAN Phase 10 |
| Network errors (reset/closed/timed-out/refused) | 153 | 18% | Slice 1 — needs Puppeteer |
| Platform mismatch / iframe relocate | 50 | 6% | Slice 2/3 |
| **Redirect / moved** | **48** | **6%** | **New slice — §2.1 had none** |
| bot-block (403/429/captcha) | 30 | 4% | needs Puppeteer |
| TLS / cert failure | 8 | 1% | needs Puppeteer (`--ignore-certificate-errors`) |
| Dead endpoint (404/parked) | 6 | <1% | Slice 4 |
| Uncategorized | 63 | 7% | mostly "renders nothing" phrasings |

**Two corrections that change the plan.** The renders-nothing slice is **491, not 71** — it
is 58% of the entire backlog, so the "mechanical slices" §2.1 describes can clear at most
~40% of gate 4 even if every one succeeds. And the **redirect class did not exist in the
plan at all**; it is larger than the dead-endpoint and TLS slices combined.

---

## The redirect class (48) — three sub-classes, different fixes

Grouping by redirect DESTINATION is what makes this tractable: one squatter domain
accounts for 11 libraries at once.

### A. Squatter / parked / commercial — the domain is gone
| Destination | Libraries | Note |
|---|---|---|
| `dot-book.org` | **11** | biggest single cluster; returns HTTP 403 to plain fetches |
| `running-care.com` | 2 | |
| `forsale.godaddy.com` | 2 | literally a "domain for sale" page |
| `agentaruhanjuditogel.com` | 1 | online gambling site |
| `wherewindsmeetgame.com` | 1 | video-game marketing |
| `fresupdate.com` | 1 | |
| `chromewebdata` | 1 | browser error artifact, not a real destination |

### B. Wrong state — a same-named town elsewhere
The classic guessed-`{city}library.org` failure (Defect A). `newportoregon.gov` (NC→OR),
`richmondca.gov` (VT→CA), `mansfieldtexas.gov` (CT→TX), `beaumonttexas.gov` (MS→TX),
`harlan.lib.ia.us` (KY→IA), `wordpress2.nekls.org` (NJ→KS), `leicesterma.org` (NC→MA).

> `leicesterma.org` is claimed by **two** entries — WordPress-NC *and* WordPress-MA. The MA
> one is plausibly correct and must NOT be touched; only the NC claim is wrong. Any
> automated pass over this class has to compare the destination's state against the
> scraper's own, or it will disable the right library along with the wrong one.

### C. Legitimate relocation — fix the URL, recover the library
Real library or right-state town sites: `stowefreelibrary.org` (confirmed live 2026-09-02
as the real Stowe Free Library, VT), `medfieldpubliclibrary.org`, `seekonkpl.org`,
`eipl.org`, `bhpl.net`, `jeffersonhillspubliclibrary.org`, `llcoop.org`, plus town .gov
hosts in the right state (`dover.nh.gov`, `londonderrynh.gov`, `francestownnh.org`,
`rocklandmaine.gov`, `westbrookmaine.gov`, `penfieldny.gov`, `newbedford-ma.gov`,
`tavaresfl.gov`, `pwcva.gov`) and `brockwaylibrary.follettdestiny.com`.
**These are recoverable coverage, not gaps** — each needs its events path found and the
config URL repointed. `accounts.google.com` ×2 is an auth wall, not a relocation.

---

## Done 2026-09-02

**14 conclusive rows promoted UNVERIFIABLE → MISMATCH** (dead-domain bucket) via
`merge-verification-comments.js`; store validated, gate 4 moved **849 → 831**. No config
was touched — this only corrects a verdict from *unknown* to *known-broken* using evidence
the Puppeteer verifier had already gathered. Inclusion was narrow on purpose: only
destinations that **cannot** be the configured library (commercial squatters, or a
government site for a different state). The same-state guard correctly spared
`WordPress-MA | Leicester Public Library`.

## Deferred, and why

Everything requiring the **Puppeteer verifier** — Slice 1 (153 network), bot-block (30),
TLS (8), and confirming the `dot-book.org` cluster — is deferred. `FunHive-Macaroni` held
the runner lock and was running Chrome throughout 2026-09-02, and §2.1's own instruction is
never to add Chrome load while a rotation or MacaroniKid task is running.

`dot-book.org` returning 403 to a plain fetch is **not** grounds to disable its 11
libraries: CLAUDE.md is explicit that an unresolved host is unknown, not safe. The stealth
browser is the tool that can see past a 403 — run it when Chrome is free.

## Next actions, in order

1. When Chrome is idle: verify `dot-book.org` and promote/guard its 11 libraries as one batch.
2. Slice 1 — re-run the 153 network errors through `verify-sites-puppeteer.js --concurrency=3`.
3. Class C — repoint the ~18 legitimate relocations; each recovers a real library.
4. Re-examine whether the 491 renders-nothing rows are truly Phase 10 work, given they are
   58% of gate 4 and the current plan leaves them untouched indefinitely.

---

## Session 2026-09-03 — the redirect slice, worked

The Class C "legitimate relocation" group turned out to be mostly **platform
migrations**, not stale URLs: the library moved its calendar onto LibCal or
LibraryCalendar and its WordPress entry was never updated. That reframes the
slice — most of these are Slice 2 (relocations) wearing a redirect's clothes.

### Resolved

| Library | Was | Now | Kind |
|---|---|---|---|
| Jefferson Hills Public Library (PA) | WordPress-PA → `jeffersonhillslibrary.org` | `jeffersonhills.librarycalendar.com/events/upcoming` | relocation — **proven live**, 15 events × 9 pages, "Baby & Me Storytime" |
| Blue Hill Public Library (ME) | WordPress-ME → `bluehilllibrary.org` | `bhpl.libcal.com/calendar/events/` (LibCal-ME) | relocation — identity proven from the LibCal page title; events unprovable by plain fetch (JS grid) |
| Medfield Memorial Library (MA) | WordPress-MA → `medfieldlibrary.org` | `medfieldpubliclibrary.org/events/` | **URL fix** — own-domain calendar, stays WordPress-MA |

All three old entries are **left enabled** until a real run stores rows
(Worcester rule). `LibraryCalendar-Libraries` sites 32 → 33.

### New finding — WhoFi is a blocking platform, not a one-off

**Seekonk Public Library (MA)** publishes on `seekonk-ma.whofi.com/calendar`.
That is the *second* confirmed WhoFi library — `scraper-libcal-libraries-*.js`
already carries a `urlCollision` note for North Kingstown RI reading "the library
publishes on northkingstown-ri.whofi.com, a platform no scraper here supports.
OPEN GAP needing a WhoFi extractor". Two known instances makes a WhoFi extractor
worth scoping: it would unlock both at once, and the redirect slice likely hides
more. Not attempted here.

### Still open in this slice

- **East Islip (NY)** and the `dot-book.org` cluster (11 libraries): both return
  HTTP 403 to plain fetches. Not grounds to act — the stealth browser is the tool
  that sees past a 403.
- **Penfield (NY)**: the town site hosts library *news* but exposes no library
  calendar URL; needs a deeper look than one fetch.
- ~13 further Class C candidates unexamined (town .gov hosts, Follett Destiny,
  `carnegieofhomestead.com`, `newcastlede.gov`).

### Still gated on Chrome

Slice 1 (153 network errors), bot-block (30) and TLS (8) all need
`verify-sites-puppeteer.js`. A rotation was mid-run for this entire session, and
§2.1's own rule is not to add Chrome load while one is running.
