exports.seed = async function(knex) {
  // Clear existing data
  await knex('ingredient_groups').del();
  
  // Insert common ingredient groups
  await knex('ingredient_groups').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Eggs',
      strip_modifiers: JSON.stringify(['brown', 'white', 'large', 'medium', 'small', 'organic', 'free-range', 'cage-free']),
      keep_distinctions: JSON.stringify([]),
      usage_count: 100
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Milk',
      strip_modifiers: JSON.stringify(['organic', 'fresh', 'cold']),
      keep_distinctions: JSON.stringify(['whole', 'skim', '2%', 'low-fat', 'almond', 'soy', 'oat']),
      usage_count: 100
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Butter',
      strip_modifiers: JSON.stringify(['salted', 'unsalted', 'organic']),
      keep_distinctions: JSON.stringify([]),
      usage_count: 80
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Chicken',
      strip_modifiers: JSON.stringify(['fresh', 'frozen', 'organic', 'free-range']),
      keep_distinctions: JSON.stringify(['breast', 'thigh', 'wing', 'drumstick', 'ground']),
      usage_count: 90
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Beef',
      strip_modifiers: JSON.stringify(['fresh', 'frozen', 'organic', 'grass-fed']),
      keep_distinctions: JSON.stringify(['ground', 'steak', 'roast', 'stew']),
      usage_count: 85
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Cheese',
      strip_modifiers: JSON.stringify(['shredded', 'sliced', 'block', 'organic']),
      keep_distinctions: JSON.stringify(['cheddar', 'mozzarella', 'parmesan', 'swiss', 'feta']),
      usage_count: 75
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Bread',
      strip_modifiers: JSON.stringify(['fresh', 'sliced', 'organic']),
      keep_distinctions: JSON.stringify(['white', 'wheat', 'whole grain', 'sourdough', 'rye']),
      usage_count: 70
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Rice',
      strip_modifiers: JSON.stringify(['organic', 'instant', 'quick']),
      keep_distinctions: JSON.stringify(['white', 'brown', 'jasmine', 'basmati', 'wild']),
      usage_count: 80
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Tomatoes',
      strip_modifiers: JSON.stringify(['fresh', 'organic', 'ripe', 'large', 'small']),
      keep_distinctions: JSON.stringify(['cherry', 'grape', 'roma', 'canned', 'crushed', 'diced']),
      usage_count: 75
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Onions',
      strip_modifiers: JSON.stringify(['fresh', 'organic', 'large', 'medium', 'small']),
      keep_distinctions: JSON.stringify(['yellow', 'white', 'red', 'green', 'shallot']),
      usage_count: 80
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Potatoes',
      strip_modifiers: JSON.stringify(['fresh', 'organic', 'large', 'medium', 'small']),
      keep_distinctions: JSON.stringify(['russet', 'red', 'yukon gold', 'sweet']),
      usage_count: 75
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Flour',
      strip_modifiers: JSON.stringify(['organic', 'unbleached', 'bleached']),
      keep_distinctions: JSON.stringify(['all-purpose', 'bread', 'cake', 'whole wheat', 'almond']),
      usage_count: 70
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Sugar',
      strip_modifiers: JSON.stringify(['organic', 'pure', 'refined']),
      keep_distinctions: JSON.stringify(['white', 'brown', 'powdered', 'raw']),
      usage_count: 70
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Oil',
      strip_modifiers: JSON.stringify(['organic', 'extra virgin', 'virgin', 'pure']),
      keep_distinctions: JSON.stringify(['olive', 'vegetable', 'canola', 'coconut', 'avocado']),
      usage_count: 75
    },
    {
      id: knex.raw('gen_random_uuid()'),
      base_name: 'Pasta',
      strip_modifiers: JSON.stringify(['dried', 'fresh', 'organic']),
      keep_distinctions: JSON.stringify(['spaghetti', 'penne', 'fettuccine', 'macaroni', 'linguine']),
      usage_count: 70
    }
  ]);
};
