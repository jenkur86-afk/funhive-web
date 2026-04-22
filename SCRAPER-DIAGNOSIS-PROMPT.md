# FunHive Scraper Diagnosis Prompt

Copy everything below the line and paste it into a new conversation after running scrapers. Paste the full scraper output after the prompt.

---

## Instructions

I just ran FunHive scrapers. Analyze the full output I'm pasting below and fix ALL issues. Do not ask me questions — just fix everything you can.

### What to look for and fix

**1. Zero-event scrapers (Found 0 URLs / 0 new / 0 updated)**
- Check if the scraper URL is correct by visiting the live site
- Check if the site changed platforms (e.g., Communico vs LibraryCalendar vs LibNet)
- Check if the scraper is already covered by a different scraper (remove duplicates)
- Check page rendering issues (domcontentloaded vs networkidle2 for SPAs)
- Check if CSS selectors still match the live site structure
- Check if the site now blocks scrapers (User-Agent, rate limiting, CAPTCHAs)

**2. Skipped events due to invalid dates**
- Check `date-normalization-helper.js` — does it handle the date format being skipped?
- Common formats to watch for: "Month Day @ Time", timezone abbreviations (EST/PST), localized day abbreviations (Sá., Lu.), periods in month abbreviations (Apr.), date ranges with dashes
- Add new normalization rules if needed, and verify all existing date tests still pass

**3. Database errors**
- `23505` duplicate key / unique constraint (`idx_events_unique_content`): Ensure row-by-row fallback with `ignoreDuplicates: true` exists in `supabase-adapter.js`
- Foreign key constraint (`activity_id_fkey`): Ensure retry-without-activity_id pattern exists in the scraper
- Index row size overflow (> 2704 bytes): Ensure field truncation exists in both `saveEvent()` and `flattenEvent()` in `supabase-adapter.js`

**4. Navigation/junk elements extracted as events**
- Look for event names that are clearly menu items, headers, or footer links
- Add filtering patterns to the scraper's extraction function (like the NAV_JUNK_PATTERNS filter)

**5. Geocoding failures**
- 429 rate limiting: Check delay between requests (should be ≥2.5s for Nominatim)
- Excessive "no coords" counts: Check geocoding fallback chain (address → venue → city → county centroid)
- Check User-Agent string is descriptive (not generic)

**6. Fatal errors / crashes**
- Missing npm modules: Add to `scraperDependencies` in `package.json` and note what I need to `npm install`
- Protocol/connection errors: Check browser restart logic in the scraper's main loop
- Timeout errors: Consider increasing timeout or switching to `networkidle2`

**7. Data quality issues**
- Events with no description, no venue, no age range
- Promotional/newsletter events that slipped through filters
- Events with "See website" as venue when a real venue exists on the page

### How to fix

- Read the relevant scraper file(s) and helper files before making changes
- Apply fixes directly — edit the code
- When fixing MacaroniKid scrapers, remember all 45 files share the same structure. Use a script to apply changes to all of them if the fix applies broadly
- Run `node -c filename.js` syntax check on every modified file
- For date normalization changes, verify against the test cases in the date helper
- Summarize what you fixed and what I need to do (e.g., `npm install`, re-run a specific scraper)

### Scraper output

(paste full output below)
