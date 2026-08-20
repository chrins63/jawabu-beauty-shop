exports.up = function(knex) {
  return knex.schema.createTable('reviews', (table) => {

    table.increments('id').primary()

    table
      .integer('product_id')
      .unsigned()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE')

    table
      .integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    table.integer('rating')
      .notNullable()

    table.text('comment')

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('reviews')
}