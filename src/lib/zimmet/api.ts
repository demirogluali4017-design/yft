import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import {
  SINIRLI_YETKI,
  TAM_YETKI,
  YOK_YETKI,
  arizaEkleSchema,
  belgeKararSchema,
  durumSchema,
  erisimSchema,
  kalemSchema,
  kurulumSchema,
  kullaniciEpostasi,
  malzemeSchema,
  parseInput,
  personelSchema,
  yetkiSchema,
  zimmetGuncelleSchema,
  zimmetSchema,
  type KalemInput,
  type MalzemeDurum,
  type Role,
  type YetkiAnahtar,
  type Yetkiler,
} from "./schema";

type Actor = {
  userId: string;
  role: Role;
  adSoyad: string;
  rutbe: string;
  sicil: string;
  birlik: string;
  gorev: string;
  telefon: string;
  yetkiler: Yetkiler;
  aktif: boolean;
};

type ProfileRow = {
  user_id: string;
  role: Role;
  ad_soyad: string;
  rutbe: string;
  sicil: string;
  birlik: string;
  gorev: string;
  telefon: string;
  yetkiler: string;
  aktif: boolean;
};

export type Profile = {
  userId: string;
  role: Role;
  adSoyad: string;
  rutbe: string;
  sicil: string;
  birlik: string;
  gorev: string;
  telefon: string;
  yetkiler: Yetkiler;
  aktif: boolean;
};

export type Material = {
  id: string;
  stokNo: string;
  ad: string;
  kategori: string;
  seriNo: string;
  miktar: number;
  birim: string;
  durum: MalzemeDurum;
  konum: string;
  aciklama: string;
  muharebe: "" | "eder" | "edemez";
  zimmetli: number;
  musait: number;
  deleted: boolean;
};

export type Personnel = {
  id: string;
  userId: string | null;
  adSoyad: string;
  sicil: string;
  rutbe: string;
  birlik: string;
  gorev: string;
  telefon: string;
  aktif: boolean;
  rol: Role | null;
};

export type Assignment = {
  id: string;
  materialId: string;
  malzemeAd: string;
  stokNo: string;
  seriNo: string;
  birim: string;
  malzemeDurum: MalzemeDurum;
  personnelId: string;
  personelAd: string;
  rutbe: string;
  sicil: string;
  miktar: number;
  durum: "aktif" | "iade";
  notlar: string;
  belgeNo: string;
  assignedAt: string;
  returnedAt: string | null;
};

export type Hareket = {
  id: string;
  action: string;
  malzeme: string;
  personel: string;
  miktar: number;
  tarih: string;
  notlar: string;
};

export type FaultRow = Material & { sonNot: string };

function deny(message: string): never {
  throw new Error(message);
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function yetkiCoz(role: Role, raw: string): Yetkiler {
  if (role === "komutan") return { ...TAM_YETKI };
  if (role !== "yetkili") return { ...YOK_YETKI };
  try {
    const v = JSON.parse(raw) as Partial<Yetkiler>;
    return {
      envanter: !!v.envanter,
      zimmet: !!v.zimmet,
      personel: !!v.personel,
      belge: !!v.belge,
      sil: !!v.sil,
    };
  } catch {
    return { ...YOK_YETKI };
  }
}

function toActor(row: ProfileRow): Actor {
  return {
    userId: row.user_id,
    role: row.role,
    adSoyad: row.ad_soyad,
    rutbe: row.rutbe,
    sicil: row.sicil,
    birlik: row.birlik,
    gorev: row.gorev,
    telefon: row.telefon,
    yetkiler: yetkiCoz(row.role, row.yetkiler),
    aktif: row.aktif,
  };
}

function toProfile(actor: Actor): Profile {
  return { ...actor };
}

async function loadActor(sql: Sql, userId: string): Promise<Actor | null> {
  const rows = await sql<ProfileRow>`select * from profiles where user_id = ${userId} limit 1`;
  return rows[0] ? toActor(rows[0]) : null;
}

function staff(actor: Actor | null, key: YetkiAnahtar): boolean {
  if (!actor || !actor.aktif) return false;
  if (actor.role === "beklemede" || actor.role === "personel") return false;
  if (actor.role === "komutan") return true;
  return actor.yetkiler[key];
}

function requireStaff(actor: Actor | null, key: YetkiAnahtar): Actor {
  if (!actor) deny("Önce birlik kaydını tamamlayın.");
  if (!actor.aktif) deny("Hesabınız pasif.");
  if (!staff(actor, key)) deny("Bu işlem için yetkiniz yok.");
  return actor;
}

function requireUser(actor: Actor | null): Actor {
  if (!actor) deny("Önce birlik kaydını tamamlayın.");
  if (!actor.aktif) deny("Hesabınız pasif.");
  if (actor.role === "beklemede") deny("Kaydınız komutan onayı bekliyor.");
  return actor;
}

async function birlikAdi(sql: Sql, actor: Actor | null): Promise<string> {
  if (actor?.role === "komutan" && actor.birlik) return actor.birlik;
  const rows = await sql<{ birlik: string }>`select birlik from profiles where role = 'komutan' limit 1`;
  return rows[0]?.birlik || actor?.birlik || "";
}

type MatRow = {
  id: string;
  stok_no: string;
  ad: string;
  kategori: string;
  seri_no: string;
  miktar: number;
  birim: string;
  durum: MalzemeDurum;
  konum: string;
  aciklama: string;
  muharebe: string;
  zimmetli: number;
  deleted_at: string | null;
};

function toMaterial(row: MatRow): Material {
  const miktar = num(row.miktar);
  const zimmetli = num(row.zimmetli);
  return {
    id: row.id,
    stokNo: row.stok_no,
    ad: row.ad,
    kategori: row.kategori,
    seriNo: row.seri_no,
    miktar,
    birim: row.birim,
    durum: row.durum,
    konum: row.konum,
    aciklama: row.aciklama,
    muharebe: row.muharebe === "eder" || row.muharebe === "edemez" ? row.muharebe : "",
    zimmetli,
    musait: Math.max(0, miktar - zimmetli),
    deleted: !!row.deleted_at,
  };
}

const MATERIAL_SELECT = `
  select m.id, m.stok_no, m.ad, m.kategori, m.seri_no, m.miktar, m.birim, m.durum,
         m.konum, m.aciklama, m.muharebe, m.deleted_at,
         coalesce((select sum(a.miktar) from assignments a
                   where a.material_id = m.id and a.durum = 'aktif'), 0) as zimmetli
  from materials m
`;

async function zimmetliAdet(sql: Sql, materialId: string): Promise<number> {
  const rows = await sql<{ n: number }>`
    select coalesce(sum(miktar), 0) as n from assignments
    where material_id = ${materialId} and durum = 'aktif'
  `;
  return num(rows[0]?.n);
}

async function belgeNoUret(sql: Sql): Promise<string> {
  const rows = await sql<{ n: number }>`select count(*) as n from assignments`;
  const yil = new Date().getFullYear();
  return `ZM-${yil}-${String(num(rows[0]?.n) + 1).padStart(4, "0")}`;
}

async function logHareket(
  sql: Sql,
  row: {
    assignmentId: string | null;
    action: string;
    materialId: string;
    personnelId: string;
    miktar: number;
    actorId: string;
    notlar: string;
  },
) {
  await sql`
    insert into assignment_history
      (id, assignment_id, action, material_id, personnel_id, miktar, actor_user_id, notlar)
    values
      (${crypto.randomUUID()}, ${row.assignmentId}, ${row.action}, ${row.materialId},
       ${row.personnelId}, ${row.miktar}, ${row.actorId}, ${row.notlar})
  `;
}

async function kendiPersonelId(sql: Sql, userId: string): Promise<string | null> {
  const rows = await sql<{ id: string }>`select id from personnel where user_id = ${userId} limit 1`;
  return rows[0]?.id ?? null;
}

const ASSIGNMENT_SELECT = `
  select a.id, a.material_id, a.personnel_id, a.miktar, a.durum, a.notlar, a.belge_no,
         a.assigned_at::text as assigned_at, a.returned_at::text as returned_at,
         m.ad as malzeme_ad, m.stok_no, m.seri_no, m.birim, m.durum as malzeme_durum,
         p.ad_soyad as personel_ad, p.rutbe, p.sicil
  from assignments a
  join materials m on m.id = a.material_id
  join personnel p on p.id = a.personnel_id
`;

type AsgRow = {
  id: string;
  material_id: string;
  personnel_id: string;
  miktar: number;
  durum: "aktif" | "iade";
  notlar: string;
  belge_no: string;
  assigned_at: string;
  returned_at: string | null;
  malzeme_ad: string;
  stok_no: string;
  seri_no: string;
  birim: string;
  malzeme_durum: MalzemeDurum;
  personel_ad: string;
  rutbe: string;
  sicil: string;
};

function toAssignment(row: AsgRow): Assignment {
  return {
    id: row.id,
    materialId: row.material_id,
    malzemeAd: row.malzeme_ad,
    stokNo: row.stok_no,
    seriNo: row.seri_no,
    birim: row.birim,
    malzemeDurum: row.malzeme_durum,
    personnelId: row.personnel_id,
    personelAd: row.personel_ad,
    rutbe: row.rutbe,
    sicil: row.sicil,
    miktar: num(row.miktar),
    durum: row.durum,
    notlar: row.notlar,
    belgeNo: row.belge_no,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at,
  };
}

async function hesapAc(ad: string, sicil: string, sifre: string): Promise<string> {
  const { hashPassword } = await import("better-auth/crypto");
  const sql = await getSql();
  const email = kullaniciEpostasi(sicil);
  const varOlan = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
  if (varOlan[0]) deny("Bu sicil için hesap zaten açık.");
  const id = crypto.randomUUID();
  const hash = await hashPassword(sifre);
  await sql`
    insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
    values (${id}, ${ad}, ${email}, ${true}, now(), now())
  `;
  await sql`
    insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
    values (${crypto.randomUUID()}, ${id}, ${"credential"}, ${id}, ${hash}, now(), now())
  `;
  return id;
}

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId);
    const komutan = await sql<{ n: number }>`select count(*) as n from profiles where role = 'komutan'`;
    const personnelId = await kendiPersonelId(sql, context.userId);
    return {
      userId: context.userId,
      profile: actor ? toProfile(actor) : null,
      komutanVar: num(komutan[0]?.n) > 0,
      birlik: await birlikAdi(sql, actor),
      personnelId,
    };
  });

export const foundUnit = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(kurulumSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const mevcut = await loadActor(sql, context.userId);
    if (mevcut) deny("Kaydınız zaten var.");
    const komutan = await sql<{ user_id: string }>`select user_id from profiles where role = 'komutan' limit 1`;
    if (komutan[0]) deny("Birliğin komutanı kayıtlı. Erişim isteyin.");
    await sql`
      insert into profiles (user_id, role, ad_soyad, rutbe, sicil, birlik, gorev, yetkiler)
      values (${context.userId}, ${"komutan"}, ${data.adSoyad}, ${data.rutbe}, ${data.sicil},
              ${data.birlik}, ${"Kol komutanı"}, ${JSON.stringify(TAM_YETKI)})
    `;
    return { ok: true as const };
  });

export const requestAccess = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(erisimSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const mevcut = await loadActor(sql, context.userId);
    if (mevcut) deny("Kaydınız zaten var.");
    const komutan = await sql<{ birlik: string }>`select birlik from profiles where role = 'komutan' limit 1`;
    if (!komutan[0]) deny("Önce kol komutanı birliği kurmalı.");
    await sql`
      insert into profiles (user_id, role, ad_soyad, rutbe, sicil, birlik, yetkiler)
      values (${context.userId}, ${"beklemede"}, ${data.adSoyad}, ${data.rutbe}, ${data.sicil},
              ${komutan[0].birlik}, ${JSON.stringify(YOK_YETKI)})
    `;
    return { ok: true as const };
  });

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "envanter");
    const rows = await sql.query<MatRow>(`${MATERIAL_SELECT} order by m.ad`);
    return { birlik: await birlikAdi(sql, actor), malzemeler: rows.map(toMaterial) };
  });

export const getMaterial = createServerFn({ method: "POST" })
  .validator((id: unknown) => (typeof id === "string" && id ? id : deny("Kayıt yok.")))
  .middleware([authMiddleware])
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    requireStaff(await loadActor(sql, context.userId), "envanter");
    const rows = await sql.query<MatRow>(`${MATERIAL_SELECT} where m.id = $1 limit 1`, [id]);
    if (!rows[0]) deny("Malzeme bulunamadı.");
    const zimmetler = (await sql.query<AsgRow>(
      `${ASSIGNMENT_SELECT} where a.material_id = $1 order by a.assigned_at desc`,
      [id],
    )).map(toAssignment);
    const loglar = await sql<{
      id: string;
      durum: string;
      notlar: string;
      kademe: string;
      muharebe: string;
      olay: string | null;
      created_at: string;
    }>`
      select id, durum, notlar, kademe, muharebe,
             olay_tarihi::text as olay, to_char(created_at, 'YYYY-MM-DD') as created_at
      from fault_logs where material_id = ${id} order by coalesce(olay_tarihi, created_at::date) desc
    `;
    return {
      malzeme: toMaterial(rows[0]),
      zimmetler,
      loglar: loglar.map((l) => ({
        id: l.id,
        durum: l.durum,
        notlar: l.notlar,
        kademe: l.kademe,
        muharebe: l.muharebe,
        tarih: l.olay || l.created_at,
      })),
    };
  });

export const saveMaterial = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(malzemeSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "envanter");
    const stokNo = data.stokNo?.trim() || `YFT-${Date.now().toString().slice(-6)}`;
    if (data.id) {
      const mevcut = await sql<{ id: string }>`select id from materials where id = ${data.id} limit 1`;
      if (!mevcut[0]) deny("Malzeme bulunamadı.");
      const bagli = await zimmetliAdet(sql, data.id);
      if (data.miktar < bagli) deny("Miktar, zimmetli adedin altına inemez.");
      await sql`
        update materials set
          stok_no = ${stokNo}, ad = ${data.ad}, kategori = ${data.kategori}, birim = ${data.birim},
          miktar = ${data.miktar}, seri_no = ${data.seriNo ?? ""}, durum = ${data.durum},
          konum = ${data.konum ?? ""}, aciklama = ${data.aciklama ?? ""}
        where id = ${data.id}
      `;
      if (data.durum !== "saglam") {
        await sql`
          insert into fault_logs (id, material_id, durum, notlar, created_by)
          values (${crypto.randomUUID()}, ${data.id}, ${data.durum}, ${data.aciklama ?? "Durum güncellendi"}, ${actor.userId})
        `;
      }
      return { ok: true as const, id: data.id };
    }
    const id = crypto.randomUUID();
    await sql`
      insert into materials (id, stok_no, ad, kategori, birim, miktar, seri_no, durum, konum, aciklama, created_by)
      values (${id}, ${stokNo}, ${data.ad}, ${data.kategori}, ${data.birim}, ${data.miktar},
              ${data.seriNo ?? ""}, ${data.durum}, ${data.konum ?? ""}, ${data.aciklama ?? ""}, ${actor.userId})
    `;
    return { ok: true as const, id };
  });

export const removeMaterial = createServerFn({ method: "POST" })
  .validator((id: unknown) => (typeof id === "string" && id ? id : deny("Kayıt yok.")))
  .middleware([authMiddleware])
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    requireStaff(await loadActor(sql, context.userId), "sil");
    const bagli = await zimmetliAdet(sql, id);
    if (bagli > 0) deny("Üzerinde açık zimmet var. Önce zimmet çekin.");
    await sql`update materials set deleted_at = now() where id = ${id} and deleted_at is null`;
    return { ok: true as const };
  });

export const setMaterialStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(durumSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "envanter");
    const rows = await sql<{ id: string }>`select id from materials where id = ${data.id} and deleted_at is null limit 1`;
    if (!rows[0]) deny("Malzeme bulunamadı.");
    await sql`update materials set durum = ${data.durum}, muharebe = ${data.muharebe ?? ""} where id = ${data.id}`;
    await sql`
      insert into fault_logs (id, material_id, durum, notlar, kademe, muharebe, olay_tarihi, created_by)
      values (${crypto.randomUUID()}, ${data.id}, ${data.durum}, ${data.notlar ?? ""}, ${data.kademe ?? ""},
              ${data.muharebe ?? ""}, ${data.tarih || null}, ${actor.userId})
    `;
    return { ok: true as const };
  });

export const addFaultyMaterial = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(arizaEkleSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "envanter");
    const id = crypto.randomUUID();
    const stokNo = data.stokNo?.trim() || `YFT-A-${Date.now().toString().slice(-6)}`;
    await sql`
      insert into materials
        (id, stok_no, ad, kategori, birim, miktar, seri_no, durum, konum, aciklama, muharebe, created_by)
      values
        (${id}, ${stokNo}, ${data.ad}, ${"Genel"}, ${data.birim}, ${data.miktar}, ${data.seriNo ?? ""},
         ${"arizali"}, ${data.kademe}, ${data.notlar ?? ""}, ${data.muharebe}, ${actor.userId})
    `;
    await sql`
      insert into fault_logs (id, material_id, durum, notlar, kademe, muharebe, olay_tarihi, created_by)
      values (${crypto.randomUUID()}, ${id}, ${"arizali"}, ${data.notlar ?? ""}, ${data.kademe},
              ${data.muharebe}, ${data.tarih}, ${actor.userId})
    `;
    return { ok: true as const, id };
  });

export const listFaults = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = (input ?? {}) as { q?: string; bas?: string; bit?: string };
    return {
      q: (v.q ?? "").trim().slice(0, 80),
      bas: /^\d{4}-\d{2}-\d{2}$/.test(v.bas ?? "") ? v.bas! : "",
      bit: /^\d{4}-\d{2}-\d{2}$/.test(v.bit ?? "") ? v.bit! : "",
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    requireStaff(await loadActor(sql, context.userId), "envanter");
    const params: unknown[] = [];
    let where = " where m.deleted_at is null";
    if (data.q) {
      params.push(`%${data.q.toLocaleLowerCase("tr")}%`);
      where += ` and (lower(m.ad) like $${params.length} or lower(m.seri_no) like $${params.length} or lower(m.stok_no) like $${params.length})`;
    }
    if (data.bas) {
      params.push(data.bas);
      where += ` and coalesce(f.olay_tarihi, f.created_at::date) >= $${params.length}::date`;
    }
    if (data.bit) {
      params.push(data.bit);
      where += ` and coalesce(f.olay_tarihi, f.created_at::date) <= $${params.length}::date`;
    }
    const rows = await sql.query<{
      id: string;
      material_id: string;
      ad: string;
      stok_no: string;
      seri_no: string;
      durum: string;
      kademe: string;
      muharebe: string;
      notlar: string;
      tarih: string;
    }>(
      `select f.id, f.material_id, m.ad, m.stok_no, m.seri_no, f.durum, f.kademe, f.muharebe, f.notlar,
              coalesce(f.olay_tarihi, f.created_at::date)::text as tarih
       from fault_logs f
       join materials m on m.id = f.material_id
       ${where}
       order by coalesce(f.olay_tarihi, f.created_at::date) desc, m.ad
       limit 200`,
      params,
    );
    return {
      kayitlar: rows.map((r) => ({
        id: r.id,
        materialId: r.material_id,
        ad: r.ad,
        stokNo: r.stok_no,
        seriNo: r.seri_no,
        durum: r.durum,
        kademe: r.kademe,
        muharebe: r.muharebe,
        notlar: r.notlar,
        tarih: r.tarih,
      })),
    };
  });

export const getFaultReport = createServerFn({ method: "POST" })
  .validator((id: unknown) => (typeof id === "string" && id ? id : deny("Kayıt yok.")))
  .middleware([authMiddleware])
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    requireStaff(await loadActor(sql, context.userId), "envanter");
    const rows = await sql.query<MatRow>(`${MATERIAL_SELECT} where m.id = $1 limit 1`, [id]);
    if (!rows[0]) deny("Malzeme bulunamadı.");
    const loglar = await sql<{
      id: string;
      durum: string;
      notlar: string;
      kademe: string;
      muharebe: string;
      tarih: string;
    }>`
      select id, durum, notlar, kademe, muharebe,
             coalesce(olay_tarihi, created_at::date)::text as tarih
      from fault_logs where material_id = ${id}
      order by coalesce(olay_tarihi, created_at::date)
    `;
    const zimmetler = (await sql.query<AsgRow>(
      `${ASSIGNMENT_SELECT} where a.material_id = $1 and a.durum = 'aktif'`,
      [id],
    )).map(toAssignment);
    return {
      birlik: await birlikAdi(sql, await loadActor(sql, context.userId)),
      malzeme: toMaterial(rows[0]),
      loglar: loglar.map((l) => ({
        id: l.id,
        durum: l.durum,
        notlar: l.notlar,
        kademe: l.kademe,
        muharebe: l.muharebe,
        tarih: l.tarih,
      })),
      zimmetler,
      tarih: new Date().toISOString().slice(0, 10),
    };
  });

async function personelListe(sql: Sql): Promise<Personnel[]> {
  const rows = await sql<{
    id: string;
    user_id: string | null;
    ad_soyad: string;
    sicil: string;
    rutbe: string;
    birlik: string;
    gorev: string;
    telefon: string;
    aktif: boolean;
    rol: Role | null;
  }>`
    select p.id, p.user_id, p.ad_soyad, p.sicil, p.rutbe, p.birlik, p.gorev, p.telefon, p.aktif,
           pr.role as rol
    from personnel p
    left join profiles pr on pr.user_id = p.user_id
    order by p.ad_soyad
  `;
  return rows.map((p) => ({
    id: p.id,
    userId: p.user_id,
    adSoyad: p.ad_soyad,
    sicil: p.sicil,
    rutbe: p.rutbe,
    birlik: p.birlik,
    gorev: p.gorev,
    telefon: p.telefon,
    aktif: p.aktif,
    rol: p.rol,
  }));
}

export const listPersonnel = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId);
    if (!staff(actor, "personel") && !staff(actor, "zimmet")) deny("Bu işlem için yetkiniz yok.");
    return { personeller: await personelListe(sql) };
  });

export const getPersonnel = createServerFn({ method: "POST" })
  .validator((id: unknown) => (typeof id === "string" && id ? id : deny("Kayıt yok.")))
  .middleware([authMiddleware])
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const actor = requireUser(await loadActor(sql, context.userId));
    const liste = await personelListe(sql);
    const kisi = liste.find((p) => p.id === id);
    if (!kisi) deny("Personel bulunamadı.");
    const kendi = actor.role === "personel";
    if (kendi && kisi.userId !== actor.userId) deny("Başka personelin kaydını göremezsiniz.");
    if (!kendi && !staff(actor, "personel") && !staff(actor, "zimmet")) deny("Bu işlem için yetkiniz yok.");
    const zimmetler = (await sql.query<AsgRow>(
      `${ASSIGNMENT_SELECT} where a.personnel_id = $1 order by a.durum, a.assigned_at desc`,
      [id],
    )).map(toAssignment);
    return { kisi, zimmetler };
  });

export const savePersonnel = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(personelSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "personel");
    const birlik = await birlikAdi(sql, actor);
    if (data.id) {
      await sql`
        update personnel set
          ad_soyad = ${data.adSoyad}, rutbe = ${data.rutbe}, sicil = ${data.sicil},
          gorev = ${data.gorev ?? ""}, telefon = ${data.telefon ?? ""}, birlik = ${birlik}
        where id = ${data.id}
      `;
      return { ok: true as const, id: data.id, hesap: false };
    }
    let userId: string | null = null;
    if (data.sifre) userId = await hesapAc(data.adSoyad, data.sicil, data.sifre);
    const id = crypto.randomUUID();
    await sql`
      insert into personnel (id, user_id, ad_soyad, sicil, rutbe, birlik, gorev, telefon, created_by)
      values (${id}, ${userId}, ${data.adSoyad}, ${data.sicil}, ${data.rutbe}, ${birlik},
              ${data.gorev ?? ""}, ${data.telefon ?? ""}, ${actor.userId})
    `;
    if (userId) {
      await sql`
        insert into profiles (user_id, role, ad_soyad, rutbe, sicil, birlik, gorev, telefon, yetkiler)
        values (${userId}, ${"personel"}, ${data.adSoyad}, ${data.rutbe}, ${data.sicil}, ${birlik},
                ${data.gorev ?? ""}, ${data.telefon ?? ""}, ${JSON.stringify(YOK_YETKI)})
      `;
    }
    return { ok: true as const, id, hesap: Boolean(userId) };
  });

export const setPersonnelActive = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = input as { id?: string; aktif?: boolean };
    if (!v?.id) deny("Kayıt yok.");
    return { id: v.id, aktif: !!v.aktif };
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    requireStaff(await loadActor(sql, context.userId), "personel");
    if (!data.aktif) {
      const acik = await sql<{ n: number }>`
        select count(*) as n from assignments where personnel_id = ${data.id} and durum = 'aktif'
      `;
      if (num(acik[0]?.n) > 0) deny("Açık zimmeti var. Önce zimmet çekin.");
    }
    await sql`update personnel set aktif = ${data.aktif} where id = ${data.id}`;
    return { ok: true as const };
  });

export const listYetkiler = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId);
    if (actor?.role !== "komutan") deny("Yetki vermek ve almak yalnız kol komutanına aittir.");
    const personeller = await personelListe(sql);
    const hesaplar = await sql<ProfileRow>`select * from profiles where role <> 'komutan' order by ad_soyad`;
    const bagli = new Set(personeller.map((p) => p.userId).filter(Boolean));
    const disari = hesaplar.filter((r) => !bagli.has(r.user_id)).map((r) => toProfile(toActor(r)));
    return { personeller, disari };
  });

export const setYetki = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(yetkiSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId);
    if (actor?.role !== "komutan") deny("Yetki vermek ve almak yalnız kol komutanına aittir.");
    if (data.userId === actor.userId) deny("Kendi yetkinizi değiştiremezsiniz.");
    const hedef = await loadActor(sql, data.userId);
    if (!hedef) deny("Kullanıcı bulunamadı.");
    if (hedef.role === "komutan") deny("Komutan kaydı değiştirilemez.");
    const yetkiler = data.role === "yetkili" ? (data.preset === "sinirli" ? SINIRLI_YETKI : TAM_YETKI) : YOK_YETKI;
    await sql`
      update profiles set role = ${data.role}, yetkiler = ${JSON.stringify(yetkiler)}
      where user_id = ${data.userId}
    `;
    if (data.role === "personel" || data.role === "yetkili") {
      const varPersonel = await sql<{ id: string }>`select id from personnel where user_id = ${data.userId} limit 1`;
      if (!varPersonel[0] && hedef.sicil) {
        await sql`
          insert into personnel (id, user_id, ad_soyad, sicil, rutbe, birlik, gorev, telefon, created_by)
          values (${crypto.randomUUID()}, ${data.userId}, ${hedef.adSoyad}, ${hedef.sicil}, ${hedef.rutbe},
                  ${hedef.birlik}, ${hedef.gorev}, ${hedef.telefon}, ${actor.userId})
        `;
      }
    }
    return { ok: true as const };
  });

export const listAssignments = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = (input ?? {}) as { personnelId?: string; durum?: string };
    return {
      personnelId: v.personnelId || "",
      durum: v.durum === "aktif" || v.durum === "iade" ? v.durum : "",
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireUser(await loadActor(sql, context.userId));
    const params: unknown[] = [];
    let where = " where 1=1";
    if (actor.role === "personel") {
      const pid = await kendiPersonelId(sql, actor.userId);
      if (!pid) return { zimmetler: [] as Assignment[] };
      params.push(pid);
      where += ` and a.personnel_id = $${params.length}`;
    } else if (!staff(actor, "zimmet") && !staff(actor, "personel")) {
      deny("Bu işlem için yetkiniz yok.");
    } else if (data.personnelId) {
      params.push(data.personnelId);
      where += ` and a.personnel_id = $${params.length}`;
    }
    if (data.durum) {
      params.push(data.durum);
      where += ` and a.durum = $${params.length}`;
    }
    const rows = await sql.query<AsgRow>(
      `${ASSIGNMENT_SELECT} ${where} order by a.assigned_at desc, a.created_at desc`,
      params,
    );
    return { zimmetler: rows.map(toAssignment) };
  });

export const assignZimmet = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(zimmetSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "zimmet");
    const kisi = await sql<{ id: string; aktif: boolean }>`
      select id, aktif from personnel where id = ${data.personnelId} limit 1
    `;
    if (!kisi[0] || !kisi[0].aktif) deny("Personel aktif değil.");
    const belge = await belgeNoUret(sql);
    for (const satir of data.lines) {
      const mal = await sql.query<MatRow>(`${MATERIAL_SELECT} where m.id = $1 limit 1`, [satir.materialId]);
      if (!mal[0] || mal[0].deleted_at) deny("Malzeme bulunamadı.");
      if (mal[0].durum !== "saglam") deny(`${mal[0].ad} zimmete uygun değil (${mal[0].durum}).`);
      const musait = num(mal[0].miktar) - num(mal[0].zimmetli);
      if (satir.miktar > musait) deny(`${mal[0].ad} için zimmetsiz ${musait} ${mal[0].birim} var.`);
    }
    for (const satir of data.lines) {
      const id = crypto.randomUUID();
      await sql`
        insert into assignments
          (id, material_id, personnel_id, miktar, durum, notlar, belge_no, assigned_by)
        values
          (${id}, ${satir.materialId}, ${data.personnelId}, ${satir.miktar}, ${"aktif"},
           ${satir.notlar ?? ""}, ${belge}, ${actor.userId})
      `;
      await logHareket(sql, {
        assignmentId: id,
        action: "zimmet",
        materialId: satir.materialId,
        personnelId: data.personnelId,
        miktar: satir.miktar,
        actorId: actor.userId,
        notlar: satir.notlar ?? "",
      });
    }
    return { ok: true as const, belgeNo: belge };
  });

export const updateAssignment = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(zimmetGuncelleSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "zimmet");
    const rows = await sql<{ id: string; material_id: string; personnel_id: string; miktar: number; durum: string }>`
      select id, material_id, personnel_id, miktar, durum from assignments where id = ${data.id} limit 1
    `;
    const kayit = rows[0];
    if (!kayit || kayit.durum !== "aktif") deny("Açık zimmet bulunamadı.");
    const mal = await sql.query<MatRow>(`${MATERIAL_SELECT} where m.id = $1 limit 1`, [kayit.material_id]);
    if (!mal[0]) deny("Malzeme bulunamadı.");
    const musait = num(mal[0].miktar) - num(mal[0].zimmetli) + num(kayit.miktar);
    if (data.miktar > musait) deny("Zimmetsiz miktar yok.");
    await sql`
      update assignments set miktar = ${data.miktar}, notlar = ${data.notlar ?? ""} where id = ${data.id}
    `;
    await logHareket(sql, {
      assignmentId: data.id,
      action: "duzenle",
      materialId: kayit.material_id,
      personnelId: kayit.personnel_id,
      miktar: data.miktar,
      actorId: actor.userId,
      notlar: data.notlar ?? "",
    });
    return { ok: true as const };
  });

export const returnAssignment = createServerFn({ method: "POST" })
  .validator((id: unknown) => (typeof id === "string" && id ? id : deny("Kayıt yok.")))
  .middleware([authMiddleware])
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "zimmet");
    const rows = await sql<{ id: string; material_id: string; personnel_id: string; miktar: number; durum: string }>`
      select id, material_id, personnel_id, miktar, durum from assignments where id = ${id} limit 1
    `;
    const kayit = rows[0];
    if (!kayit || kayit.durum !== "aktif") deny("Açık zimmet bulunamadı.");
    await sql`update assignments set durum = 'iade', returned_at = current_date where id = ${id}`;
    await logHareket(sql, {
      assignmentId: id,
      action: "iade",
      materialId: kayit.material_id,
      personnelId: kayit.personnel_id,
      miktar: num(kayit.miktar),
      actorId: actor.userId,
      notlar: "Zimmet çekildi",
    });
    return { ok: true as const };
  });

export const getSened = createServerFn({ method: "POST" })
  .validator((id: unknown) => (typeof id === "string" && id ? id : deny("Kayıt yok.")))
  .middleware([authMiddleware])
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const actor = requireUser(await loadActor(sql, context.userId));
    const liste = await personelListe(sql);
    const kisi = liste.find((p) => p.id === id);
    if (!kisi) deny("Personel bulunamadı.");
    if (actor.role === "personel" && kisi.userId !== actor.userId) deny("Başka personelin senedini göremezsiniz.");
    if (actor.role !== "personel" && !staff(actor, "zimmet") && !staff(actor, "personel")) {
      deny("Bu işlem için yetkiniz yok.");
    }
    const zimmetler = (await sql.query<AsgRow>(
      `${ASSIGNMENT_SELECT} where a.personnel_id = $1 and a.durum = 'aktif' order by m.ad`,
      [id],
    )).map(toAssignment);
    return { birlik: await birlikAdi(sql, actor), kisi, zimmetler, tarih: new Date().toISOString().slice(0, 10) };
  });

function satirAyikla(text: string): KalemInput[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const ham = parsed as { materials?: unknown; kalemler?: unknown };
  const liste = Array.isArray(parsed) ? parsed : ham.materials ?? ham.kalemler;
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((m) => m && typeof m === "object")
    .slice(0, 40)
    .map((m) => {
      const row = m as Record<string, unknown>;
      const name = String(row.name ?? row.ad ?? "").trim();
      return {
        name,
        stock_no: String(row.stock_no ?? row.stok ?? "").trim(),
        serial_no: String(row.serial_no ?? row.seri ?? "").trim(),
        quantity: Math.max(1, num(row.quantity ?? row.miktar) || 1),
        unit: String(row.unit ?? row.birim ?? "adet").trim() || "adet",
        notes: String(row.notes ?? row.not ?? "").trim(),
      };
    })
    .filter((m) => m.name);
}

async function geminiSatir(apiKey: string, mime: string, image: string): Promise<KalemInput[]> {
  const models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
  let mesgul = false;
  let cevap = false;
  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
        body: JSON.stringify({
          generationConfig: { temperature: 0, maxOutputTokens: 4096, responseMimeType: "application/json" },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: 'Fotoğraftaki her satırı şu JSON içinde ver: {"materials":[{"name":"","stock_no":"","serial_no":"","quantity":1,"unit":"adet","notes":""}]}. Malzeme listesinde name malzeme adıdır. Kişi listesinde name ad soyaddır, rütbe ve görev notes alanına yazılır. Okunamayan alanı boş bırak. Yalnızca JSON.',
                },
                { inline_data: { mime_type: mime, data: image } },
              ],
            },
          ],
        }),
      });
    } catch {
      mesgul = true;
      continue;
    }
    if (res.status === 429 || res.status === 503) {
      mesgul = true;
      continue;
    }
    if (!res.ok) continue;
    cevap = true;
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    const duz = parts.filter((part) => !part.thought).map((part) => part.text ?? "").join("");
    const tum = parts.map((part) => part.text ?? "").join("");
    const materials = satirAyikla(duz);
    const bulunan = materials.length ? materials : satirAyikla(tum);
    if (bulunan.length) return bulunan;
  }
  if (cevap) deny("Okunabilir kalem bulunamadı.");
  if (mesgul) deny("Belge okuma şu an meşgul. Biraz sonra yeniden deneyin.");
  deny("Belgeden satır çıkarılamadı. Elle satır ekleyebilirsiniz.");
}

export const readDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = input as { image?: string; mime?: string };
    if (!v?.image || v.image.length < 40 || v.image.length > 2_000_000) deny("Görüntü boş veya çok büyük.");
    if (!v.mime || !["image/jpeg", "image/png", "image/webp"].includes(v.mime)) {
      deny("JPEG, PNG veya WebP yükleyin.");
    }
    return { image: v.image, mime: v.mime };
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "belge");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) deny("Belge okuma bu ortamda kullanılamıyor.");
    const materials = await geminiSatir(apiKey, data.mime, data.image);
    const id = crypto.randomUUID();
    await sql`
      insert into documents (id, doc_type, extracted, durum, created_by)
      values (${id}, ${"el_senedi"}, ${JSON.stringify(materials)}, ${"bekliyor"}, ${actor.userId})
    `;
    return { id, materials };
  });

export const draftDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = input as { materials?: unknown };
    const materials = parseInput(kalemSchema.array().min(1).max(40), v?.materials ?? input);
    return materials;
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "belge");
    const id = crypto.randomUUID();
    await sql`
      insert into documents (id, doc_type, extracted, durum, created_by)
      values (${id}, ${"el_senedi"}, ${JSON.stringify(data)}, ${"bekliyor"}, ${actor.userId})
    `;
    return { id, materials: data };
  });

export const decideDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(belgeKararSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = requireStaff(await loadActor(sql, context.userId), "belge");
    const belge = await sql<{ id: string; durum: string }>`
      select id, durum from documents where id = ${data.id} limit 1
    `;
    if (!belge[0]) deny("Belge bulunamadı.");
    if (belge[0].durum !== "bekliyor") deny("Bu belge zaten sonuçlanmış.");
    if (data.karar === "red") {
      await sql`update documents set durum = 'reddedildi' where id = ${data.id}`;
      return { ok: true as const, eklenen: 0 };
    }
    const materials = data.materials ?? [];
    if (!materials.length) deny("Onay için en az bir kalem gerekli.");
    for (const kalem of materials) {
      const stok = kalem.stock_no?.trim() || "";
      if (stok) {
        const varOlan = await sql<{ id: string }>`
          select id from materials where stok_no = ${stok} and deleted_at is null limit 1
        `;
        if (varOlan[0]) {
          await sql`update materials set miktar = miktar + ${kalem.quantity} where id = ${varOlan[0].id}`;
          continue;
        }
      }
      await sql`
        insert into materials (id, stok_no, ad, kategori, birim, miktar, seri_no, durum, konum, aciklama, created_by)
        values (${crypto.randomUUID()}, ${stok || `YFT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`},
                ${kalem.name}, ${"Genel"}, ${kalem.unit || "adet"}, ${kalem.quantity},
                ${kalem.serial_no ?? ""}, ${"saglam"}, ${"Depo"}, ${kalem.notes ?? "Belgeden aktarıldı"}, ${actor.userId})
      `;
    }
    await sql`
      update documents set durum = 'onaylandi', extracted = ${JSON.stringify(materials)} where id = ${data.id}
    `;
    return { ok: true as const, eklenen: materials.length };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    requireStaff(await loadActor(sql, context.userId), "belge");
    const rows = await sql<{ id: string; durum: string; created_at: string }>`
      select id, durum, to_char(created_at, 'YYYY-MM-DD') as created_at
      from documents order by created_at desc limit 8
    `;
    return { belgeler: rows.map((r) => ({ id: r.id, durum: r.durum, tarih: r.created_at })) };
  });

export const getReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = requireUser(await loadActor(sql, context.userId));
    if (actor.role === "personel") {
      const pid = await kendiPersonelId(sql, actor.userId);
      if (!pid) {
        return { kind: "personel" as const, kalem: 0, adet: 0, hareketler: [] as Hareket[] };
      }
      const ozet = await sql<{ kalem: number; adet: number }>`
        select count(*) as kalem, coalesce(sum(miktar), 0) as adet
        from assignments where personnel_id = ${pid} and durum = 'aktif'
      `;
      const hareketler = await hareketlerGetir(sql, pid);
      return {
        kind: "personel" as const,
        kalem: num(ozet[0]?.kalem),
        adet: num(ozet[0]?.adet),
        hareketler,
      };
    }
    if (!staff(actor, "envanter") && !staff(actor, "zimmet")) deny("Bu işlem için yetkiniz yok.");
    const malzemeler = (await sql.query<MatRow>(`${MATERIAL_SELECT} where m.deleted_at is null`)).map(toMaterial);
    const personeller = await personelListe(sql);
    const aktif = await sql<{ n: number }>`select count(*) as n from assignments where durum = 'aktif'`;
    const rapor = [];
    for (const p of personeller.filter((x) => x.aktif)) {
      const ozet = await sql<{ kalem: number; adet: number }>`
        select count(*) as kalem, coalesce(sum(miktar), 0) as adet
        from assignments where personnel_id = ${p.id} and durum = 'aktif'
      `;
      rapor.push({
        id: p.id,
        ad: p.adSoyad,
        sicil: p.sicil,
        rutbe: p.rutbe,
        kalem: num(ozet[0]?.kalem),
        adet: num(ozet[0]?.adet),
      });
    }
    const kritik = malzemeler
      .filter((m) => m.durum === "saglam" && m.musait === 0)
      .map((m) => ({ id: m.id, ad: m.ad, stokNo: m.stokNo, miktar: m.miktar, zimmetli: m.zimmetli }));
    return {
      kind: "kadro" as const,
      kalem: malzemeler.length,
      adet: malzemeler.reduce((t, m) => t + m.miktar, 0),
      zimmetliAdet: malzemeler.reduce((t, m) => t + m.zimmetli, 0),
      musaitAdet: malzemeler.reduce((t, m) => t + m.musait, 0),
      dagitilabilir: malzemeler.filter((m) => m.durum === "saglam" && m.musait > 0).length,
      beklemede: malzemeler.filter((m) => m.durum === "arizali" || m.durum === "tamirde").length,
      arsiv: malzemeler.filter((m) => m.durum === "kayip" || m.durum === "hurda").length,
      arizali: malzemeler.filter((m) => m.durum !== "saglam").length,
      personel: personeller.filter((p) => p.aktif).length,
      aktifZimmet: num(aktif[0]?.n),
      personelRapor: rapor,
      arizaliListe: malzemeler.filter((m) => m.durum !== "saglam"),
      kritik,
      hareketler: await hareketlerGetir(sql, null),
    };
  });

async function hareketlerGetir(sql: Sql, personnelId: string | null): Promise<Hareket[]> {
  const rows = personnelId
    ? await sql<{
        id: string;
        action: string;
        malzeme: string;
        personel: string;
        miktar: number;
        tarih: string;
        notlar: string;
      }>`
        select h.id, h.action, m.ad as malzeme, p.ad_soyad as personel, h.miktar,
               to_char(h.created_at, 'YYYY-MM-DD') as tarih, h.notlar
        from assignment_history h
        join materials m on m.id = h.material_id
        join personnel p on p.id = h.personnel_id
        where h.personnel_id = ${personnelId}
        order by h.created_at desc limit 12
      `
    : await sql<{
        id: string;
        action: string;
        malzeme: string;
        personel: string;
        miktar: number;
        tarih: string;
        notlar: string;
      }>`
        select h.id, h.action, m.ad as malzeme, p.ad_soyad as personel, h.miktar,
               to_char(h.created_at, 'YYYY-MM-DD') as tarih, h.notlar
        from assignment_history h
        join materials m on m.id = h.material_id
        join personnel p on p.id = h.personnel_id
        order by h.created_at desc limit 12
      `;
  return rows.map((h) => ({
    id: h.id,
    action: h.action,
    malzeme: h.malzeme,
    personel: h.personel,
    miktar: num(h.miktar),
    tarih: h.tarih,
    notlar: h.notlar,
  }));
}
