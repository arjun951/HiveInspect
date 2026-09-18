-- Hive template schema.
-- Paste this into the Supabase SQL editor on a fresh project.
-- Do not run it against a database that already has these tables.

create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  import_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  name text not null,
  order_index integer not null
);

create table items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  name text not null,
  order_index integer not null
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,

  -- Core, editable / used in UI
  name text not null,
  comment_text text,
  comment_type text check (comment_type in ('info', 'limit', 'defect')),
  severity smallint check (severity in (-1, 0, 1)), -- -1 Low, 0 Med, 1 High
  multiple_choice_options text[],
  unit_type_options text[],
  order_within_item integer not null,
  answer_type text check (answer_type in ('boolean', 'checkbox', 'date', 'number', 'range', 'text')),

  -- Stored, not surfaced in UI
  recommendation text,
  default_value text,
  default_value_2 text,
  default_unit_type text,
  default_location text,
  default_estimate_min numeric,
  default_estimate_max numeric,
  locked boolean,
  simple_format boolean,
  disable_photos boolean,
  uses text,
  default_photo_1 text,
  default_photo_1_caption text,
  last_modified timestamptz
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_templates_updated_at
before update on templates
for each row execute function set_updated_at();
