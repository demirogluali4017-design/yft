alter table materials add column if not exists muharebe text not null default '';

alter table fault_logs add column if not exists kademe text not null default '';
alter table fault_logs add column if not exists muharebe text not null default '';
alter table fault_logs add column if not exists olay_tarihi date;
