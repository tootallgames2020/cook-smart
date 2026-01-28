exports.up = function(knex) {
  return knex.schema
    .createTable('ingredient_groups', function(table) {
      table.increments('id').primary();
      table.string('base_name').notNullable().unique(); // "Eggs", "Milk", etc.
      table.json('strip_modifiers').defaultTo('[]'); // ["brown", "white", "large", "small"]
      table.json('keep_distinctions').defaultTo('[]'); // ["whole", "skim"] for milk
      table.integer('usage_count').defaultTo(0); // community learning metric
      table.timestamps(true, true);
      
      table.index(['base_name']);
    })
    .createTable('ingredient_group_mappings', function(table) {
      table.increments('id').primary();
      table.string('ingredient_id').references('id').inTable('ingredients').onDelete('CASCADE');
      table.integer('group_id').references('id').inTable('ingredient_groups').onDelete('CASCADE');
      table.integer('confidence_score').defaultTo(100); // 0-100
      table.boolean('is_community_learned').defaultTo(false);
      table.timestamps(true, true);
      
      table.unique(['ingredient_id']);
      table.index(['group_id']);
    })
    .createTable('user_ingredient_preferences', function(table) {
      table.increments('id').primary();
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('ingredient_id').references('id').inTable('ingredients').onDelete('CASCADE');
      table.integer('group_id').references('id').inTable('ingredient_groups').onDelete('CASCADE').nullable();
      table.enum('action', ['merge', 'split']).notNullable();
      table.timestamps(true, true);
      
      table.unique(['user_id', 'ingredient_id']);
      table.index(['user_id']);
      table.index(['ingredient_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_ingredient_preferences')
    .dropTableIfExists('ingredient_group_mappings')
    .dropTableIfExists('ingredient_groups');
};
