-- =============================================================================
-- KITCHEN RECIPE OS — SEED DATA
-- Version: 2.1
-- Run after: 01_schema.sql, 02_rls.sql
-- =============================================================================
-- NOTE: Replace 'YOUR_OWNER_AUTH_UUID' with Paul's actual Supabase auth.users UUID
-- after first sign-up. Run the profile insert manually or let the trigger handle it,
-- then update the role to 'owner'.
-- =============================================================================


-- =============================================================================
-- STEP 1: After Paul signs up via Supabase Auth, run this to set owner role
-- =============================================================================

-- update public.profiles
-- set role = 'owner'
-- where email = 'paul@yourdomain.com';  -- replace with actual email


-- =============================================================================
-- VENUES
-- Ordered: Bahrain first, Saudi Arabia second, Pastry Hub last
-- =============================================================================

insert into public.venues (
  id, name, short_name, description, venue_type,
  country_code, city, theme_color, vat_rate, sort_order, brand_group
) values

  -- ───────────── BAHRAIN ─────────────

  (
    'a1000000-0000-0000-0000-000000000001',
    'Brewed Cafe',
    'Brewed',
    'Specialty coffee and all-day breakfast cafe in Bahrain.',
    'physical',
    'BH', 'Manama',
    '#2D2A26',   -- deep espresso brown
    0.10,        -- 10% VAT
    1,
    null
  ),

  (
    'a1000000-0000-0000-0000-000000000002',
    'Wildflour',
    'Wildflour',
    'Artisan bread, salads, and wholesome kitchen.',
    'physical',
    'BH', 'Manama',
    '#3D5A2A',   -- forest green
    0.10,
    2,
    null
  ),

  (
    'a1000000-0000-0000-0000-000000000003',
    'Sage & Sirloin',
    'S&S',
    'Premium steakhouse and grill in Bahrain.',
    'physical',
    'BH', 'Manama',
    '#4A1B1B',   -- deep burgundy
    0.10,
    3,
    'sage_sirloin'  -- brand group links BH + SA
  ),

  (
    'a1000000-0000-0000-0000-000000000004',
    'Royal Chippy',
    'Royal Chippy',
    'British-style fish and chips.',
    'physical',
    'BH', 'Manama',
    '#1A3A5C',   -- navy
    0.10,
    4,
    null
  ),

  -- ───────────── SAUDI ARABIA ─────────────

  (
    'a1000000-0000-0000-0000-000000000005',
    'Sage & Sirloin Lounge',
    'S&S Lounge',
    'Premium steakhouse and sheesha lounge in Saudi Arabia. Separate menu profile from Bahrain.',
    'physical',
    'SA', 'Riyadh',
    '#6B2F2F',   -- slightly lighter burgundy to differentiate from BH S&S
    0.15,        -- 15% VAT
    5,
    'sage_sirloin'
  ),

  (
    'a1000000-0000-0000-0000-000000000006',
    'TFJ',
    'TFJ',
    'All-day dining concept. TFJ The Box exclusive dishes are in a dedicated section within this venue.',
    'physical',
    'SA', 'Riyadh',
    '#4A3A1A',   -- warm amber-brown
    0.15,
    6,
    null
  ),

  (
    'a1000000-0000-0000-0000-000000000007',
    'V Seven',
    'V7',
    'Contemporary dining in Saudi Arabia.',
    'physical',
    'SA', 'Riyadh',
    '#1A1714',   -- near-black
    0.15,
    7,
    null
  ),

  -- ───────────── CROSS-VENUE ─────────────

  (
    'a1000000-0000-0000-0000-000000000008',
    'Pastry Hub',
    'Pastry Hub',
    'Cross-venue pastry and bakery recipe library. Base recipes, techniques, and full pastry profiles accessible by all venues.',
    'pastry_hub',
    null, null,  -- not a physical location
    '#C8973A',   -- gold
    0.00,        -- no VAT — library only
    0,           -- pinned first on dashboard
    null
  );


-- =============================================================================
-- SECTIONS PER VENUE
-- =============================================================================

insert into public.sections (id, venue_id, name, sort_order) values

  -- ── PASTRY HUB ──
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', 'Pastry',               1),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'Bakery',               2),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000008', 'Basic Recipes',        3),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', 'Creams & Fillings',    4),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000008', 'Doughs',               5),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000008', 'Plated Desserts',      6),
  ('b1000000-0000-0000-0000-000000000107', 'a1000000-0000-0000-0000-000000000008', 'Desserts',             7),
  ('b1000000-0000-0000-0000-000000000108', 'a1000000-0000-0000-0000-000000000008', '60x40',               8),
  ('b1000000-0000-0000-0000-000000000109', 'a1000000-0000-0000-0000-000000000008', 'Christmas',            9),
  ('b1000000-0000-0000-0000-000000000110', 'a1000000-0000-0000-0000-000000000008', 'Bread',               10),
  ('b1000000-0000-0000-0000-000000000111', 'a1000000-0000-0000-0000-000000000008', 'Pastries & Croissants', 11),
  ('b1000000-0000-0000-0000-000000000119', 'a1000000-0000-0000-0000-000000000008', 'Ramadan',               12),

  -- ── BREWED CAFE ──
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'Breakfast',        1),
  ('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000001', 'Lunch',            2),
  ('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000001', 'Dessert',          3),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'Beverages',        4),
  ('b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000001', 'Coffee',           5),
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001', 'Pastries & Cakes', 6),
  ('b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000001', 'Sandwiches',       7),
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000001', 'Basic Recipes',    8),

  -- ── WILDFLOUR ──
  ('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000002', 'Hot Kitchen',      1),
  ('b1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000002', 'Breakfast',        2),
  ('b1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000002', 'Salads',           3),
  ('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000002', 'Breads',           4),
  ('b1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000002', 'Sauces',           5),
  ('b1000000-0000-0000-0000-000000000025', 'a1000000-0000-0000-0000-000000000002', 'Prep',             6),
  ('b1000000-0000-0000-0000-000000000026', 'a1000000-0000-0000-0000-000000000002', 'Specials',         7),
  ('b1000000-0000-0000-0000-000000000080', 'a1000000-0000-0000-0000-000000000002', 'Dessert',          8),
  ('b1000000-0000-0000-0000-000000000081', 'a1000000-0000-0000-0000-000000000002', 'Beverages',        9),
  ('b1000000-0000-0000-0000-000000000082', 'a1000000-0000-0000-0000-000000000002', 'Coffee',           10),
  ('b1000000-0000-0000-0000-000000000083', 'a1000000-0000-0000-0000-000000000002', 'Tea',              11),
  ('b1000000-0000-0000-0000-000000000084', 'a1000000-0000-0000-0000-000000000002', 'Specialty Drinks', 12),
  ('b1000000-0000-0000-0000-000000000085', 'a1000000-0000-0000-0000-000000000002', 'High Tea',         13),
  ('b1000000-0000-0000-0000-000000000086', 'a1000000-0000-0000-0000-000000000002', 'Basic Recipes',    14),
  ('b1000000-0000-0000-0000-000000000112', 'a1000000-0000-0000-0000-000000000002', 'Ramadan',          15),
  ('b1000000-0000-0000-0000-000000000113', 'a1000000-0000-0000-0000-000000000002', 'Christmas',        16),

  -- ── SAGE & SIRLOIN (BH) ──
  ('b1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000003', 'Hot Kitchen',      1),
  ('b1000000-0000-0000-0000-000000000031', 'a1000000-0000-0000-0000-000000000003', 'Sauces',           2),
  ('b1000000-0000-0000-0000-000000000032', 'a1000000-0000-0000-0000-000000000003', 'Sides',            3),
  ('b1000000-0000-0000-0000-000000000033', 'a1000000-0000-0000-0000-000000000003', 'Specials',         4),
  ('b1000000-0000-0000-0000-000000000034', 'a1000000-0000-0000-0000-000000000003', 'Prep',             5),
  ('b1000000-0000-0000-0000-000000000035', 'a1000000-0000-0000-0000-000000000003', 'Desserts',         6),
  ('b1000000-0000-0000-0000-000000000087', 'a1000000-0000-0000-0000-000000000003', 'Cold Kitchen',     7),
  ('b1000000-0000-0000-0000-000000000088', 'a1000000-0000-0000-0000-000000000003', 'Marinades',        8),
  ('b1000000-0000-0000-0000-000000000089', 'a1000000-0000-0000-0000-000000000003', 'Sausages',         9),
  ('b1000000-0000-0000-0000-000000000090', 'a1000000-0000-0000-0000-000000000003', 'Beverages',        10),
  ('b1000000-0000-0000-0000-000000000091', 'a1000000-0000-0000-0000-000000000003', 'Breakfast',        11),
  ('b1000000-0000-0000-0000-000000000092', 'a1000000-0000-0000-0000-000000000003', 'Basic Recipes',    12),
  ('b1000000-0000-0000-0000-000000000114', 'a1000000-0000-0000-0000-000000000003', 'Ramadan',          13),
  ('b1000000-0000-0000-0000-000000000115', 'a1000000-0000-0000-0000-000000000003', 'Christmas',        14),

  -- ── ROYAL CHIPPY ──
  ('b1000000-0000-0000-0000-000000000040', 'a1000000-0000-0000-0000-000000000004', 'Fry Station',      1),
  ('b1000000-0000-0000-0000-000000000041', 'a1000000-0000-0000-0000-000000000004', 'Sauces',           2),
  ('b1000000-0000-0000-0000-000000000042', 'a1000000-0000-0000-0000-000000000004', 'Sides',            3),
  ('b1000000-0000-0000-0000-000000000043', 'a1000000-0000-0000-0000-000000000004', 'Basic Recipes',    4),
  ('b1000000-0000-0000-0000-000000000093', 'a1000000-0000-0000-0000-000000000004', 'Hot Kitchen',      5),
  ('b1000000-0000-0000-0000-000000000094', 'a1000000-0000-0000-0000-000000000004', 'Cold Kitchen',     6),
  ('b1000000-0000-0000-0000-000000000095', 'a1000000-0000-0000-0000-000000000004', 'Desserts',         7),

  -- ── SAGE & SIRLOIN LOUNGE (SA) ──
  -- Fully independent from BH S&S — different menu profile
  ('b1000000-0000-0000-0000-000000000049', 'a1000000-0000-0000-0000-000000000005', 'Breakfast',        1),
  ('b1000000-0000-0000-0000-000000000050', 'a1000000-0000-0000-0000-000000000005', 'Hot Kitchen',      2),
  ('b1000000-0000-0000-0000-000000000051', 'a1000000-0000-0000-0000-000000000005', 'Sheesha Menu',     3),  -- SA exclusive
  ('b1000000-0000-0000-0000-000000000052', 'a1000000-0000-0000-0000-000000000005', 'Sauces',           4),
  ('b1000000-0000-0000-0000-000000000053', 'a1000000-0000-0000-0000-000000000005', 'Sides',            5),
  ('b1000000-0000-0000-0000-000000000054', 'a1000000-0000-0000-0000-000000000005', 'Specials',         6),
  ('b1000000-0000-0000-0000-000000000055', 'a1000000-0000-0000-0000-000000000005', 'Desserts',         7),
  ('b1000000-0000-0000-0000-000000000056', 'a1000000-0000-0000-0000-000000000005', 'Prep',             8),
  ('b1000000-0000-0000-0000-000000000096', 'a1000000-0000-0000-0000-000000000005', 'Cold Kitchen',     9),
  ('b1000000-0000-0000-0000-000000000097', 'a1000000-0000-0000-0000-000000000005', 'Beverages',        10),
  ('b1000000-0000-0000-0000-000000000098', 'a1000000-0000-0000-0000-000000000005', 'Basic Recipes',    11),
  ('b1000000-0000-0000-0000-000000000116', 'a1000000-0000-0000-0000-000000000005', 'Ramadan',          12),

  -- ── TFJ (SA) ── includes The Box exclusives as a section
  ('b1000000-0000-0000-0000-000000000060', 'a1000000-0000-0000-0000-000000000006', 'Breakfast',        1),
  ('b1000000-0000-0000-0000-000000000061', 'a1000000-0000-0000-0000-000000000006', 'Hot Kitchen',      2),
  ('b1000000-0000-0000-0000-000000000062', 'a1000000-0000-0000-0000-000000000006', 'Pastry',           3),
  ('b1000000-0000-0000-0000-000000000063', 'a1000000-0000-0000-0000-000000000006', 'Sauces',           4),
  ('b1000000-0000-0000-0000-000000000064', 'a1000000-0000-0000-0000-000000000006', 'Prep',             5),
  ('b1000000-0000-0000-0000-000000000065', 'a1000000-0000-0000-0000-000000000006', 'Specials',         6),
  ('b1000000-0000-0000-0000-000000000066', 'a1000000-0000-0000-0000-000000000006', 'The Box Exclusives', 7),
  ('b1000000-0000-0000-0000-000000000099', 'a1000000-0000-0000-0000-000000000006', 'Cold Kitchen',     8),
  ('b1000000-0000-0000-0000-000000000100', 'a1000000-0000-0000-0000-000000000006', 'Desserts',         9),
  ('b1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000006', 'Basic Recipes',    10),
  ('b1000000-0000-0000-0000-000000000117', 'a1000000-0000-0000-0000-000000000006', 'Ramadan',          11),

  -- ── V SEVEN (SA) ──
  ('b1000000-0000-0000-0000-000000000070', 'a1000000-0000-0000-0000-000000000007', 'Hot Kitchen',      1),
  ('b1000000-0000-0000-0000-000000000071', 'a1000000-0000-0000-0000-000000000007', 'Breakfast',        2),
  ('b1000000-0000-0000-0000-000000000072', 'a1000000-0000-0000-0000-000000000007', 'Pastry',           3),
  ('b1000000-0000-0000-0000-000000000073', 'a1000000-0000-0000-0000-000000000007', 'Sauces',           4),
  ('b1000000-0000-0000-0000-000000000074', 'a1000000-0000-0000-0000-000000000007', 'Prep',             5),
  ('b1000000-0000-0000-0000-000000000075', 'a1000000-0000-0000-0000-000000000007', 'Specials',         6),
  ('b1000000-0000-0000-0000-000000000102', 'a1000000-0000-0000-0000-000000000007', 'Pizza',            7),
  ('b1000000-0000-0000-0000-000000000103', 'a1000000-0000-0000-0000-000000000007', 'Cold Kitchen',     8),
  ('b1000000-0000-0000-0000-000000000104', 'a1000000-0000-0000-0000-000000000007', 'Desserts',         9),
  ('b1000000-0000-0000-0000-000000000105', 'a1000000-0000-0000-0000-000000000007', 'Beverages',        10),
  ('b1000000-0000-0000-0000-000000000106', 'a1000000-0000-0000-0000-000000000007', 'Basic Recipes',    11),
  ('b1000000-0000-0000-0000-000000000118', 'a1000000-0000-0000-0000-000000000007', 'Ramadan',          12);


-- =============================================================================
-- INGREDIENT MASTER — starter set extracted from visible Excel screenshots
-- (expand this as recipes are imported — duplicates flagged automatically)
-- =============================================================================

insert into public.ingredient_master (canonical_name, category, default_unit, aliases, is_reviewed) values
  ('Greek yoghurt',            'dairy',            'gr',   array['Greek yogurt','Yogurt Greek','Yogurt, Greek'], true),
  ('Cucumbers, Lebanese',      'vegetables',       'gr',   array['Lebanese cucumber','cucumber ordinary Lebanese'], true),
  ('Apple cider vinegar',      'sauces_condiments','gr',   array['ACV','apple cider vin'], true),
  ('Lemon juice',              'fruits',           'gr',   array['lemon juice fresh','fresh lemon juice'], true),
  ('Extra virgin olive oil',   'oils_fats',        'gr',   array['EVOO','olive oil extra virgin','Olive oil, extra virgin'], true),
  ('Salt',                     'herbs_spices',     'gr',   array['sea salt','table salt','fine salt'], true),
  ('Black pepper',             'herbs_spices',     'gr',   array['ground black pepper','pepper black'], true),
  ('Eggs',                     'proteins',         'each', array['egg','whole egg','large eggs'], true),
  ('Bresaola',                 'proteins',         'gr',   array['bresaola beef','beef bresaola'], true),
  ('Chili oil',                'oils_fats',        'gr',   array['chilli oil','chili infused oil'], true),
  ('Herb oil',                 'oils_fats',        'gr',   array['green herb oil'], true),
  ('Arugula',                  'vegetables',       'gr',   array['rocket','rocket arugula','Rocket / Arugula'], true),
  ('Vanilla bean',             'herbs_spices',     'each', array['vanilla pod','vanilla'], false),
  ('Whole milk',               'dairy',            'ml',   array['full fat milk','milk whole'], false),
  ('Egg yolk',                 'proteins',         'each', array['yolks','egg yolks'], false),
  ('Caster sugar',             'dry_goods',        'gr',   array['sugar caster','fine sugar','white sugar'], false),
  ('Heavy cream',              'dairy',            'ml',   array['double cream','whipping cream','cream heavy'], false),
  ('Croissant',                'bakery',           'each', array['butter croissant'], false),
  ('Unsalted butter',          'dairy',            'gr',   array['butter unsalted','butter'], false),
  ('Maple syrup',              'sauces_condiments','ml',   array['maple'], false),
  ('Strawberries',             'fruits',           'gr',   array['fresh strawberries','strawberry'], false),
  ('Halloumi',                 'dairy',            'gr',   array['halloumi cheese'], false),
  ('Tomatoes',                 'vegetables',       'gr',   array['fresh tomatoes','tomato'], false),
  ('Pide dough',               'bakery',           'gr',   array['pide ajeen','ajeen dough'], false),
  ('Za''atar',                 'herbs_spices',     'gr',   array['zaatar','za''atar blend'], false),
  ('Labneh',                   'dairy',            'gr',   array['strained yoghurt','labne'], false),
  ('Pesto',                    'sauces_condiments','gr',   array['basil pesto','green pesto'], false),
  ('Granola',                  'dry_goods',        'gr',   array['homemade granola','oat granola'], false),
  ('Vanilla yoghurt',          'dairy',            'gr',   array['yogurt vanilla','vanilla yogurt'], false),
  ('Pancake batter',           'bakery',           'gr',   array['pancake mix'], false),
  ('Mixed berries',            'fruits',           'gr',   array['berries mixed','forest berries'], false),
  ('Kimchi',                   'vegetables',       'gr',   array['kimchee'], false),
  ('Braised beef',             'proteins',         'gr',   array['beef braised','slow cooked beef'], false),
  ('Jasmine rice',             'dry_goods',        'gr',   array['rice jasmine','white rice'], false),
  ('Mustard',                  'sauces_condiments','gr',   array['dijon mustard','wholegrain mustard'], false),
  ('Omelette eggs',            'proteins',         'each', array['eggs for omelette'], false),
  ('Panna cotta base',         'dairy',            'gr',   array['panna cotta mix'], false),
  ('Raspberry coulis',         'fruits',           'ml',   array['raspberry sauce','coulis raspberry'], false);


-- =============================================================================
-- VERIFICATION QUERIES (run after seed to confirm)
-- =============================================================================

-- select count(*) as venue_count from public.venues;                -- expect 8
-- select count(*) as section_count from public.sections;            -- expect 92
-- select count(*) as ingredient_count from public.ingredient_master; -- expect 38

-- select name, country_code, vat_rate, venue_type, sort_order
-- from public.venues order by sort_order;

-- select v.name as venue, s.name as section, s.sort_order
-- from public.sections s
-- join public.venues v on v.id = s.venue_id
-- order by v.sort_order, s.sort_order;
