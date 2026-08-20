exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE orders
    DROP CONSTRAINT orders_status_check;
  `)

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'paid',
        'processing',
        'ready_for_pickup',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      )
    );
  `)
}

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE orders
    DROP CONSTRAINT orders_status_check;
  `)

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (
      status IN (
        'pending',
        'paid',
        'shipped',
        'delivered',
        'cancelled'
      )
    );
  `)
}