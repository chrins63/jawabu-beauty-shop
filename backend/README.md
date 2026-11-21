# Legacy API — do not use

This Express and Knex API is not used by the storefront or the admin app. Both talk to Supabase.

Do not run these migrations against the Supabase database. The table names and auth model are different (`users` instead of Supabase Auth, `reviews` instead of `customer_reviews`, `categories` instead of `category`) and applying them would clash with the live shop.

The shop schema that should be reproduced is `supabase/schema.sql`, together with the SQL files in `supabase/migrations`.
