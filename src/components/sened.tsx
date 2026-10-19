import type { Assignment, Personnel } from "@/lib/zimmet/api";
import { tarih } from "@/lib/zimmet/labels";
import { Button } from "./ui";

export function Sened({
  birlik,
  kisi,
  zimmetler,
  gun,
  onClose,
}: {
  birlik: string;
  kisi: Personnel;
  zimmetler: Assignment[];
  gun: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-paper">
      <div className="no-print flex gap-2 border-b border-ink/10 px-4 py-3">
        <Button type="button" onClick={() => window.print()}>Yazdır / PDF</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Kapat</Button>
      </div>
      <article id="zimmet-senedi" className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-xs uppercase tracking-widest text-ink/60">{birlik}</p>
        <h1 className="font-display text-4xl font-semibold tracking-wide">Zimmet senedi</h1>
        <p className="mt-2 text-sm">
          {kisi.rutbe} {kisi.adSoyad} · sicil {kisi.sicil} · {tarih(gun)}
        </p>
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              <th className="py-2 pr-2 font-semibold">Stok</th>
              <th className="py-2 pr-2 font-semibold">Malzeme</th>
              <th className="py-2 pr-2 font-semibold">Seri</th>
              <th className="py-2 text-right font-semibold">Miktar</th>
            </tr>
          </thead>
          <tbody>
            {zimmetler.map((z) => (
              <tr key={z.id} className="border-b border-ink/15">
                <td className="py-2 pr-2 tabular-nums">{z.stokNo}</td>
                <td className="py-2 pr-2">{z.malzemeAd}</td>
                <td className="py-2 pr-2">{z.seriNo || "—"}</td>
                <td className="py-2 text-right tabular-nums">{z.miktar} {z.birim}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {zimmetler.length === 0 ? <p className="mt-4 text-sm">Üzerinde açık zimmet yok.</p> : null}
        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <p>Teslim eden<br /><span className="mt-8 block border-t border-ink/30 pt-1">İmza</span></p>
          <p>Teslim alan<br /><span className="mt-8 block border-t border-ink/30 pt-1">{kisi.adSoyad}</span></p>
        </div>
      </article>
    </div>
  );
}
