exports.up = function(knex) {

  return knex.schema.createTable('wishlists', (table) => {

    table.increments('id').primary()

    table
      .integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    table
      .integer('product_id')
      .unsigned()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE')

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {

  return knex.schema.dropTable('wishlists')
}