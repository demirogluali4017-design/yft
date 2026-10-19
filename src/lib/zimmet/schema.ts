import { z } from "zod";

export const ROLES = ["komutan", "yetkili", "personel", "beklemede"] as const;
export type Role = (typeof ROLES)[number];

export const YETKI_ANAHTAR = ["envanter", "zimmet", "personel", "belge", "sil"] as const;
export type YetkiAnahtar = (typeof YETKI_ANAHTAR)[number];
export type Yetkiler = Record<YetkiAnahtar, boolean>;

export const DURUMLAR = ["saglam", "arizali", "tamirde", "kayip", "hurda"] as const;
export type MalzemeDurum = (typeof DURUMLAR)[number];

export const KATEGORILER = [
  "Optik",
  "Cihaz",
  "Haberleşme",
  "Silah",
  "Mühimmat",
  "Giyim",
  "Teçhizat",
  "Sıhhiye",
  "Barınma",
  "Mutfak",
  "Alet",
  "Genel",
] as const;

export const RUTBELER = [
  "Er",
  "Onbaşı",
  "Çavuş",
  "Uzman Çavuş",
  "Astsubay Çavuş",
  "Astsubay Üstçavuş",
  "Teğmen",
  "Üsteğmen",
  "Yüzbaşı",
  "Binbaşı",
  "Sivil memur",
] as const;

export const TAM_YETKI: Yetkiler = {
  envanter: true,
  zimmet: true,
  personel: true,
  belge: true,
  sil: true,
};

export const SINIRLI_YETKI: Yetkiler = {
  envanter: true,
  zimmet: true,
  personel: false,
  belge: true,
  sil: false,
};

export const YOK_YETKI: Yetkiler = {
  envanter: false,
  zimmet: false,
  personel: false,
  belge: false,
  sil: false,
};

const sicil = z
  .string()
  .trim()
  .min(3, "Sicil en az 3 karakter.")
  .max(20, "Sicil çok uzun.")
  .regex(/^[A-Za-z0-9]+$/, "Sicil yalnızca harf ve rakam olabilir.");

const sifreOpsiyon = z
  .string()
  .max(72)
  .optional()
  .refine((v) => !v || v.length >= 8, "Şifre en az 8 karakter.");

export const kurulumSchema = z.object({
  birlik: z.string().trim().min(3, "Birlik adını yazın.").max(80),
  adSoyad: z.string().trim().min(3, "Ad soyad gerekli.").max(80),
  rutbe: z.string().trim().min(2, "Rütbe gerekli.").max(40),
  sicil,
  sifre: sifreOpsiyon,
});

export const girisSchema = z.object({
  kullanici: z.string().trim().min(3, "Kullanıcı adı veya sicil gerekli.").max(80),
  sifre: z.string().min(8, "Şifre en az 8 karakter.").max(72),
});

export const erisimSchema = z.object({
  adSoyad: z.string().trim().min(3, "Ad soyad gerekli.").max(80),
  rutbe: z.string().trim().min(2, "Rütbe gerekli.").max(40),
  sicil,
});

export const malzemeSchema = z.object({
  id: z.string().optional(),
  stokNo: z.string().trim().max(40).optional(),
  ad: z.string().trim().min(2, "Malzeme adı gerekli.").max(120),
  kategori: z.string().trim().min(2, "Kategori gerekli.").max(40),
  birim: z.string().trim().min(1, "Birim gerekli.").max(20),
  miktar: z.coerce.number().int().min(0, "Miktar negatif olamaz.").max(100000),
  seriNo: z.string().trim().max(60).optional(),
  durum: z.enum(DURUMLAR),
  konum: z.string().trim().max(60).optional(),
  aciklama: z.string().trim().max(400).optional(),
});

export const personelSchema = z.object({
  id: z.string().optional(),
  adSoyad: z.string().trim().min(3, "Ad soyad gerekli.").max(80),
  rutbe: z.string().trim().min(2, "Rütbe gerekli.").max(40),
  sicil,
  gorev: z.string().trim().max(80).optional(),
  telefon: z.string().trim().max(20).optional(),
  sifre: sifreOpsiyon,
});

export const zimmetSchema = z.object({
  personnelId: z.string().min(1, "Personel seçin."),
  lines: z
    .array(
      z.object({
        materialId: z.string().min(1),
        miktar: z.coerce.number().int().positive("Miktar en az 1.").max(100000),
        notlar: z.string().trim().max(400).optional(),
      }),
    )
    .min(1, "En az bir malzeme ekleyin.")
    .max(20),
});

export const zimmetGuncelleSchema = z.object({
  id: z.string().min(1),
  miktar: z.coerce.number().int().positive("Miktar en az 1.").max(100000),
  notlar: z.string().trim().max(400).optional(),
});

export const kalemSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli.").max(120),
  stock_no: z.string().trim().max(40).optional(),
  serial_no: z.string().trim().max(60).optional(),
  quantity: z.coerce.number().int().positive("Miktar en az 1.").max(100000),
  unit: z.string().trim().min(1).max(20),
  notes: z.string().trim().max(400).optional(),
});

export const belgeKararSchema = z.object({
  id: z.string().min(1),
  karar: z.enum(["onay", "red"]),
  materials: z.array(kalemSchema).max(40).optional(),
});

export const durumSchema = z.object({
  id: z.string().min(1),
  durum: z.enum(DURUMLAR),
  notlar: z.string().trim().max(400).optional(),
  kademe: z.string().trim().max(80).optional(),
  muharebe: z.enum(["eder", "edemez"]).optional(),
  tarih: z.string().trim().optional(),
});

export const arizaEkleSchema = z.object({
  ad: z.string().trim().min(2, "Malzeme adı gerekli.").max(120),
  stokNo: z.string().trim().max(40).optional(),
  seriNo: z.string().trim().max(60).optional(),
  miktar: z.coerce.number().int().positive("Miktar en az 1.").max(100000),
  birim: z.string().trim().min(1).max(20),
  kademe: z.string().trim().min(2, "Kademe yazın.").max(80),
  tarih: z.string().trim().min(8, "Tarih gerekli."),
  notlar: z.string().trim().max(800).optional(),
  muharebe: z.enum(["eder", "edemez"]),
});

export const yetkiSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["yetkili", "personel", "beklemede"]),
  preset: z.enum(["tam", "sinirli"]).optional(),
});

export type KurulumInput = z.infer<typeof kurulumSchema>;
export type MalzemeInput = z.infer<typeof malzemeSchema>;
export type PersonelInput = z.infer<typeof personelSchema>;
export type KalemInput = z.infer<typeof kalemSchema>;

export function kullaniciEpostasi(deger: string): string {
  return `${deger.trim().toLowerCase()}@yft.birlik`;
}

export function girisEpostasi(kullanici: string): string {
  const v = kullanici.trim().toLowerCase();
  return v.includes("@") ? v : kullaniciEpostasi(v);
}

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const sonuc = schema.safeParse(input);
  if (!sonuc.success) {
    throw new Error(sonuc.error.issues[0]?.message ?? "Geçersiz bilgi.");
  }
  return sonuc.data;
}
