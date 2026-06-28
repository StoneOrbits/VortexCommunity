-- Clean up duplicate unique constraints created by repeated sequelize.sync({ alter: true })
-- Keeps the original constraint, drops the _key1 through _key18 duplicates.

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conname ~ '^(modes_dataHash_key|pattern_sets_dataHash_key|users_username_key)\d+$'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',
      CASE
        WHEN con.conname LIKE 'modes_%' THEN 'modes'
        WHEN con.conname LIKE 'pattern_sets_%' THEN 'pattern_sets'
        WHEN con.conname LIKE 'users_%' THEN 'users'
      END,
      con.conname
    );
  END LOOP;
END $$;
