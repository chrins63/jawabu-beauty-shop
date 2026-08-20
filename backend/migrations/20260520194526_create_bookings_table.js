exports.up = function(knex) {
  return knex.schema.createTable('bookings', (table) => {

    table.increments('id').primary()

    table.integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    table.integer('service_id')
      .unsigned()
      .references('id')
      .inTable('services')
      .onDelete('CASCADE')

    table.date('booking_date').notNullable()

    table.time('start_time').notNullable()

    table.time('end_time').notNullable()

    table.enu('status', [
      'pending',
      'confirmed',
      'completed',
      'cancelled'
    ]).defaultTo('pending')

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('bookings')
}