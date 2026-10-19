import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { DURUM_AD, hataMetni } from "@/lib/zimmet/labels";
import { getReport } from "@/lib/zimmet/api";

export const Route = createFileRoute("/rapor")({ component: Page });

function Page() {
  return (
    <AppShell need="envanter">
      <Rapor />
    </AppShell>
  );
}

function Rapor() {
  const sorgu = useQuery({ queryKey: ["zimmet", "rapor"], queryFn: () => getReport() });
  if (sorgu.isLoading) return <p className="text-sm text-ink/60">Rapor hazırlanıyor</p>;
  if (sorgu.error) return <p className="text-signal">{hataMetni(sorgu.error)}</p>;
  const data = sorgu.data;
  if (!data || data.kind !== "kadro") return <p>Bu rapor kadro içindir.</p>;
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Rapor</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kutu ad="Kalem" deger={data.kalem} />
        <Kutu ad="Elde" deger={data.adet} />
        <Kutu ad="Ayrılmış" deger={data.zimmetliAdet} />
        <Kutu ad="Müsait" deger={data.musaitAdet} />
      </div>
      <h2 className="mt-8 font-display text-2xl font-semibold">Personel bazlı zimmet</h2>
      <div className="mt-3 overflow-x-auto border border-ink/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/5 text-xs uppercase tracking-widest text-ink/60">
            <tr>
              <th className="px-3 py-2">Personel</th>
              <th className="px-3 py-2">Sicil</th>
              <th className="px-3 py-2 text-right">Kalem</th>
              <th className="px-3 py-2 text-right">Adet</th>
            </tr>
          </thead>
          <tbody>
            {data.personelRapor.map((p) => (
              <tr key={p.id} className="border-t border-ink/10">
                <td className="px-3 py-2">
                  <Link to="/personel/$id" params={{ id: p.id }} className="font-semibold hover:underline">{p.rutbe} {p.ad}</Link>
                </td>
                <td className="px-3 py-2 tabular-nums">{p.sicil}</td>
                <td className="px-3 py-2 text-right tabular-nums">{p.kalem}</td>
                <td className="px-3 py-2 text-right tabular-nums">{p.adet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-8 font-display text-2xl font-semibold">Sorunlu malzeme</h2>
      <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 text-sm">
        {data.arizaliListe.length === 0 ? <li className="px-3 py-3 text-ink/60">Yok.</li> : null}
        {data.arizaliListe.map((m) => (
          <li key={m.id} className="flex justify-between px-3 py-2">
            <Link to="/envanter/$id" params={{ id: m.id }} className="hover:underline">{m.ad}</Link>
            <span>{DURUM_AD[m.durum]} · zimmet {m.zimmetli}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kutu({ ad, deger }: { ad: string; deger: number }) {
  return (
    <div className="border border-ink/10 px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-ink/50">{ad}</p>
      <p className="font-display text-4xl font-semibold tabular-nums">{deger}</p>
    </div>
  );
}
