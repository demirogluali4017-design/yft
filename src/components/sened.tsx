import type { Assignment, Personnel } from "@/lib/zimmet/api";
import { tarih } from "@/lib/zimmet/labels";
import { Button } from "./ui";

type Veren = { adSoyad: string; rutbe: string; gorev: string };

export function yazdirBelge() {
  const kaynak = document.getElementById("zimmet-senedi");
  if (!kaynak) return;
  const kopya = kaynak.cloneNode(true) as HTMLElement;
  kopya.id = "yazdir-kopya";
  document.body.appendChild(kopya);
  const temizle = () => {
    kopya.remove();
    window.removeEventListener("afterprint", temizle);
    window.matchMedia("print").removeEventListener("change", izle);
  };
  const izle = (olay: MediaQueryListEvent) => {
    if (!olay.matches) temizle();
  };
  window.addEventListener("afterprint", temizle);
  window.matchMedia("print").addEventListener("change", izle);
  window.print();
}

export function Sened({
  zimmetler,
  gun,
  onClose,
}: {
  birlik: string;
  kisi: Personnel;
  zimmetler: Assignment[];
  gun: string;
  veren?: Veren;
  onClose: () => void;
}) {
  const satir = Math.max(zimmetler.length, 8);
  const bos = Array.from({ length: satir - zimmetler.length }, (_, i) => i);
  return (
    <div className="sened-ekran fixed inset-0 z-50 overflow-auto bg-white">
      <div className="no-print flex gap-2 border-b border-ink/10 px-4 py-3">
        <Button type="button" onClick={yazdirBelge}>PDF / Yazdır</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Kapat</Button>
      </div>
      <article id="zimmet-senedi" className="mx-auto max-w-5xl px-4 py-6 text-[11px] text-black">
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <th colSpan={5} className="border border-black px-2 py-1 text-center text-sm font-bold tracking-wide">
                TAŞINIR MAL TESLİM TESELLÜM AYRINTI BELGESİ
              </th>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Taşınır Malın Birliği :</td>
              <td className="border border-black px-2 py-1" colSpan={2}>2'nci Komando Kolu</td>
              <td className="border border-black px-2 py-1 font-semibold">Rapor Tarihi:</td>
              <td className="border border-black px-2 py-1">{tarih(gun)}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Teslim Alan Kısım/Birim:</td>
              <td className="border border-black px-2 py-1" colSpan={4} />
            </tr>
            <tr>
              <th colSpan={5} className="border border-black px-2 py-1 text-center font-semibold">
                Zimmetlenen Seri Numarası / Kafile Listesi
              </th>
            </tr>
            <tr className="text-center">
              <th className="w-10 border border-black px-1 py-1">S.No.</th>
              <th className="w-36 border border-black px-1 py-1">Stok No.</th>
              <th className="border border-black px-1 py-1">Cins ve Özellikleri</th>
              <th className="w-28 border border-black px-1 py-1">Seri Numarası</th>
              <th className="w-16 border border-black px-1 py-1">Miktar</th>
            </tr>
            {zimmetler.map((z, i) => (
              <tr key={z.id} className="h-8">
                <td className="border border-black px-1 text-center">{i + 1}</td>
                <td className="border border-black px-1">{z.stokNo}</td>
                <td className="border border-black px-1">{z.malzemeAd}</td>
                <td className="border border-black px-1">{z.seriNo}</td>
                <td className="border border-black px-1 text-center">{z.miktar} {z.birim === "adet" ? "AD" : z.birim.toLocaleUpperCase("tr")}</td>
              </tr>
            ))}
            {bos.map((n) => (
              <tr key={`bos-${n}`} className="h-8">
                <td className="border border-black px-1 text-center">{zimmetler.length + n + 1}</td>
                <td className="border border-black" />
                <td className="border border-black" />
                <td className="border border-black" />
                <td className="border border-black" />
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <th className="border border-black px-2 py-1 text-center" colSpan={2}>TESLİM EDEN</th>
              <th className="border border-black px-2 py-1 text-center">TESLİM ALAN</th>
            </tr>
            <tr className="h-14">
              <td className="w-28 border border-black px-2">İmzası</td>
              <td className="border border-black" />
              <td className="border border-black" />
            </tr>
            <tr>
              <td className="border border-black px-2">Adı ve Soyadı</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
            </tr>
            <tr>
              <td className="border border-black px-2">Rütbesi</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
            </tr>
            <tr>
              <td className="border border-black px-2">Görevi</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}