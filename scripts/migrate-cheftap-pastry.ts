/**
 * Migrates pastry/dessert/baking recipes from the Recipem8 (ChefTap) Supabase
 * database into Kitchen Recipe OS under the Pastry Hub venue.
 *
 * Dry run by default. Pass --confirm to actually insert.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-cheftap-pastry.ts
 *   npx tsx --env-file=.env.local scripts/migrate-cheftap-pastry.ts --confirm
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ───────────────────────────────────────────────────────────────────

const CONFIRM = process.argv.includes('--confirm');

const PASTRY_HUB_VENUE_ID = 'a1000000-0000-0000-0000-000000000008';

const PASTRY_KEYWORDS = [
  'pastry', 'dessert', 'desserts', 'cake', 'cakes', 'bread', 'chocolate',
  'baking', 'croissant', 'tart', 'muffin', 'cookie', 'macaron', 'scone',
  'pudding', 'cheesecake', 'gateau', 'mousse', 'souffle', 'brioche',
  'danish', 'eclair', 'profiterole', 'tiramisu', 'panna cotta',
];

const SECTION_RULES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(bread|brioche|sourdough)\b/i,               name: 'Bread' },
  { pattern: /\b(croissant|danish|viennoiserie|pastry)\b/i,  name: 'Pastries & Croissants' },
  { pattern: /\b(christmas|festive|holiday)\b/i,             name: 'Christmas' },
  { pattern: /\b(ramadan|arabic\s+sweets?)\b/i,              name: 'Ramadan' },
  { pattern: /\b(sauce|cream|base|curd|gel|basic)\b/i,       name: 'Basic Recipes' },
];

const DESIRED_SECTIONS = [
  'Bread',
  'Pastries & Croissants',
  'Christmas',
  'Ramadan',
  'Basic Recipes',
  'Desserts',
];

// ── Types ────────────────────────────────────────────────────────────────────

interface Rm8Recipe {
  id: string;
  title: string;
  tags: string[] | null;
  yield: string | null;
  ingredients: string[] | null;
  instructions: string[] | null;
  notes: string | null;
  photo: string | null;
  cheftap_url: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const KEYWORD_RE = new RegExp(
  PASTRY_KEYWORDS.map(k => k.replace(/\s+/g, '\\s+')).join('|'),
  'i',
);

function isPastry(r: Rm8Recipe): boolean {
  const fields = [r.title, ...(r.tags ?? [])].join(' ');
  return KEYWORD_RE.test(fields);
}

function mapSection(tags: string[] | null): string {
  const joined = (tags ?? []).join(' ');
  for (const { pattern, name } of SECTION_RULES) {
    if (pattern.test(joined)) return name;
  }
  return 'Desserts';
}

const UNIT_PAT = [
  'gr', 'g', 'kg', 'ml', 'l', 'cl', 'dl',
  'tsp', 'tbsp', 'tbsp\\.?', 'tbs',
  'each', 'ea',
  'pcs?', 'pieces?',
  'bunch', 'pinch', 'handful',
  'oz', 'lbs?',
  'cups?',
  'portions?', 'servings?',
  'sheets?',
  'litres?', 'liters?',
  'fl\\.?\\s*oz',
  'drops?', 'sprigs?', 'slices?',
  'qt\\.?',
].join('|');

const ING_RE = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PAT})\\s+(.+)$`,
  'i',
);

interface ParsedIngredient {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  preparation_note: string | null;
  raw_ingredient_text: string;
  sort_order: number;
}

function parseIngredient(raw: string, idx: number): ParsedIngredient {
  const trimmed = raw.trim();
  const m = trimmed.match(ING_RE);
  if (m) {
    const [, qty, unit, rest] = m;
    const commaIdx = rest.indexOf(',');
    const name = commaIdx === -1 ? rest : rest.slice(0, commaIdx).trim();
    const prep = commaIdx === -1 ? null : rest.slice(commaIdx + 1).trim() || null;
    return {
      ingredient_name: name,
      quantity: parseFloat(qty.replace(',', '.')),
      unit: unit.toLowerCase().replace(/\.$/, ''),
      preparation_note: prep,
      raw_ingredient_text: trimmed,
      sort_order: idx,
    };
  }
  return {
    ingredient_name: trimmed,
    quantity: null,
    unit: null,
    preparation_note: null,
    raw_ingredient_text: trimmed,
    sort_order: idx,
  };
}

function parsePortionSize(yieldStr: string | null): number | null {
  if (!yieldStr) return null;
  // "= N x" → batch/quantity pattern e.g. "1650gr = 20 x 80gr"
  const mult = yieldStr.match(/=\s*(\d+)\s*x/i);
  if (mult) return parseInt(mult[1]);
  // "N <unit>" at start, where unit looks like a count not a weight
  const count = yieldStr.match(
    /^(\d+)\s*(pieces?|portions?|servings?|sandwiches?|buns?|rolls?|tarts?|cakes?|cookies?|macarons?|muffins?|croissants?|biscuits?|each|pcs?|slices?|bars?|truffles?)/i,
  );
  if (count) return parseInt(count[1]);
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Env checks
  const rm8Url = process.env.RECIPEM8_SUPABASE_URL;
  const rm8Key = process.env.RECIPEM8_SUPABASE_ANON_KEY;
  const krosUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const krosKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rm8Url || !rm8Key) {
    console.error('Missing RECIPEM8_SUPABASE_URL or RECIPEM8_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  if (!krosUrl || !krosKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const src = createClient(rm8Url, rm8Key);
  const dst = createClient(krosUrl, krosKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(CONFIRM
    ? '\n🚀 LIVE MIGRATION — inserting into Kitchen Recipe OS'
    : '\n🔍 DRY RUN — pass --confirm to actually insert\n'
  );

  // ── 1. Fetch all Recipem8 recipes ─────────────────────────────────────────
  console.log('Fetching Recipem8 recipes…');
  const allRecipes: Rm8Recipe[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await src
      .from('recipes')
      .select('id, title, tags, yield, ingredients, instructions, notes, photo, cheftap_url')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Recipem8 fetch error:', error.message); process.exit(1); }
    if (!data?.length) break;
    allRecipes.push(...(data as Rm8Recipe[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const pastryRecipes = allRecipes.filter(isPastry);
  console.log(`  Total in Recipem8: ${allRecipes.length}`);
  console.log(`  Pastry/dessert matches: ${pastryRecipes.length}\n`);

  if (!CONFIRM) {
    // Dry run — show section breakdown and bail
    const preview: Record<string, number> = {};
    for (const r of pastryRecipes) {
      const s = mapSection(r.tags);
      preview[s] = (preview[s] ?? 0) + 1;
    }
    console.log('Section preview:');
    for (const [s, n] of Object.entries(preview).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${s}: ${n}`);
    }
    console.log('\nRun with --confirm to migrate.');
    return;
  }

  // ── 2. Ensure sections exist on Pastry Hub ────────────────────────────────
  console.log('Ensuring sections exist on Pastry Hub…');
  const { data: existingSections, error: secErr } = await dst
    .from('sections')
    .select('id, name')
    .eq('venue_id', PASTRY_HUB_VENUE_ID);
  if (secErr) { console.error('Section fetch error:', secErr.message); process.exit(1); }

  const sectionMap: Record<string, string> = {};
  for (const s of existingSections ?? []) {
    sectionMap[s.name] = s.id;
  }

  for (let i = 0; i < DESIRED_SECTIONS.length; i++) {
    const name = DESIRED_SECTIONS[i];
    if (sectionMap[name]) {
      console.log(`  ✓ "${name}" already exists`);
      continue;
    }
    const { data: newSec, error: newSecErr } = await dst
      .from('sections')
      .insert({
        venue_id: PASTRY_HUB_VENUE_ID,
        name,
        sort_order: i,
        is_active: true,
      } as any)
      .select('id')
      .single();
    if (newSecErr || !newSec) {
      console.error(`  ✗ Failed to create section "${name}":`, newSecErr?.message);
      process.exit(1);
    }
    sectionMap[name] = newSec.id;
    console.log(`  + Created "${name}"`);
  }

  // ── 3. Migrate recipes ────────────────────────────────────────────────────
  console.log(`\nMigrating ${pastryRecipes.length} recipes…`);

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const sectionCounts: Record<string, number> = {};

  for (let i = 0; i < pastryRecipes.length; i++) {
    const r = pastryRecipes[i];
    const sectionName = mapSection(r.tags);
    const sectionId = sectionMap[sectionName];

    try {
      // 3a. Insert recipe row
      const { data: newRecipe, error: rErr } = await dst
        .from('recipes')
        .insert({
          venue_id: PASTRY_HUB_VENUE_ID,
          section_id: sectionId ?? null,
          title: r.title,
          description: r.notes ?? null,
          portion_size: parsePortionSize(r.yield),
          recipe_size: 1,
          status: 'pending_review',
          tags: r.tags ?? [],
          is_master_recipe: false,
          version_number: 1,
        } as any)
        .select('id')
        .single();

      if (rErr || !newRecipe) throw new Error(rErr?.message ?? 'Recipe insert failed');
      const recipeId: string = newRecipe.id;

      // 3b. Insert ingredients
      const rawIngs = (r.ingredients ?? []).filter(s => s.trim());
      if (rawIngs.length > 0) {
        const ingRows = rawIngs.map((raw, idx) => ({
          recipe_id: recipeId,
          ...parseIngredient(raw, idx),
        }));
        const { error: iErr } = await dst.from('recipe_ingredients').insert(ingRows as any);
        if (iErr) throw new Error(`Ingredients: ${iErr.message}`);
      }

      // 3c. Insert steps
      const rawSteps = (r.instructions ?? []).filter(s => s.trim());
      if (rawSteps.length > 0) {
        const stepRows = rawSteps.map((instruction, idx) => ({
          recipe_id: recipeId,
          step_number: idx + 1,
          sort_order: idx,
          instruction,
        }));
        const { error: sErr } = await dst.from('recipe_steps').insert(stepRows as any);
        if (sErr) throw new Error(`Steps: ${sErr.message}`);
      }

      // 3d. Insert hero image
      if (r.photo) {
        const { error: mErr } = await dst.from('recipe_media').insert({
          recipe_id: recipeId,
          media_type: 'hero_image',
          is_external: true,
          file_url: r.photo,
          external_url: r.photo,
          mime_type: 'image/png',
          sort_order: 0,
        } as any);
        if (mErr) throw new Error(`Media: ${mErr.message}`);
      }

      sectionCounts[sectionName] = (sectionCounts[sectionName] ?? 0) + 1;
      migrated++;

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`  … ${i + 1}/${pastryRecipes.length}\n`);
      }
    } catch (e) {
      const msg = `"${r.title}": ${String(e)}`;
      errors.push(msg);
      skipped++;
    }
  }

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('  MIGRATION COMPLETE');
  console.log('══════════════════════════════════════════');
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped}`);
  console.log('');
  console.log('  Per section:');
  for (const [s, n] of Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${s}: ${n}`);
  }
  if (errors.length > 0) {
    console.log(`\n  Errors (${errors.length}):`);
    for (const e of errors.slice(0, 20)) {
      console.log(`    ✗ ${e}`);
    }
    if (errors.length > 20) console.log(`    … and ${errors.length - 20} more`);
  } else {
    console.log('\n  No errors.');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
