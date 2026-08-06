# Scraper Naming — Documentation and Migration Plan

Created 2026-08-05. Companion to `SCRAPER-BUG-FIX-PLAN.md`.

Canonical rules live in **`CLAUDE.md` → "Scraper Naming"**. This file is the migration plan
for bringing existing data into line, plus the record of why the rules exist.

---

## Why this exists

`scraper_name` is the only join between a database row and the registry entry that produced
it. `source_url` is the only field recording *where* an event came from rather than what it
was called. Three systems depend on them:

1. `AGE-RANGE-AUDIT.md` and `LIBRARY-SITE-AUDIT.md` group by `scraper_name`.
2. `scrapers/logs/scraper-summary.log` reports registry keys, so a mismatched `scraper_name`
   cannot be reconciled with its own run.
3. `scripts/verify-coverage.js` establishes identity from the `source_url` host.

Drift is silent. Nothing errors; rows simply stop being attributable. The age audit already
had to work around it with `created_at` time-window archaeology.

## Measured state (2026-08-05)

`node scripts/check-scraper-names.js` over 56,966 rows since 2026-08-01:

| Class | Names | Rows | Meaning |
|---|---|---|---|
| EXACT | 20 | 7,431 | identical to a registry key — correct for single-site scrapers |
| PREFIXED | 123 | 1,865 | `<registryKey>-<siteSlug>` — correct for multi-site scrapers |
| CASE_MISMATCH | 25 | 8,337 | e.g. `wordpress-NY` vs `WordPress-NY` |
| FORMAT_DRIFT | 85 | 24,883 | e.g. `RecDeskParks-ccrec` vs `RecDesk-Parks-ccrec` |
| FREE_TEXT | 173 | 13,044 | display names, e.g. `BCCLS - Bergen County Cooperative Library System` |
| UNRELATED | 7 | 1,401 | no registry key matches |
| BAD_SLUG | 1 | 5 | slug not lowercase `[a-z0-9-]` |

**143 of 434 names (33%) conform.**

---

## Documentation changes — DONE 2026-08-05

- [x] `CLAUDE.md` → new **"Scraper Naming"** section: the two legal forms, five no-exception
      rules, the `source_url`-is-the-listing-page rule with correct/wrong code, and a
      **new-scraper checklist**.
- [x] `SKILL.md` (daily diagnosis) → new **Step 3f** running the conformance check, with
      explicit instructions not to start a mass rename from a nightly run.
- [x] `scripts/check-scraper-names.js` → classifies every name, suggests a slug-preserving
      fix, and flags multi-site scrapers that have COLLAPSED onto one name.

## Future steps — migration, not yet started

Ordered by value per unit of risk. Each step is independently shippable.

### Step 1 — Stop the bleeding (new scrapers only)
No migration. Every *new* scraper follows the checklist. The conformance check runs nightly
so new drift is caught within a day of appearing. **Do this before any backfill** — migrating
while new drift is still being introduced never converges.

### Step 2 — CASE_MISMATCH (25 names, 8,337 rows)
Mechanical and unambiguous: `wordpress-XX` → `WordPress-XX`. The fix is a one-line change in
each `scraper-wordpress-libraries-*.js` where `scraperName` is set. Lowest risk in the plan.

### Step 3 — FORMAT_DRIFT (85 names, 24,883 rows)
Mostly `RecDeskParks-*` → `RecDesk-Parks-*` and `OrangeCountyLibrary-FL` →
`Orange-County-Library-FL`. **The site slug must survive the rename.** Verify with the
checker that each scraper's distinct-name count still equals its declared `sites`.

### Step 4 — FREE_TEXT (173 names, 13,044 rows)
The hard one. These are library display names written by LibCal/Communico/BiblioCommons
shared files, which set `scraperName` per library rather than per registry entry. Requires
deciding the slug for each library, then a shared-file change. Do last.

### Step 5 — Backfill or let it age out
Renaming changes only what *new* rows carry. Old rows keep the old name and both appear in
the audits until the old rows expire.

- **Let it age out** — free, self-correcting, but the audits show duplicates meanwhile.
- **Backfill** — a `--save` script mapping old name to new. Straightforward, but a full-table
  UPDATE; follow the `.order()`-before-`.range()` rule (the 2026-05-15 incident lost ~17,000
  events to an unordered paginator).

Recommendation: age out for CASE_MISMATCH and FORMAT_DRIFT, backfill only if an audit cycle
proves confusing in practice.

---

## Rules that came from real mistakes

Each of these was a live error on 2026-08-05, not a hypothetical:

- **Never collapse a multi-site scraper onto its bare registry key.** Setting
  `scraperName: 'MacaroniKid-FL'` merged 31 sites onto one name; fleet-wide it would have
  merged 228 sites onto 20 names, re-creating the aggregation the owner rejected on
  2026-08-04. Corrected to `MacaroniKid-FL-<subdomain>`, matching the convention
  `CivicRec-Parks-Eastern` and `RecDesk-Parks` already use.
- **Never set `source_url` to the event's own `url`.** `scraper-macaroni-md.js` did, and its
  stored `source_url` was byte-identical to `url` on every row — which would have given every
  MacaroniKid site in every state the host `events.yodel.today`.
- **A suggested rename must preserve the slug.** The first version of
  `check-scraper-names.js` proposed `RecDeskParks-ccrec` → `RecDesk-Parks`, silently dropping
  the site. The tool built to prevent the mistake reproduced it.
- **Renaming cannot create duplicates.** `_stableEventId` uses the URL hash, then
  `name|eventDate|venue`; `scraper_name` is not part of it.

## Commands

```bash
node scripts/check-scraper-names.js              # conformance report
node scripts/check-scraper-names.js --strict     # exit 1 on any drift (CI-style)
node scripts/check-source-url-coverage.js --all  # which scrapers pass a listing URL
node scripts/verify-coverage.js --state=NC --exclude-scraper=wordpress-NC --summary
```
