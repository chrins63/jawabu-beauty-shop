exports.up = function (knex) {

  return knex.schema.createTable('order_status_history', (table) => {

    table.increments('id').primary()

    table
      .integer('order_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE')

    table.string('status').notNullable()

    table
      .integer('changed_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')

    table.text('remarks')

    table.timestamps(true, true)

  })

}

exports.down = function (knex) {

  return knex.schema.dropTable('order_status_history')

}