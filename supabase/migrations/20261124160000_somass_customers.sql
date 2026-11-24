-- SO-MASS private customer workspaces, v1.
-- Apply as the Supabase migration owner/postgres, never from the browser.
-- Existing IndexedDB records are untouched. This migration inserts no customers.
BEGIN;

CREATE SCHEMA IF NOT EXISTS somass_private;
REVOKE ALL ON SCHEMA somass_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION somass_private.customer_uid()
RETURNS uuid LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR (auth.jwt() ->> 'is_anonymous') = 'true' THEN
    RAISE EXCEPTION USING ERRCODE = 'PT401', MESSAGE = 'authentication-required';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION somass_private.customer_name(p_name text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_name text;
BEGIN
  v_name := pg_catalog.normalize(pg_catalog.btrim(pg_catalog.regexp_replace(p_name, '[[:space:]]+', ' ', 'g')), 'NFC');
  IF v_name IS NULL OR pg_catalog.char_length(v_name) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Customer name must contain 1–100 characters.';
  END IF;
  RETURN v_name;
END;
$$;

CREATE OR REPLACE FUNCTION somass_private.customer_name_key(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT pg_catalog.lower(pg_catalog.translate(somass_private.customer_name(p_name), 'IİÇĞÖŞÜ', 'ıiçğöşü'));
$$;

CREATE OR REPLACE FUNCTION somass_private.customer_snapshot(p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_model jsonb; v_private jsonb; v_rooms jsonb; v_room jsonb;
  v_layout jsonb; v_item jsonb; v_id text; v_item_key text; v_key text;
  v_ids text[] := ARRAY[]::text[]; v_item_keys text[];
  v_layouts jsonb := '{}'::jsonb; v_variants jsonb := '{}'::jsonb;
  v_styles jsonb := '{}'::jsonb; v_selected text; v_zoom numeric := 1;
BEGIN
  IF p_snapshot IS NULL OR pg_catalog.jsonb_typeof(p_snapshot) <> 'object'
     OR pg_catalog.octet_length(p_snapshot::text) > 2000000 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid snapshot or snapshot exceeds 2 MB.';
  END IF;
  v_model := p_snapshot -> 'modelContent';
  v_private := p_snapshot -> 'privateContent';
  IF v_model IS NULL OR pg_catalog.jsonb_typeof(v_model) <> 'object'
     OR (v_model -> 'version') IS DISTINCT FROM '15'::jsonb
     OR pg_catalog.jsonb_typeof(v_model -> 'customRooms') IS DISTINCT FROM 'array'
     OR pg_catalog.jsonb_typeof(v_model -> 'layouts') IS DISTINCT FROM 'object'
     OR pg_catalog.jsonb_typeof(v_model -> 'variants') IS DISTINCT FROM 'object'
     OR pg_catalog.jsonb_array_length(v_model -> 'customRooms') > 8 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'A version 15 workspace with at most eight custom rooms is required.';
  END IF;
  IF v_private IS NULL THEN v_private := '{}'::jsonb; END IF;
  IF pg_catalog.jsonb_typeof(v_private) <> 'object'
     OR (v_model ? 'roomStyles' AND pg_catalog.jsonb_typeof(v_model -> 'roomStyles') <> 'object') THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid workspace settings.';
  END IF;
  v_rooms := v_model -> 'customRooms';
  FOR v_room IN SELECT value FROM pg_catalog.jsonb_array_elements(v_rooms) LOOP
    v_id := v_room ->> 'id';
    IF pg_catalog.jsonb_typeof(v_room) <> 'object' OR v_id IS NULL
       OR v_id !~ '^custom_[a-zA-Z0-9_-]{1,73}$' OR v_id = ANY(v_ids)
       OR pg_catalog.jsonb_typeof(v_room -> 'name') IS DISTINCT FROM 'string'
       OR pg_catalog.char_length(v_room ->> 'name') NOT BETWEEN 1 AND 50
       OR pg_catalog.btrim(v_room ->> 'name') = '' THEN
      RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid or repeated custom room identity.';
    END IF;
    FOREACH v_key IN ARRAY ARRAY['width','depth','height'] LOOP
      IF pg_catalog.jsonb_typeof(v_room -> v_key) IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Room dimensions must be finite positive numbers.';
      END IF;
      IF (v_room ->> v_key)::numeric <= 0 OR (v_room ->> v_key)::numeric > 10000 THEN
        RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Room dimensions are outside the supported range.';
      END IF;
    END LOOP;
    v_ids := pg_catalog.array_append(v_ids, v_id);
    v_layout := v_model -> 'layouts' -> v_id;
    IF pg_catalog.jsonb_typeof(v_layout) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Each room must have a product layout.';
    END IF;
    IF pg_catalog.jsonb_array_length(v_layout) > 35
       OR (v_model -> 'variants' ->> v_id) IS NULL
       OR (v_model -> 'variants' ->> v_id) NOT IN ('custom','room_empty') THEN
      RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid room variant or more than 35 products in one room.';
    END IF;
    v_item_keys := ARRAY[]::text[];
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(v_layout) LOOP
      v_item_key := v_item ->> 'key';
      IF pg_catalog.jsonb_typeof(v_item) <> 'object'
         OR pg_catalog.jsonb_typeof(v_item -> 'key') IS DISTINCT FROM 'string'
         OR v_item_key IS NULL OR pg_catalog.char_length(v_item_key) NOT BETWEEN 1 AND 80
         OR v_item_key = ANY(v_item_keys)
         OR pg_catalog.jsonb_typeof(v_item -> 'p') IS DISTINCT FROM 'string'
         OR pg_catalog.char_length(v_item ->> 'p') NOT BETWEEN 1 AND 160
         OR (v_item ->> 'head') IS NULL OR (v_item ->> 'head') NOT IN ('N','E','S','W')
         OR pg_catalog.jsonb_typeof(v_item -> 'x') IS DISTINCT FROM 'number'
         OR pg_catalog.jsonb_typeof(v_item -> 'y') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid or repeated product placement.';
      END IF;
      IF pg_catalog.abs((v_item ->> 'x')::numeric) > 10000 OR pg_catalog.abs((v_item ->> 'y')::numeric) > 10000 THEN
        RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Product position is outside the supported range.';
      END IF;
      v_item_keys := pg_catalog.array_append(v_item_keys, v_item_key);
    END LOOP;
    v_layouts := v_layouts || pg_catalog.jsonb_build_object(v_id, v_layout);
    v_variants := v_variants || pg_catalog.jsonb_build_object(v_id, v_model -> 'variants' -> v_id);
    IF (v_model -> 'roomStyles') ? v_id THEN
      v_styles := v_styles || pg_catalog.jsonb_build_object(v_id, v_model -> 'roomStyles' -> v_id);
    END IF;
  END LOOP;
  v_selected := v_model ->> 'room';
  IF v_selected IS NULL OR NOT (v_selected = ANY(v_ids)) THEN v_selected := v_ids[1]; END IF;
  IF pg_catalog.jsonb_typeof(v_private -> 'zoom') = 'number' THEN
    v_zoom := GREATEST(.65, LEAST(2.5, (v_private ->> 'zoom')::numeric));
  END IF;
  -- Only custom room layouts survive; old client presets/extra private payloads
  -- cannot be accidentally uploaded by a legacy snapshot.
  RETURN pg_catalog.jsonb_build_object(
    'modelContent', pg_catalog.jsonb_build_object(
      'version', 15, 'finish', CASE WHEN pg_catalog.jsonb_typeof(v_model -> 'finish') = 'string' THEN v_model ->> 'finish' ELSE 'Natürel Meşe' END,
      'room', v_selected, 'customRooms', v_rooms, 'layouts', v_layouts, 'variants', v_variants, 'roomStyles', v_styles),
    'privateContent', pg_catalog.jsonb_build_object(
      'dims', (v_private -> 'dims') IS DISTINCT FROM 'false'::jsonb,
      'labels', (v_private -> 'labels') IS DISTINCT FROM 'false'::jsonb,
      'openings', (v_private -> 'openings') IS NOT DISTINCT FROM 'true'::jsonb,
      'raw', (v_private -> 'raw') IS NOT DISTINCT FROM 'true'::jsonb,
      'zoom', v_zoom, 'wardBudget', (v_private -> 'wardBudget') IS DISTINCT FROM 'false'::jsonb));
END;
$$;

CREATE TABLE IF NOT EXISTS public.somass_customers (
  id text PRIMARY KEY CHECK (id ~ '^customer_[a-zA-Z0-9_-]{1,100}$'),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 100),
  name_key text GENERATED ALWAYS AS (somass_private.customer_name_key(name)) STORED,
  snapshot jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(snapshot) = 'object' AND pg_catalog.octet_length(snapshot::text) <= 2000000),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  archived_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS somass_customers_active_name_per_owner
  ON public.somass_customers(owner_id, name_key) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS somass_customers_owner_updated
  ON public.somass_customers(owner_id, updated_at DESC);

ALTER TABLE public.somass_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS somass_customers_owner_select ON public.somass_customers;
CREATE POLICY somass_customers_owner_select ON public.somass_customers
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = owner_id
    AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');

-- Browser roles may read their own rows. All writes require the checked RPCs.
REVOKE ALL ON TABLE public.somass_customers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.somass_customers TO authenticated;

CREATE OR REPLACE FUNCTION somass_private.customer_change(
  p_id text, p_expected_revision bigint, p_mode text,
  p_snapshot jsonb DEFAULT NULL, p_name text DEFAULT NULL)
RETURNS SETOF public.somass_customers LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_uid uuid := somass_private.customer_uid(); v_row public.somass_customers%ROWTYPE;
  v_snapshot jsonb; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT401', MESSAGE = 'authentication-required'; END IF;
  IF p_id IS NULL OR p_id !~ '^customer_[a-zA-Z0-9_-]{1,100}$'
     OR p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 1 AND 9007199254740990 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid customer identity or expected revision.';
  END IF;
  IF p_mode NOT IN ('update','archive','restore') OR p_mode IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid customer operation.';
  END IF;
  -- Owner predicate applies even though the outer RPC is SECURITY DEFINER.
  -- Lock before checking revision: two devices cannot both replace revision N.
  SELECT c.* INTO v_row FROM public.somass_customers AS c
    WHERE c.id = p_id AND c.owner_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PT404', MESSAGE = 'not-found'; END IF;
  IF v_row.revision <> p_expected_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'conflict', DETAIL = 'Customer revision changed; reload or save a separate copy.';
  END IF;
  IF p_mode = 'update' THEN
    IF v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'archived'; END IF;
    v_snapshot := somass_private.customer_snapshot(p_snapshot);
    v_name := CASE WHEN p_name IS NULL THEN v_row.name ELSE somass_private.customer_name(p_name) END;
  ELSE
    IF p_mode = 'archive' AND v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'archived'; END IF;
    IF p_mode = 'restore' AND v_row.archived_at IS NULL THEN
      RETURN NEXT v_row; RETURN; -- Repeated restore is a no-op with the current revision.
    END IF;
    v_snapshot := v_row.snapshot; v_name := v_row.name;
  END IF;
  UPDATE public.somass_customers AS c SET
    name = v_name, snapshot = v_snapshot, revision = v_row.revision + 1,
    updated_at = pg_catalog.clock_timestamp(),
    archived_at = CASE p_mode WHEN 'archive' THEN pg_catalog.clock_timestamp() WHEN 'restore' THEN NULL ELSE v_row.archived_at END
    WHERE c.id = p_id AND c.owner_id = v_uid AND c.revision = p_expected_revision
    RETURNING c.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'conflict'; END IF;
  RETURN NEXT v_row;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'duplicate-name';
END;
$$;

CREATE OR REPLACE FUNCTION public.somass_customer_create(
  p_name text, p_snapshot jsonb, p_id text DEFAULT NULL)
RETURNS SETOF public.somass_customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := somass_private.customer_uid(); v_id text; v_name text; v_snapshot jsonb;
  v_row public.somass_customers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT401', MESSAGE = 'authentication-required'; END IF;
  v_id := COALESCE(p_id, 'customer_' || pg_catalog.gen_random_uuid()::text);
  IF v_id !~ '^customer_[a-zA-Z0-9_-]{1,100}$' THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation', DETAIL = 'Invalid customer identity.';
  END IF;
  v_name := somass_private.customer_name(p_name);
  v_snapshot := somass_private.customer_snapshot(p_snapshot);
  INSERT INTO public.somass_customers (id,owner_id,name,snapshot)
    VALUES (v_id,v_uid,v_name,v_snapshot)
    ON CONFLICT (id) DO NOTHING RETURNING * INTO v_row;
  IF FOUND THEN RETURN NEXT v_row; RETURN; END IF;
  SELECT c.* INTO v_row FROM public.somass_customers AS c WHERE c.id = v_id AND c.owner_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PT404', MESSAGE = 'not-found'; END IF;
  -- A lost network response can safely retry the same client-generated ID.
  IF v_row.name = v_name AND v_row.snapshot = v_snapshot THEN RETURN NEXT v_row; RETURN; END IF;
  RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'id-conflict';
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'duplicate-name';
END;
$$;

CREATE OR REPLACE FUNCTION public.somass_customer_update(
  p_id text, p_expected_revision bigint, p_snapshot jsonb, p_name text DEFAULT NULL)
RETURNS SETOF public.somass_customers LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT * FROM somass_private.customer_change(p_id,p_expected_revision,'update',p_snapshot,p_name);
$$;

CREATE OR REPLACE FUNCTION public.somass_customer_archive(
  p_id text, p_expected_revision bigint, p_archived boolean DEFAULT true)
RETURNS SETOF public.somass_customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_archived IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation'; END IF;
  RETURN QUERY SELECT * FROM somass_private.customer_change(p_id,p_expected_revision,
    CASE WHEN p_archived THEN 'archive' ELSE 'restore' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.somass_customer_restore(p_id text, p_expected_revision bigint)
RETURNS SETOF public.somass_customers LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT * FROM somass_private.customer_change(p_id,p_expected_revision,'restore');
$$;

-- Do not change unrelated application functions or global default privileges.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA somass_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.somass_customer_create(text,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.somass_customer_update(text,bigint,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.somass_customer_archive(text,bigint,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.somass_customer_restore(text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.somass_customer_create(text,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.somass_customer_update(text,bigint,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.somass_customer_archive(text,bigint,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.somass_customer_restore(text,bigint) TO authenticated;

COMMENT ON TABLE public.somass_customers IS 'Private per-account SO-MASS customer workspaces. Public website visitors cannot access records. Local records migrate only by explicit user action.';
COMMIT;
