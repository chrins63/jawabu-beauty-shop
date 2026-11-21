# Supabase

The shop database is the hosted project `jawabu-beauty-shop`.

[schema.sql](schema.sql) is a snapshot of the live `public` tables and constraints, taken on 21 November 2026. Use it to see the current shape of the database. Do not run it on the existing project, and do not replay [migrations](migrations) on top of a database restored from that snapshot. Those migration files are the incremental history already applied there.

Functions, row level security policies, and triggers are not fully copied into `schema.sql`. They remain on the live database.

The Express app in `backend/` is an old API. It is not connected to this database. See [backend/README.md](../backend/README.md).
