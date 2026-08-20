exports.up = function(knex) {
  return knex.schema.createTable('services', (table) => {

    table.increments('id').primary()

    table.string('name').notNullable()

    table.text('description')

    table.integer('duration_minutes').notNullable()

    table.decimal('price', 10, 2).notNullable()

    table.string('image_url')

    table.timestamps(true, true)

  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('services')
}