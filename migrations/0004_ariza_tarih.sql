alter table fault_logs add column if not exists tespit_tarihi date;
alter table fault_logs add column if not exists gidis_tarihi date;

update fault_logs
set tespit_tarihi = coalesce(tespit_tarihi, olay_tarihi, created_at::date)
where tespit_tarihi is null;
