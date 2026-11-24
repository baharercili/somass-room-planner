-- Explicitly public shared workspace, separate from private/local customers.
-- Anyone using the public application/API can read and edit these NEW rows.
-- The fixed workspace UUID is an identity, NOT a secret or an authorization key.
-- Existing public.somass_customers, its policies/functions and rows are untouched.
BEGIN;

DO $$
BEGIN
  IF pg_catalog.to_regprocedure('somass_private.customer_name(text)') IS NULL
     OR pg_catalog.to_regprocedure('somass_private.customer_name_key(text)') IS NULL
     OR pg_catalog.to_regprocedure('somass_private.customer_snapshot(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261124_somass_customers.sql before the shared workspace migration.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION somass_private.shared_payload_bytes(p_id text,p_name text,p_snapshot jsonb)
RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT (pg_catalog.octet_length(p_id)::bigint + pg_catalog.octet_length(p_name)::bigint
    + pg_catalog.octet_length(p_snapshot::text)::bigint);
$$;

CREATE TABLE IF NOT EXISTS public.somass_shared_customers (
  id text PRIMARY KEY CHECK (id ~ '^customer_[a-zA-Z0-9_-]{1,100}$'),
  workspace_id uuid NOT NULL CHECK (workspace_id = '5248c66f-a4bc-43df-906b-656960e5ce47'::uuid),
  name text NOT NULL CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 100),
  name_key text GENERATED ALWAYS AS (somass_private.customer_name_key(name)) STORED,
  snapshot jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(snapshot) = 'object'
    AND pg_catalog.octet_length(snapshot::text) <= 2000000),
  payload_bytes bigint GENERATED ALWAYS AS (somass_private.shared_payload_bytes(id,name,snapshot)) STORED,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  archived_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS somass_shared_customers_active_name
  ON public.somass_shared_customers(workspace_id,name_key) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS somass_shared_customers_workspace_updated
  ON public.somass_shared_customers(workspace_id,updated_at DESC);

ALTER TABLE public.somass_shared_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS somass_shared_customers_fixed_workspace_read ON public.somass_shared_customers;
CREATE POLICY somass_shared_customers_fixed_workspace_read ON public.somass_shared_customers
  FOR SELECT TO anon,authenticated
  USING (workspace_id = '5248c66f-a4bc-43df-906b-656960e5ce47'::uuid);
REVOKE ALL ON TABLE public.somass_shared_customers FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.somass_shared_customers TO anon,authenticated;

-- One bounded counter row; no IP addresses, user details or request history.
-- This caps committed mutations, not reads, invalid requests or network abuse.
CREATE TABLE IF NOT EXISTS somass_private.shared_mutation_limits (
  workspace_id uuid PRIMARY KEY CHECK (workspace_id = '5248c66f-a4bc-43df-906b-656960e5ce47'::uuid),
  minute_started timestamptz NOT NULL,
  committed_mutations integer NOT NULL CHECK (committed_mutations BETWEEN 0 AND 600)
);
REVOKE ALL ON TABLE somass_private.shared_mutation_limits FROM PUBLIC,anon,authenticated;
ALTER TABLE somass_private.shared_mutation_limits ENABLE ROW LEVEL SECURITY;
INSERT INTO somass_private.shared_mutation_limits(workspace_id,minute_started,committed_mutations)
  VALUES ('5248c66f-a4bc-43df-906b-656960e5ce47'::uuid,
    pg_catalog.date_trunc('minute',pg_catalog.clock_timestamp()),0)
  ON CONFLICT(workspace_id) DO NOTHING;

CREATE OR REPLACE FUNCTION somass_private.shared_workspace_lock(p_workspace_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF p_workspace_id IS DISTINCT FROM '5248c66f-a4bc-43df-906b-656960e5ce47'::uuid THEN
    RAISE EXCEPTION USING ERRCODE = 'PT404', MESSAGE = 'workspace-not-found';
  END IF;
  -- A fixed namespaced transaction lock serializes all public writes and quotas.
  PERFORM pg_catalog.pg_advisory_xact_lock(1463895115,16045);
END;
$$;

CREATE OR REPLACE FUNCTION somass_private.shared_storage_budget(
  p_workspace_id uuid,p_record_delta integer,p_payload_delta bigint)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_records bigint;v_bytes numeric;
BEGIN
  PERFORM somass_private.shared_workspace_lock(p_workspace_id);
  SELECT pg_catalog.count(*),COALESCE(pg_catalog.sum(c.payload_bytes),0)
    INTO v_records,v_bytes FROM public.somass_shared_customers AS c
    WHERE c.workspace_id = p_workspace_id;
  IF v_records + p_record_delta > 1000 OR v_bytes + p_payload_delta > 104857600 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT429', MESSAGE = 'workspace-storage-limit',
      DETAIL = 'Shared workspace limit: 1000 records and 100 MiB serialized payload, including archives.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION somass_private.shared_mutation_slot(p_workspace_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_minute timestamptz := pg_catalog.date_trunc('minute',pg_catalog.clock_timestamp());
BEGIN
  PERFORM somass_private.shared_workspace_lock(p_workspace_id);
  UPDATE somass_private.shared_mutation_limits AS q SET
    minute_started = v_minute,
    committed_mutations = CASE WHEN q.minute_started = v_minute THEN q.committed_mutations + 1 ELSE 1 END
    WHERE q.workspace_id = p_workspace_id
      AND (q.minute_started <> v_minute OR q.committed_mutations < 600);
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'PT429', MESSAGE = 'workspace-rate-limit',
      DETAIL = 'Shared workspace limit: 600 committed changes per server minute. Retry later; retain the local draft.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION somass_private.shared_customer_change(
  p_workspace_id uuid,p_id text,p_expected_revision bigint,p_mode text,
  p_snapshot jsonb DEFAULT NULL,p_name text DEFAULT NULL)
RETURNS SETOF public.somass_shared_customers LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_row public.somass_shared_customers%ROWTYPE;v_snapshot jsonb;v_name text;
  v_next_bytes bigint;
BEGIN
  PERFORM somass_private.shared_workspace_lock(p_workspace_id);
  IF p_id IS NULL OR p_id !~ '^customer_[a-zA-Z0-9_-]{1,100}$'
     OR p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 1 AND 9007199254740990
     OR p_mode IS NULL OR p_mode NOT IN ('update','archive','restore') THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation';
  END IF;
  SELECT c.* INTO v_row FROM public.somass_shared_customers AS c
    WHERE c.workspace_id = p_workspace_id AND c.id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PT404', MESSAGE = 'not-found'; END IF;
  IF v_row.revision <> p_expected_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'conflict',
      DETAIL = 'Another browser saved a newer revision. Reload it or save a separate copy.';
  END IF;
  IF p_mode = 'update' THEN
    IF v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'archived'; END IF;
    v_snapshot := somass_private.customer_snapshot(p_snapshot);
    v_name := CASE WHEN p_name IS NULL THEN v_row.name ELSE somass_private.customer_name(p_name) END;
  ELSE
    IF p_mode = 'archive' AND v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'archived'; END IF;
    IF p_mode = 'restore' AND v_row.archived_at IS NULL THEN RETURN NEXT v_row;RETURN; END IF;
    v_snapshot := v_row.snapshot;v_name := v_row.name;
  END IF;
  v_next_bytes := somass_private.shared_payload_bytes(p_id,v_name,v_snapshot);
  PERFORM somass_private.shared_storage_budget(p_workspace_id,0,v_next_bytes-v_row.payload_bytes);
  PERFORM somass_private.shared_mutation_slot(p_workspace_id);
  UPDATE public.somass_shared_customers AS c SET
    name=v_name,snapshot=v_snapshot,revision=v_row.revision+1,
    updated_at=pg_catalog.clock_timestamp(),
    archived_at=CASE p_mode WHEN 'archive' THEN pg_catalog.clock_timestamp() WHEN 'restore' THEN NULL ELSE v_row.archived_at END
    WHERE c.workspace_id=p_workspace_id AND c.id=p_id AND c.revision=p_expected_revision
    RETURNING c.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'conflict'; END IF;
  RETURN NEXT v_row;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'duplicate-name';
END;
$$;

CREATE OR REPLACE FUNCTION public.somass_shared_customer_create(
  p_workspace_id uuid,p_name text,p_snapshot jsonb,p_id text DEFAULT NULL)
RETURNS SETOF public.somass_shared_customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id text;v_name text;v_snapshot jsonb;v_row public.somass_shared_customers%ROWTYPE;
BEGIN
  PERFORM somass_private.shared_workspace_lock(p_workspace_id);
  v_id := COALESCE(p_id,'customer_'||pg_catalog.gen_random_uuid()::text);
  IF v_id !~ '^customer_[a-zA-Z0-9_-]{1,100}$' THEN
    RAISE EXCEPTION USING ERRCODE = 'PT422', MESSAGE = 'validation';
  END IF;
  v_name := somass_private.customer_name(p_name);
  v_snapshot := somass_private.customer_snapshot(p_snapshot);
  SELECT c.* INTO v_row FROM public.somass_shared_customers AS c
    WHERE c.workspace_id=p_workspace_id AND c.id=v_id;
  IF FOUND THEN
    IF v_row.name=v_name AND v_row.snapshot=v_snapshot THEN RETURN NEXT v_row;RETURN; END IF;
    RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'id-conflict';
  END IF;
  PERFORM somass_private.shared_storage_budget(p_workspace_id,1,
    somass_private.shared_payload_bytes(v_id,v_name,v_snapshot));
  PERFORM somass_private.shared_mutation_slot(p_workspace_id);
  INSERT INTO public.somass_shared_customers(id,workspace_id,name,snapshot)
    VALUES(v_id,p_workspace_id,v_name,v_snapshot) RETURNING * INTO v_row;
  RETURN NEXT v_row;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'duplicate-name';
END;
$$;

CREATE OR REPLACE FUNCTION public.somass_shared_customer_update(
  p_workspace_id uuid,p_id text,p_expected_revision bigint,p_snapshot jsonb,p_name text DEFAULT NULL)
RETURNS SETOF public.somass_shared_customers LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT * FROM somass_private.shared_customer_change(p_workspace_id,p_id,p_expected_revision,'update',p_snapshot,p_name);
$$;

CREATE OR REPLACE FUNCTION public.somass_shared_customer_archive(
  p_workspace_id uuid,p_id text,p_expected_revision bigint,p_archived boolean DEFAULT true)
RETURNS SETOF public.somass_shared_customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_archived IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT422',MESSAGE='validation'; END IF;
  RETURN QUERY SELECT * FROM somass_private.shared_customer_change(p_workspace_id,p_id,p_expected_revision,
    CASE WHEN p_archived THEN 'archive' ELSE 'restore' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.somass_shared_customer_restore(
  p_workspace_id uuid,p_id text,p_expected_revision bigint)
RETURNS SETOF public.somass_shared_customers LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT * FROM somass_private.shared_customer_change(p_workspace_id,p_id,p_expected_revision,'restore');
$$;

-- Revoke only NEW helper grants; do not alter the private customer feature.
REVOKE ALL ON FUNCTION somass_private.shared_payload_bytes(text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION somass_private.shared_workspace_lock(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION somass_private.shared_storage_budget(uuid,integer,bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION somass_private.shared_mutation_slot(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION somass_private.shared_customer_change(uuid,text,bigint,text,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.somass_shared_customer_create(uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.somass_shared_customer_update(uuid,text,bigint,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.somass_shared_customer_archive(uuid,text,bigint,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.somass_shared_customer_restore(uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.somass_shared_customer_create(uuid,text,jsonb,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.somass_shared_customer_update(uuid,text,bigint,jsonb,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.somass_shared_customer_archive(uuid,text,bigint,boolean) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.somass_shared_customer_restore(uuid,text,bigint) TO anon,authenticated;

COMMENT ON TABLE public.somass_shared_customers IS 'Explicitly public SO-MASS shared workspace. Anyone with application/API access can read and edit these rows. Existing private/local records are not copied here. Fixed workspace UUID is not a secret.';
COMMIT;
