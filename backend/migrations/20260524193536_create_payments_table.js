exports.up = function(knex) {

  return knex.schema.createTable('payments', (table) => {

    table.increments('id').primary()

    table
      .integer('order_id')
      .unsigned()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE')

    table.decimal('amount', 10, 2)
      .notNullable()

    table.string('payment_method')
      .notNullable()

    table.string('transaction_id')

    table.enu('status', [
      'pending',
      'completed',
      'failed'
    ]).defaultTo('pending')

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {

  return knex.schema.dropTable('payments')
}