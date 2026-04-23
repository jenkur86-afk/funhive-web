#!/usr/bin/env node

/**
 * Export all FunHive events and venues to Excel spreadsheets.
 *
 * Usage:
 *   node export-spreadsheets.js          # Export both events.xlsx and venues.xlsx
 *   node export-spreadsheets.js events   # Export only events.xlsx
 *   node export-spreadsheets.js venues   # Export only venues.xlsx
 *
 * Requires: npm install exceljs
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
const ExcelJS = require('exceljs');

// ============================================================================
// CONFIG
// ============================================================================

const EVENT_COLUMNS = [
  { key: 'id', header: 'ID', width: 12 },
  { key: 'name', header: 'Name', width: 35 },
  { key: 'event_date', header: 'Event Date (text)', width: 22 },
  { key: 'date', header: 'Date', width: 20 },
  { key: 'end_date', header: 'End Date', width: 20 },
  { key: 'start_time', header: 'Start Time', width: 12 },
  { key: 'end_time', header: 'End Time', width: 12 },
  { key: 'venue', header: 'Venue', width: 28 },
  { key: 'category', header: 'Category', width: 16 },
  { key: 'age_range', header: 'Age Range', width: 22 },
  { key: 'city', header: 'City', width: 16 },
  { key: 'state', header: 'State', width: 8 },
  { key: 'zip_code', header: 'Zip', width: 10 },
  { key: 'address', header: 'Address', width: 30 },
  { key: 'location', header: 'Location (lat, lng)', width: 22 },
  { key: 'geohash', header: 'Geohash', width: 10 },
  { key: 'description', header: 'Description', width: 50 },
  { key: 'url', header: 'URL', width: 30 },
  { key: 'image_url', header: 'Image URL', width: 25 },
  { key: 'activity_id', header: 'Activity ID', width: 12 },
  { key: 'source_url', header: 'Source URL', width: 25 },
  { key: 'scraper_name', header: 'Scraper', width: 22 },
  { key: 'platform', header: 'Platform', width: 14 },
  { key: 'scraped_at', header: 'Scraped At', width: 20 },
  { key: 'created_at', header: 'Created At', width: 20 },
  { key: 'updated_at', header: 'Updated At', width: 20 },
  { key: 'review_count', header: 'Reviews', width: 10 },
  { key: 'average_rating', header: 'Rating', width: 10 },
  { key: 'is_sponsored', header: 'Sponsored', width: 10 },
  { key: 'sponsor_expires_at', header: 'Sponsor Expires', width: 18 },
  { key: 'reported', header: 'Reported', width: 10 },
];

const VENUE_COLUMNS = [
  { key: 'id', header: 'ID', width: 12 },
  { key: 'name', header: 'Name', width: 35 },
  { key: 'category', header: 'Category', width: 16 },
  { key: 'subcategory', header: 'Subcategory', width: 16 },
  { key: 'city', header: 'City', width: 16 },
  { key: 'state', header: 'State', width: 8 },
  { key: 'zip_code', header: 'Zip', width: 10 },
  { key: 'address', header: 'Address', width: 30 },
  { key: 'location', header: 'Location (lat, lng)', width: 22 },
  { key: 'geohash', header: 'Geohash', width: 10 },
  { key: 'age_range', header: 'Age Range', width: 22 },
  { key: 'min_age', header: 'Min Age', width: 8 },
  { key: 'max_age', header: 'Max Age', width: 8 },
  { key: 'phone', header: 'Phone', width: 16 },
  { key: 'hours', header: 'Hours', width: 20 },
  { key: 'price_range', header: 'Price Range', width: 12 },
  { key: 'is_free', header: 'Free', width: 8 },
  { key: 'description', header: 'Description', width: 50 },
  { key: 'url', header: 'URL', width: 30 },
  { key: 'image_url', header: 'Image URL', width: 25 },
  { key: 'source', header: 'Source', width: 20 },
  { key: 'scraper_name', header: 'Scraper', width: 22 },
  { key: 'scraped_at', header: 'Scraped At', width: 20 },
  { key: 'created_at', header: 'Created At', width: 20 },
  { key: 'updated_at', header: 'Updated At', width: 20 },
  { key: 'review_count', header: 'Reviews', width: 10 },
  { key: 'average_rating', header: 'Rating', width: 10 },
  { key: 'is_sponsored', header: 'Sponsored', width: 10 },
  { key: 'sponsor_expires_at', header: 'Sponsor Expires', width: 18 },
  { key: 'reported', header: 'Reported', width: 10 },
];

const HEADER_STYLE = {
  font: { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
};

const DATA_FONT = { name: 'Arial', size: 10 };

// ============================================================================
// HELPERS
// ============================================================================

async function fetchAll(table) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
    if (error) { console.error(`  Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function flattenLocation(val) {
  if (val && typeof val === 'object' && Array.isArray(val.coordinates) && val.coordinates.length === 2) {
    return `${val.coordinates[1]}, ${val.coordinates[0]}`;
  }
  return val ? String(val) : '';
}

function cleanValue(val, key) {
  if (val === null || val === undefined) return '';
  if (key === 'location') return flattenLocation(val);
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'string') return val.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  return val;
}

async function buildWorkbook(data, columns, filePath, sheetName) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FunHive';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    properties: { tabColor: { argb: 'FFF97316' } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Set up columns
  ws.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style header row
  ws.getRow(1).eachCell(cell => {
    cell.font = HEADER_STYLE.font;
    cell.fill = HEADER_STYLE.fill;
    cell.alignment = HEADER_STYLE.alignment;
  });

  // Add data rows
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const rowData = {};
    for (const col of columns) {
      rowData[col.key] = cleanValue(record[col.key], col.key);
    }
    const row = ws.addRow(rowData);
    row.eachCell(cell => { cell.font = DATA_FONT; });

    if ((i + 1) % 5000 === 0) console.log(`  ${i + 1} rows...`);
  }

  // Auto-filter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  await wb.xlsx.writeFile(filePath);
  console.log(`  ✅ Saved ${filePath} (${data.length} rows, ${columns.length} columns)\n`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const arg = process.argv[2]?.toLowerCase();
  const doEvents = !arg || arg === 'events';
  const doVenues = !arg || arg === 'venues';

  console.log(`\n${'═'.repeat(50)}`);
  console.log('  FUNHIVE DATA EXPORT');
  console.log(`${'═'.repeat(50)}\n`);

  if (doEvents) {
    console.log('Fetching events...');
    const events = await fetchAll('events');
    console.log(`  Got ${events.length} events`);
    console.log('Building events.xlsx...');
    await buildWorkbook(events, EVENT_COLUMNS, 'events.xlsx', 'Events');
  }

  if (doVenues) {
    console.log('Fetching venues...');
    const venues = await fetchAll('activities');
    console.log(`  Got ${venues.length} venues`);
    console.log('Building venues.xlsx...');
    await buildWorkbook(venues, VENUE_COLUMNS, 'venues.xlsx', 'Venues');
  }

  console.log('Done!\n');
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
