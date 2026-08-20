exports.up = function(knex) {
  return knex.schema.createTable('orders', (table) => {

    table.increments('id').primary()

    table
      .integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    table.timestamp('order_date')
      .defaultTo(knex.fn.now())

    table.decimal('total_amount', 10, 2)
      .notNullable()

    table
      .enu('status', [
        'pending',
        'paid',
        'shipped',
        'delivered',
        'cancelled'
      ])
      .defaultTo('pending')

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('orders')
}