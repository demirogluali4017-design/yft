import type { MalzemeDurum, Role } from "./schema";

export const ROL_AD: Record<Role, string> = {
  komutan: "Kol komutanı",
  yetkili: "Yetkili",
  personel: "Personel",
  beklemede: "Onay bekliyor",
};

export const DURUM_AD: Record<MalzemeDurum, string> = {
  saglam: "Sağlam",
  arizali: "Arızalı",
  tamirde: "Tamirde",
  kayip: "Kayıp",
  hurda: "Hurda",
};

export type StokSinif = "dagitilabilir" | "zimmetli" | "beklemede" | "arsiv";

export const SINIF_AD: Record<StokSinif, string> = {
  dagitilabilir: "Dağıtılabilir",
  zimmetli: "Zimmetli",
  beklemede: "Beklemede",
  arsiv: "Arşiv",
};

export function stokSinifi(m: {
  deleted?: boolean;
  durum: MalzemeDurum;
  musait: number;
  zimmetli: number;
}): StokSinif {
  if (m.deleted || m.durum === "kayip" || m.durum === "hurda") return "arsiv";
  if (m.durum === "arizali" || m.durum === "tamirde") return "beklemede";
  if (m.zimmetli > 0 && m.musait === 0) return "zimmetli";
  return "dagitilabilir";
}

export function tarih(iso: string | null | undefined): string {
  if (!iso) return "—";
  const gun = iso.slice(0, 10);
  const [y, m, d] = gun.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function hataMetni(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "İşlem tamamlanamadı.";
}