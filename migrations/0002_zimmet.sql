-- YFT zimmet defteri. Yetki sunucuda rol + yetki bayraklarıyla zorlanır.

create table if not exists profiles (
  user_id text primary key,
  role text not null check (role in ('komutan', 'yetkili', 'personel', 'beklemede')),
  ad_soyad text not null,
  rutbe text not null default '',
  sicil text not null default '',
  birlik text not null default '',
  gorev text not null default '',
  telefon text not null default '',
  yetkiler text not null default '{}',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_sicil_uidx on profiles (sicil) where sicil <> '';

create table if not exists personnel (
  id text primary key,
  user_id text unique,
  ad_soyad text not null,
  sicil text not null unique,
  rutbe text not null,
  birlik text not null default '',
  gorev text not null default '',
  telefon text not null default '',
  aktif boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists materials (
  id text primary key,
  stok_no text not null,
  ad text not null,
  kategori text not null,
  seri_no text not null default '',
  miktar integer not null check (miktar >= 0),
  birim text not null default 'adet',
  durum text not null default 'saglam' check (durum in ('saglam', 'arizali', 'tamirde', 'kayip', 'hurda')),
  konum text not null default '',
  aciklama text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists materials_stok_idx on materials (stok_no);
create index if not exists materials_deleted_idx on materials (deleted_at);

create table if not exists assignments (
  id text primary key,
  material_id text not null references materials (id),
  personnel_id text not null references personnel (id),
  miktar integer not null check (miktar > 0),
  durum text not null default 'aktif' check (durum in ('aktif', 'iade')),
  notlar text not null default '',
  belge_no text not null default '',
  assigned_at date not null default current_date,
  returned_at date,
  assigned_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists assignments_personnel_idx on assignments (personnel_id);
create index if not exists assignments_material_idx on assignments (material_id);
create index if not exists assignments_durum_idx on assignments (durum);

create table if not exists assignment_history (
  id text primary key,
  assignment_id text,
  action text not null,
  material_id text not null,
  personnel_id text not null,
  miktar integer not null,
  actor_user_id text not null,
  notlar text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists assignment_history_person_idx on assignment_history (personnel_id);

create table if not exists documents (
  id text primary key,
  doc_type text not null default 'el_senedi',
  extracted text not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'reddedildi')),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists fault_logs (
  id text primary key,
  material_id text not null references materials (id),
  durum text not null,
  notlar text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists fault_logs_material_idx on fault_logs (material_id);
