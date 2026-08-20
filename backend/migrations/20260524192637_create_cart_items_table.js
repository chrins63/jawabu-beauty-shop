exports.up = function (knex) {
  return knex.schema.createTable('cart_items', (table) => {

    table.increments('id').primary();

    table.integer('cart_id')
      .unsigned()
      .references('id')
      .inTable('cart')
      .onDelete('CASCADE');

    table.integer('product_id')
      .unsigned()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');

    table.integer('quantity')
      .notNullable()
      .defaultTo(1);

    table.timestamps(true, true);

    table.unique(['cart_id', 'product_id']);

  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('cart_items');
};