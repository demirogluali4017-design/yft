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
