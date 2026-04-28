#!/usr/bin/env python3
"""
Bulk-expand WordPress library scraper files to cover ALL libraries from the spreadsheet.
For each active state with an existing scraper file, adds any uncovered libraries.
For active states without a scraper file (GA, IL, MA, NC, NJ, SC), creates a new file from template.
Skips DC and RI (no WordPress scraper, other coverage).
"""

import pandas as pd
import re
import os
import json

PROJ = '/sessions/amazing-inspiring-pasteur/mnt/funhive-web'
SPREADSHEET = '/sessions/amazing-inspiring-pasteur/mnt/uploads/US_Public_Libraries.xlsx'

# Active states to process
ACTIVE_STATES = ['AL', 'CT', 'FL', 'GA', 'IA', 'IL', 'IN', 'KY', 'MA', 'MD', 'ME', 'MN', 'MS', 'NC', 'NH', 'NJ', 'NY', 'OH', 'PA', 'SC', 'TN', 'VA', 'VT', 'WI', 'WV']
# Skip DC, DE, RI - they have other coverage or no WordPress file needed

STATE_FULL_TO_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
}

STATE_ABBR_TO_FULL = {v: k for k, v in STATE_FULL_TO_ABBR.items()}

def generate_slug(city):
    """Generate URL slug from city name."""
    slug = re.sub(r'[^a-z]', '', city.lower())
    return slug

def generate_url(city):
    """Generate library URL from city name."""
    slug = generate_slug(city)
    return f'https://www.{slug}library.org'

def generate_events_url(city):
    """Generate events URL from city name."""
    return generate_url(city) + '/events'

def format_zip(z):
    """Format zip code, handling NaN and float."""
    if pd.isna(z):
        return '00000'
    z = str(z).strip()
    # Remove .0 from float conversion
    if '.' in z:
        z = z.split('.')[0]
    # Pad to 5 digits
    z = z.zfill(5)
    return z

def format_entry(name, url, events_url, city, state, zip_code, county):
    """Format a single library entry as JS object literal."""
    # Escape single quotes in names
    name = name.replace("'", "\\'")
    city_clean = city.replace("'", "\\'")
    county_clean = county.replace("'", "\\'")
    return f"  {{ name: '{name}', url: '{url}', eventsUrl: '{events_url}', city: '{city_clean}', state: '{state}', zipCode: '{zip_code}', county: '{county_clean}'}}"

def extract_existing_cities(filepath):
    """Extract city names from existing scraper file."""
    cities = set()
    with open(filepath, 'r') as f:
        content = f.read()
    # Find all city values in the LIBRARIES array
    for match in re.finditer(r"city:\s*'([^']+)'", content):
        cities.add(match.group(1).lower().strip())
    return cities

def extract_existing_names(filepath):
    """Extract library names from existing scraper file."""
    names = set()
    with open(filepath, 'r') as f:
        content = f.read()
    for match in re.finditer(r"name:\s*'([^']*(?:\\'[^']*)*)'", content):
        names.add(match.group(1).lower().strip().replace("\\'", "'"))
    return names

def insert_entries_into_file(filepath, new_entries):
    """Insert new library entries into existing scraper file, before the closing ];"""
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the end of the LIBRARIES array: ];
    # We need to find the ]; that closes the LIBRARIES array
    # Strategy: find 'const LIBRARIES = [' then find the matching '];'
    lib_start = content.find('const LIBRARIES = [')
    if lib_start == -1:
        print(f"  ERROR: Could not find LIBRARIES array in {filepath}")
        return False

    # Find the closing ]; after the start
    # We need to be careful about nested brackets, but library entries don't have nested arrays
    bracket_end = content.find('\n];', lib_start)
    if bracket_end == -1:
        # Try without newline
        bracket_end = content.find('];', lib_start)
        if bracket_end == -1:
            print(f"  ERROR: Could not find closing ]; for LIBRARIES in {filepath}")
            return False

    # The last entry before ]; - check if it ends with comma or not
    before_close = content[:bracket_end].rstrip()
    needs_comma = not before_close.endswith(',')

    # Build the new entries string
    entries_str = ''
    if needs_comma:
        entries_str += ','
    entries_str += '\n  // Additional libraries from spreadsheet coverage expansion\n'
    entries_str += ',\n'.join(new_entries)

    # Insert before the ];
    new_content = content[:bracket_end] + entries_str + '\n' + content[bracket_end:]

    with open(filepath, 'w') as f:
        f.write(new_content)
    return True

def create_scraper_file(state_abbr, entries):
    """Create a new WordPress scraper file for a state that doesn't have one yet."""
    state_lower = state_abbr.lower()
    state_full = STATE_ABBR_TO_FULL[state_abbr]
    filepath = os.path.join(PROJ, 'scrapers', f'scraper-wordpress-libraries-{state_lower}.js')

    entries_str = ',\n'.join(entries)

    content = f"""const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const {{ admin, db }} = require('./helpers/supabase-adapter');

const {{ logScraperResult }} = require('./scraper-logger');
const {{ saveEventsWithGeocoding }} = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * {state_full} Public Libraries Scraper - Coverage: All {state_full} public libraries
 */
const LIBRARIES = [
{entries_str}
];

const SCRAPER_NAME = 'wordpress-{state_abbr}';

async function scrapeGenericEvents() {{
  const browser = await puppeteer.launch({{
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  }});
  const events = [];
  for (const library of LIBRARIES) {{
    try {{
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {{ waitUntil: 'domcontentloaded', timeout: 15000 }});
      await new Promise(resolve => setTimeout(resolve, 1000));
      const libraryEvents = await page.evaluate((libName) => {{
        const events = [];
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          '[id*="event"]',
          'article',
          '.post',
          '.item'
        ];

        const foundElements = new Set();

        eventSelectors.forEach(selector => {{
          document.querySelectorAll(selector).forEach(card => {{
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {{
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('[class*="name"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\\d{{1,2}}\\/\\d{{1,2}}\\/\\d{{2,4}}|\\w+ \\d{{1,2}},? \\d{{4}}|^\\d{{1,2}}:\\d{{2}}/i)
                )
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('[class*="summary"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');
              const imageEl = card.querySelector('img');

              const ageEl = [
                card.querySelector('[class*="audience"]'),
                card.querySelector('[class*="age-range"]'),
                card.querySelector('[class*="age_range"]'),
                card.querySelector('[class*="ages"]'),
                card.querySelector('[class*="age-group"]'),
                card.querySelector('[class*="category"]')
              ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (possibleTitles.length > 0) {{
                const event = {{
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  time: possibleDates.length > 1 ? possibleDates[1].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                }};

                if (event.title && (event.date || event.description)) {{
                  events.push(event);
                }}
              }}
            }} catch (e) {{
              // Skip problematic elements
            }}
          }});
        }});

        const seen = new Set();
        return events.filter(evt => {{
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }});
      }}, library.name);

      libraryEvents.forEach(event => {{
        events.push({{
          ...event,
          metadata: {{
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'generic',
            state: '{state_abbr}',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }}
        }});
      }});

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));

    }} catch (error) {{
      console.error(`   ❌ Error scraping ${{library.name}}:`, error.message);
    }}
  }}

  await browser.close();
  console.log(`\\n📊 Total events found: ${{events.length}}`);
  return events;
}}

async function saveToFirebase(events) {{
  return await saveEventsWithGeocoding(events, LIBRARIES, {{
    scraperName: SCRAPER_NAME,
    state: '{state_abbr}',
    category: 'library',
    platform: 'wordpress'
  }});
}}

async function main() {{
  console.log(`\\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  {state_full} Libraries Scraper (${{LIBRARIES.length}} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {{
    await saveToFirebase(events);
  }}

  process.exit(0);
}}

if (require.main === module) {{
  main();
}}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpress{state_abbr}CloudFunction() {{
  console.log('☁️ Running WordPress {state_abbr} as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {{
    await logScraperResult('WordPress-{state_abbr}', {{ found: 0, new: 0, duplicates: 0 }}, {{ dataType: 'events' }});
    return {{ found: 0, new: 0, duplicates: 0 }};
  }}
  const result = await saveToFirebase(events);
  await logScraperResult('WordPress-{state_abbr}', {{
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }}, {{ dataType: 'events' }});

  return {{
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }};
}}

module.exports = {{ scrapeGenericEvents, saveToFirebase, scrapeWordpress{state_abbr}CloudFunction }};
"""
    with open(filepath, 'w') as f:
        f.write(content)
    return filepath

def main():
    print("Reading spreadsheet...")
    df = pd.read_excel(SPREADSHEET)
    df['state_abbr'] = df['State'].map(STATE_FULL_TO_ABBR)

    results = {}

    for state_abbr in sorted(ACTIVE_STATES):
        state_lower = state_abbr.lower()
        filepath = os.path.join(PROJ, 'scrapers', f'scraper-wordpress-libraries-{state_lower}.js')
        file_exists = os.path.exists(filepath)

        # Get libraries for this state from spreadsheet
        state_libs = df[df['state_abbr'] == state_abbr].copy()
        if state_libs.empty:
            print(f"\n{state_abbr}: No libraries in spreadsheet, skipping")
            results[state_abbr] = 0
            continue

        print(f"\n{'='*60}")
        print(f"{state_abbr}: {len(state_libs)} libraries in spreadsheet, file {'EXISTS' if file_exists else 'NEW'}")

        if file_exists:
            # Extract existing cities and names
            existing_cities = extract_existing_cities(filepath)
            existing_names = extract_existing_names(filepath)
            print(f"  Existing entries: {len(existing_cities)} cities, {len(existing_names)} names")
        else:
            existing_cities = set()
            existing_names = set()

        # Find uncovered libraries - deduplicate by city (one entry per city)
        new_entries = []
        cities_added = set()

        for _, row in state_libs.iterrows():
            city = str(row['City']).strip()
            name = str(row['Library Name']).strip()
            zip_code = format_zip(row['Zip Code'])

            city_lower = city.lower()

            # Skip if city already covered
            if city_lower in existing_cities:
                continue
            # Skip if already adding an entry for this city
            if city_lower in cities_added:
                continue

            # Generate URL from city
            url = generate_url(city)
            events_url = generate_events_url(city)
            county = f'{city} County'

            entry = format_entry(name, url, events_url, city, state_abbr, zip_code, county)
            new_entries.append(entry)
            cities_added.add(city_lower)

        print(f"  New entries to add: {len(new_entries)}")

        if new_entries:
            if file_exists:
                success = insert_entries_into_file(filepath, new_entries)
                if success:
                    print(f"  SUCCESS: Added {len(new_entries)} entries to {filepath}")
                else:
                    print(f"  FAILED: Could not modify {filepath}")
            else:
                filepath = create_scraper_file(state_abbr, new_entries)
                print(f"  SUCCESS: Created new file {filepath} with {len(new_entries)} entries")

        results[state_abbr] = len(new_entries)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY:")
    print(f"{'='*60}")
    total = 0
    for state, count in sorted(results.items()):
        if count > 0:
            print(f"  {state}: +{count} libraries added")
            total += count
    print(f"\n  TOTAL: {total} libraries added across {sum(1 for c in results.values() if c > 0)} states")

if __name__ == '__main__':
    main()
