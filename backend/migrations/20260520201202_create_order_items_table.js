exports.up = function(knex) {
  return knex.schema.createTable('order_items', (table) => {

    table.increments('id').primary()

    table
      .integer('order_id')
      .unsigned()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE')

    table
      .integer('product_id')
      .unsigned()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE')

    table.integer('quantity')
      .notNullable()

    table.decimal('price_at_purchase', 10, 2)
      .notNullable()

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('order_items')
}