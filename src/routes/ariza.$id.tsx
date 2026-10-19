import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui";
import { yazdirBelge } from "@/components/sened";
import { getFaultReport } from "@/lib/zimmet/api";
import { DURUM_AD, hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/ariza/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <AppShell need="envanter">
      <Rapor id={id} />
    </AppShell>
  );
}

function Rapor({ id }: { id: string }) {
  const sorgu = useQuery({ queryKey: ["zimmet", "ariza-rapor", id], queryFn: () => getFaultReport({ data: id }) });
  if (sorgu.isLoading) return <p className="text-sm text-ink/60">Rapor hazırlanıyor</p>;
  if (sorgu.error) return <p className="text-signal">{hataMetni(sorgu.error)}</p>;
  const data = sorgu.data;
  if (!data) return null;
  const m = data.malzeme;
  const muharebe = m.muharebe === "eder" ? "Muharebe eder" : m.muharebe === "edemez" ? "Muharebe edemez" : "Belirtilmedi";
  return (
    <div>
      <div className="no-print mb-4 flex gap-2">
        <Link to="/ariza" className="inline-flex h-11 items-center px-3 text-sm text-ink/60">Arızaya dön</Link>
        <Button type="button" onClick={yazdirBelge}>PDF / Yazdır</Button>
      </div>
      <article id="zimmet-senedi">
        <p className="text-xs uppercase tracking-widest text-ink/50">{data.birlik}</p>
        <h1 className="font-display text-4xl font-semibold tracking-wide">Arıza raporu</h1>
        <p className="mt-1 text-sm text-ink/60">Tarih {tarih(data.tarih)}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <Bilgi ad="Malzeme" deger={m.ad} />
          <Bilgi ad="Stok" deger={m.stokNo} />
          <Bilgi ad="Seri" deger={m.seriNo || "—"} />
          <Bilgi ad="Durum" deger={DURUM_AD[m.durum]} />
          <Bilgi ad="Muharebe" deger={muharebe} />
          <Bilgi ad="Adet" deger={`${m.miktar} ${m.birim}`} />
          <Bilgi ad="Zimmetli" deger={String(m.zimmetli)} />
          <Bilgi ad="Konum / kademe" deger={m.konum || "—"} />
        </dl>
        {m.aciklama ? <p className="mt-4 text-sm">{m.aciklama}</p> : null}
        {data.zimmetler.length > 0 ? (
          <p className="mt-4 text-sm">
            Üzerinde açık zimmet: {data.zimmetler.map((z) => `${z.rutbe} ${z.personelAd} (${z.miktar})`).join(", ")}
          </p>
        ) : <p className="mt-4 text-sm text-ink/60">Açık zimmet yok.</p>}
        <h2 className="mt-8 font-display text-2xl font-semibold">Geçmiş arızalar</h2>
        {data.loglar.length === 0 ? <p className="mt-2 text-sm text-ink/60">Kayıt yok.</p> : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="py-2 pr-2">Tarih</th>
                <th className="py-2 pr-2">Kademe</th>
                <th className="py-2 pr-2">Durum</th>
                <th className="py-2 pr-2">Muharebe</th>
                <th className="py-2">Not</th>
              </tr>
            </thead>
            <tbody>
              {data.loglar.map((l) => (
                <tr key={l.id} className="border-b border-ink/15">
                  <td className="py-2 pr-2 tabular-nums">{tarih(l.tarih)}</td>
                  <td className="py-2 pr-2">{l.kademe || "—"}</td>
                  <td className="py-2 pr-2">{DURUM_AD[l.durum as keyof typeof DURUM_AD] ?? l.durum}</td>
                  <td className="py-2 pr-2">{l.muharebe === "eder" ? "Eder" : l.muharebe === "edemez" ? "Edemez" : "—"}</td>
                  <td className="py-2">{l.notlar || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}

function Bilgi({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div className="border border-ink/10 px-3 py-2">
      <dt className="text-xs uppercase tracking-widest text-ink/50">{ad}</dt>
      <dd className="font-semibold">{deger}</dd>
    </div>
  );
}
