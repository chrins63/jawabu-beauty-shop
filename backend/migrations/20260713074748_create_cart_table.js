exports.up = function (knex) {
  return knex.schema.createTable('cart', (table) => {

    table.increments('id').primary();

    table.integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .unique();

    table.timestamps(true, true);

  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('cart');
};