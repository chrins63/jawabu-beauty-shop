exports.up = function (knex) {
  return knex.schema.alterTable('orders', (table) => {

    table
      .string('payment_status')
      .notNullable()
      .defaultTo('pending')

    table.string('payment_method')

    table.string('transaction_id')

    table.text('notes')

    table
      .integer('updated_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')

  })
}

exports.down = function (knex) {
  return knex.schema.alterTable('orders', (table) => {

    table.dropColumn('payment_status')

    table.dropColumn('payment_method')

    table.dropColumn('transaction_id')

    table.dropColumn('notes')

    table.dropColumn('updated_by')

  })
}