/**
 * AGE RANGE NORMALIZER
 *
 * Shared module that normalizes messy age_range strings into standard brackets.
 * Used by both supabase-adapter.js (at save time) and fix-all-data-quality.js (batch cleanup).
 *
 * Standard values:
 *   "All Ages"
 *   "Babies & Toddlers (0-2)"
 *   "Preschool (3-5)"
 *   "Kids (6-8)"
 *   "Tweens (9-12)"
 *   "Teens (13-18)"
 *   "Adults" (flagged for deletion by cleanup scripts)
 *   Multi-bracket combos like "Kids (6-8), Tweens (9-12)"
 */

// Helper: find all overlapping brackets for a numeric age range
// Brackets: [0,2], [3,5], [6,8], [9,12], [13,18]
function getBrackets(lo, hi) {
  const BRACKETS = [
    { lo: 0,  hi: 2,  label: 'Babies & Toddlers (0-2)' },
    { lo: 3,  hi: 5,  label: 'Preschool (3-5)' },
    { lo: 6,  hi: 8,  label: 'Kids (6-8)' },
    { lo: 9,  hi: 12, label: 'Tweens (9-12)' },
    { lo: 13, hi: 18, label: 'Teens (13-18)' },
  ];
  const matches = [];
  for (const b of BRACKETS) {
    // Overlap: range [lo,hi] intersects bracket [b.lo,b.hi]
    if (lo <= b.hi && hi >= b.lo) {
      matches.push(b.label);
    }
  }
  if (matches.length === 0) return 'All Ages';
  if (matches.length >= 4) return 'All Ages';  // Spans 4+ brackets = effectively All Ages
  if (matches.length === 1) return matches[0];
  // Multiple brackets: return the lowest (broadest coverage for filtering)
  return matches[0];
}

function normalizeAgeRange(raw) {
  if (!raw || typeof raw !== 'string') return 'All Ages';

  const text = raw.trim();
  const lower = text.toLowerCase();

  // --- Content warnings / non-age-range text (treat as All Ages) ---
  // Some scrapers extract content warnings (e.g., "Contains sudden loud noises, haze, adult language")
  // or long description text into the age_range field. Detect and skip.
  if (/\b(contains|includes|features|warning|caution|advisory)\b/i.test(lower) && /\b(loud|haze|strobe|fog|language|content|noise|flash|smoke)\b/i.test(lower)) return 'All Ages';
  if (text.length > 120) return 'All Ages';  // Age ranges are never this long — it's description text

  // --- ADULTS detection (will be deleted, not just normalized) ---
  // Standalone "Adults" or "adults" as the primary audience
  if (/^adults?$/i.test(text.trim())) return 'Adults';
  if (/^adults?\s*only$/i.test(text.trim())) return 'Adults';
  if (/^for\s+adults$/i.test(text.trim())) return 'Adults';
  if (/^ADULTS\s+19\+$/i.test(text.trim())) return 'Adults';
  if (/^adults?\s+18\+$/i.test(text.trim())) return 'Adults';
  if (/^18\+\s*\(adults?\)$/i.test(text.trim())) return 'Adults';
  if (/^adults?\s+ages\s+21\+$/i.test(text.trim())) return 'Adults';
  if (/^adults?\s+date[- ]?night/i.test(text.trim())) return 'Adults';
  if (/^adults[- ]only/i.test(text.trim())) return 'Adults';
  if (/^older\s+teens?\s+and\s+adults$/i.test(text.trim())) return 'Adults';
  if (/^teens?\s+and\s+adults?$/i.test(text.trim())) return 'Adults';
  if (/^teens?\s+&\s+adults?$/i.test(text.trim())) return 'Adults';
  if (/^teens?\s+\/\s+adults?$/i.test(text.trim())) return 'Adults';
  if (/^for\s+ages?\s+16\s+to\s+adult/i.test(text.trim())) return 'Adults';
  if (/^18\+/i.test(text.trim())) return 'Adults';
  if (/^\+18$/i.test(text.trim())) return 'Adults';
  if (/^21\+/i.test(text.trim())) return 'Adults';
  if (/\b(18|21)\+\s*and\s*(over|up|older)\b/i.test(lower)) return 'Adults';

  // If text contains "adult" as audience label (not "young adult"), and no kids/family mentions
  if (/\badult\s+date[- ]?night/i.test(lower)) return 'Adults';
  if (/\btween\s+to\s+adult\b/i.test(lower)) return 'Adults';
  if (/\bages?\s+\d+[- ]+adult\b/i.test(lower)) return 'All Ages';  // "Ages 6- Adult" = wide range
  if (/\bbest\s+for\s+adults\b/i.test(lower)) return 'Adults';
  if (/\bteens?\s+and\s+young\s+adults?\b/i.test(lower)) return 'Teens (13-18)';
  if (/\btweens?,?\s+teens?\s+and\s+adult/i.test(lower)) return 'Adults';

  // --- EARLY EXIT: "All Ages" keywords, URLs, and junk text ---
  // Must come BEFORE numeric parsing so URL segments like "/24-2-2-2/" aren't misread as ages
  if (/\ball\s*ages\b/i.test(lower)) return 'All Ages';
  if (/\beveryone\b/i.test(lower)) return 'All Ages';
  if (/\bfamil(y|ies)\b/i.test(lower)) return 'All Ages';
  if (/\ball\s+are\s+welcome\b/i.test(lower)) return 'All Ages';
  if (/\ball\s+welcome\b/i.test(lower)) return 'All Ages';
  if (/\bfun\s+for\s+(all|the\s+whole)\b/i.test(lower)) return 'All Ages';
  if (/\bthe\s+whole\s+family\b/i.test(lower)) return 'All Ages';
  if (/\bwhole\s+family\s+welcome\b/i.test(lower)) return 'All Ages';
  if (/\bkids\s*[&+]\s*famil/i.test(lower)) return 'All Ages';
  if (/\bfamily[- ]?friendly\b/i.test(lower)) return 'All Ages';
  if (/\bopen\s+to\s+all\b/i.test(lower)) return 'All Ages';
  if (/\bfor\s+all\b/i.test(lower)) return 'All Ages';
  if (/\bfun\s+for\s+kids\b/i.test(lower)) return 'All Ages';
  if (/\bkids\s+of\s+all\s+ages\b/i.test(lower)) return 'All Ages';
  if (/\bchildren\s+of\s+all\s+ages\b/i.test(lower)) return 'All Ages';
  if (/\bbring\s+(the\s+)?whole\s+family\b/i.test(lower)) return 'All Ages';
  if (/\bchildren\s+and\s+(their\s+)?famil/i.test(lower)) return 'All Ages';
  if (/\bkids\s+and\s+famil/i.test(lower)) return 'All Ages';
  if (/\bfamilies\s+with\b/i.test(lower)) return 'All Ages';
  if (/\banyone\b/i.test(lower)) return 'All Ages';
  if (/\bthe\s+entire\s+family\b/i.test(lower)) return 'All Ages';
  if (/\bsuitable\s+for\b/i.test(lower) && !/\bnot\s+suitable\b/i.test(lower)) return 'All Ages';
  if (/\binclusive\b/i.test(lower)) return 'All Ages';
  if (/\blearners?\s+of\s+all\s+ages\b/i.test(lower)) return 'All Ages';
  if (/\blovers?\s+of\s+all\s+ages\b/i.test(lower)) return 'All Ages';
  if (/\b(sensory[- ]?friendly|special\s+needs)\b/i.test(lower)) return 'All Ages';
  if (/^just\s+show\s+up\b/i.test(lower)) return 'All Ages';
  if (/^show\s+up\b/i.test(lower)) return 'All Ages';
  if (/^all$/i.test(text.trim())) return 'All Ages';
  if (/^any\s+age$/i.test(text.trim())) return 'All Ages';
  if (/\bdog\s+lovers?\b/i.test(lower)) return 'All Ages';
  if (/\bresidents?\b/i.test(lower) && !/\bage/i.test(lower)) return 'All Ages';
  if (/\bno\s+age\s+restrict/i.test(lower)) return 'All Ages';
  if (/\b(skill\s+level|creative\s+level)/i.test(lower)) return 'All Ages';
  if (/^https?:\/\//i.test(text.trim())) return 'All Ages';
  if (text.includes('#') && text.length > 80) return 'All Ages';
  if (text.length > 100) return 'All Ages';
  // Junk text that isn't an age range (pricing, library names, ticket info, URLs)
  if (/^\$\d/i.test(text.trim())) return 'All Ages';  // Starts with price
  if (/\bcounty\s+(public\s+)?library\b/i.test(lower)) return 'All Ages';  // Library name, not age
  if (/\b(youth\s+)?bureau\b/i.test(lower) && !/\bage/i.test(lower)) return 'All Ages';
  if (/\btickets?\b/i.test(lower) && !/\bage/i.test(lower) && !/\bunder\b/i.test(lower)) return 'All Ages';

  // --- NEW: Birth/walking/baby/nursing/stroller patterns ---
  if (/\bbirth\b.*\bwalking\b/i.test(lower)) return 'Babies & Toddlers (0-2)';
  if (/\bnursing\s+mothers?\b/i.test(lower)) return 'Babies & Toddlers (0-2)';
  if (/\bstrollers?\b/i.test(lower)) return 'Babies & Toddlers (0-2)';
  // "walking to age X" — toddlers up to that age
  const walkingToAge = lower.match(/\bwalking\s+to\s+age\s+(\d)/i);
  if (walkingToAge) {
    return getBrackets(0, parseInt(walkingToAge[1]));
  }

  // --- NEW: Mixed months/years patterns ---
  // "18 months- 3 years", "16 months-3 years", "16 months to 3 years"
  const mixedMonthsYears = lower.match(/(\d{1,2})\s*months?\s*[-–—to]+\s*(\d{1,2})\s*years?/);
  if (mixedMonthsYears) {
    const loYears = Math.floor(parseInt(mixedMonthsYears[1]) / 12);
    const hiYears = parseInt(mixedMonthsYears[2]);
    return getBrackets(loYears, hiYears);
  }

  // --- Handle "months" ranges (0-24 months, 18-36 months, etc.) ---
  const monthsMatch = lower.match(/(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s*months?/);
  if (monthsMatch) {
    const loMonths = parseInt(monthsMatch[1]);
    const hiMonths = parseInt(monthsMatch[2]);
    // Convert months to years (floor for lo, ceil for hi)
    const loYears = Math.floor(loMonths / 12);
    const hiYears = Math.ceil(hiMonths / 12);
    return getBrackets(loYears, hiYears);
  }

  // --- Extract numeric age ranges ---
  // Look for patterns like "0-2", "3-5", "ages 6-12", etc.
  const rangeMatch = lower.match(/(?:ages?\s*)?(\d{1,2})\s*[-–—to]+\s*(\d{1,2})/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1]);
    const hi = parseInt(rangeMatch[2]);
    if (lo >= 18) return 'Adults';
    return getBrackets(lo, hi);
  }

  // --- "X and under" / "under X" / "X and younger" / "X and below" patterns ---
  const underMatch = lower.match(/(?:ages?\s*)?(\d{1,2})\s+and\s+(?:under|younger|below)/);
  if (underMatch) {
    return getBrackets(0, parseInt(underMatch[1]));
  }
  const underMatch2 = lower.match(/\bunder\s+(?:age\s*)?(\d{1,2})\b/);
  if (underMatch2) {
    return getBrackets(0, parseInt(underMatch2[1]) - 1);
  }

  // --- Single age patterns: "ages 6+", "5 and up", "13+ years" ---
  const singleAge = lower.match(/(?:ages?\s*)(\d{1,2})\s*(?:\+|and\s+(?:up|over|older))/);
  if (singleAge) {
    const age = parseInt(singleAge[1]);
    if (age >= 18) return 'Adults';
    // "Ages 6+" means 6 through 18
    return getBrackets(age, 18);
  }

  // --- NEW: "X+ years" pattern: "13+ years", "6+ years" ---
  const plusYears = lower.match(/(\d{1,2})\+\s*years?\b/);
  if (plusYears) {
    const age = parseInt(plusYears[1]);
    if (age >= 18) return 'Adults';
    return getBrackets(age, 18);
  }

  // --- NEW: "X and up" without "ages" prefix: "7 and up", "3 and up" ---
  const andUp = lower.match(/\b(\d{1,2})\s+and\s+(?:up|over|older)\b/);
  if (andUp) {
    const age = parseInt(andUp[1]);
    if (age >= 18) return 'Adults';
    return getBrackets(age, 18);
  }

  // Standalone number patterns: "18+", "21+", "50+", "65+"
  const standalonePlus = lower.match(/^(\d{1,2})\s*\+$/);
  if (standalonePlus) {
    const age = parseInt(standalonePlus[1]);
    if (age >= 18) return 'Adults';
    return getBrackets(age, 18);
  }

  // --- Keyword-based matching ---

  // Babies & Toddlers
  if (/\b(baby|babies|infant|infants?|newborn|0\s*[-–]\s*2|birth\s+to\s+2|0\s+to\s+2|pre[- ]?walk|crawl)/i.test(lower) &&
      !/\b(preschool|elementary|school\s*age|tween|teen|grade)\b/i.test(lower)) {
    return 'Babies & Toddlers (0-2)';
  }

  // Toddlers (overlaps with babies/preschool but when used alone = 0-2)
  if (/^(?:for\s+)?toddlers?(?:\s|$|\.)/i.test(lower) && !/preschool/i.test(lower)) {
    return 'Babies & Toddlers (0-2)';
  }

  // Walking children = toddlers
  if (/\bwalking\s+(?:to|up\s+to|through)\s+(?:age\s*)?(\d)/i.test(lower)) {
    return 'Babies & Toddlers (0-2)';
  }

  // Preschool
  if (/\b(preschool|pre[- ]?school|pre[- ]?k|prek|3\s*[-–]\s*5|pre[- ]?kindergarten)/i.test(lower) &&
      !/\b(tween|teen|middle\s*school|high\s*school)\b/i.test(lower)) {
    return 'Preschool (3-5)';
  }

  // Kids / Elementary / Children
  if (/\b(elementary|school[- ]?age|grade\s*school)\b/i.test(lower) &&
      !/\b(tween|teen|middle|high\s*school|infant|baby)\b/i.test(lower)) {
    return 'Kids (6-8)';
  }

  // Tweens
  if (/\b(tween)/i.test(lower) && !/\bteen\b/i.test(lower)) {
    return 'Tweens (9-12)';
  }

  // Teens
  if (/\b(teen|teens|13\s*[-–]\s*17|13\s*[-–]\s*18|middle\s+school|high\s+school)/i.test(lower) &&
      !/\b(baby|toddler|preschool|infant)\b/i.test(lower) &&
      !/\ball\s*ages\b/i.test(lower) &&
      !/\byoung\s+adult\b/i.test(lower)) {
    return 'Teens (13-18)';
  }

  // Young Adult = Teens
  if (/\byoung\s+adult/i.test(lower)) {
    return 'Teens (13-18)';
  }

  // Children / Kids without age qualifier
  if (/^(?:for\s+)?(?:children|kids)$/i.test(text.trim())) return 'All Ages';
  if (/\bchildren\b/i.test(lower) && lower.length < 40) return 'All Ages';
  if (/\bkids\b/i.test(lower) && lower.length < 40) return 'All Ages';

  // Babies (standalone)
  if (/^(?:for\s+)?babies$/i.test(text.trim())) return 'Babies & Toddlers (0-2)';

  // Littles / little ones
  if (/\blittle\s*ones?\b/i.test(lower) || /\blittles\b/i.test(lower)) return 'Preschool (3-5)';

  // Homeschool = All Ages (could be any age)
  if (/\bhomeschool/i.test(lower)) return 'All Ages';

  // Moms/parents groups
  if (/\bmoms?\b/i.test(lower) && !/\bkid|child|baby|toddler|infant/i.test(lower)) return 'All Ages';
  if (/\bparents?\b/i.test(lower)) return 'All Ages';

  // --- NEW: Grade patterns with K/Kinder prefix ---
  // "K - 5th Grades", "Kinder-5th grade", "Kindergarten-5th grade"
  const kinderGrade = lower.match(/\bk(?:inder(?:garten)?)?[\s-]+(\d{1,2})(?:st|nd|rd|th)?\s*grade/i);
  if (kinderGrade) {
    const hiGrade = parseInt(kinderGrade[1]);
    // K starts at ~age 5, so grade X ends at ~age 5+X
    if (hiGrade <= 5) return getBrackets(5, 5 + hiGrade);
    if (hiGrade <= 8) return getBrackets(5, 5 + hiGrade);
    return getBrackets(5, 5 + hiGrade);
  }

  // --- NEW: "6th-12th graders" ordinal grade range ---
  const ordGradeRange = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?\s*grade/i);
  if (ordGradeRange) {
    const loGrade = parseInt(ordGradeRange[1]);
    const hiGrade = parseInt(ordGradeRange[2]);
    // Grade N ≈ age 5+N
    return getBrackets(5 + loGrade, 5 + hiGrade);
  }

  // Grade ranges: "grades K-5", "grades 1-5", "grades 3 - 5"
  const gradeMatch = lower.match(/grades?\s*(?:k|kindergarten|\d{1,2})(?:st|nd|rd|th)?\s*[-–to]+\s*(\d{1,2})/i);
  if (gradeMatch) {
    const hiGrade = parseInt(gradeMatch[1]);
    if (hiGrade <= 2) return 'Kids (6-8)';
    if (hiGrade <= 5) return 'Kids (6-8)';
    if (hiGrade <= 8) return 'Tweens (9-12)';
    return 'Teens (13-18)';
  }

  // "1st - 5th grade" / "1st-4th grade" etc. (fallback for non-matched above)
  const ordGradeMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)\s*[-–to]+\s*(\d{1,2})(?:st|nd|rd|th)?\s*grade/i);
  if (ordGradeMatch) {
    const hiGrade = parseInt(ordGradeMatch[2]);
    if (hiGrade <= 5) return 'Kids (6-8)';
    if (hiGrade <= 8) return 'Tweens (9-12)';
    return 'Teens (13-18)';
  }

  // "for grades 3+" / "grades 3 and up"
  const gradeUp = lower.match(/grades?\s*(\d{1,2})\s*(?:\+|and\s+up)/i);
  if (gradeUp) {
    const grade = parseInt(gradeUp[1]);
    if (grade <= 5) return 'Kids (6-8)';
    if (grade <= 8) return 'Tweens (9-12)';
    return 'Teens (13-18)';
  }

  // K-12, K-5 etc
  if (/\bk\s*[-–]\s*12\b/i.test(lower)) return 'All Ages';
  if (/\bk\s*[-–]\s*5\b/i.test(lower)) return 'Kids (6-8)';
  if (/\bk\s*[-–]\s*3\b/i.test(lower)) return 'Kids (6-8)';
  if (/\bk\s*[-–]\s*8\b/i.test(lower)) return 'Tweens (9-12)';

  // "k-6th" / "k-8th" style
  if (/\bk\s*[-–]\s*6(?:th)?\b/i.test(lower)) return 'Tweens (9-12)';

  // "School Age" / "School Ages" standalone
  if (/\bschool\s*age/i.test(lower)) return 'Kids (6-8)';

  // "young children" / "little ones" / "young learners"
  if (/\byoung\s+children\b/i.test(lower)) return 'Preschool (3-5)';
  if (/\byoung\s+learners?\b/i.test(lower)) return 'Preschool (3-5)';

  // "new parents" / "caregivers" / "moms" without age info → All Ages
  if (/\b(new\s+parents?|caregivers?)\b/i.test(lower) && !/\bage/i.test(lower)) return 'All Ages';

  // Default
  return 'All Ages';
}

module.exports = { normalizeAgeRange, getBrackets };
