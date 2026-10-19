import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell";
import { getReport } from "@/lib/zimmet/api";
import { hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <Ozet />
    </AppShell>
  );
}

function Ozet() {
  const rapor = useQuery({ queryKey: ["zimmet", "rapor"], queryFn: () => getReport() });
  if (rapor.isLoading) return <p className="text-sm text-ink/60">Pano hazırlanıyor</p>;
  if (rapor.error) return <p className="text-signal">{hataMetni(rapor.error)}</p>;
  const data = rapor.data;
  if (!data) return null;

  if (data.kind === "personel") {
    return (
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-wide">Üzerinizdeki zimmet</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Sayi etiket="Kalem" deger={data.kalem} />
          <Sayi etiket="Adet" deger={data.adet} />
        </div>
        <Link to="/zimmetim" className="mt-6 inline-flex h-11 items-center bg-field px-4 text-sm font-semibold text-paper">
          Listeyi aç
        </Link>
        <Hareketler satirlar={data.hareketler} kendi />
      </div>
    );
  }

  const tutan = data.personelRapor.filter((p) => p.adet > 0);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Stok panosu</h1>
      <p className="mt-1 max-w-xl text-sm text-ink/60">
        Eldeki miktar, personele ayrılan ve depoda kalan. Zimmet vermek çıkış, iade almak giriş kaydıdır.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Sayi etiket="Elde" deger={data.adet} />
        <Sayi etiket="Ayrılmış" deger={data.zimmetliAdet} />
        <Sayi etiket="Müsait" deger={data.musaitAdet} />
        <Sayi etiket="Açık zimmet" deger={data.aktifZimmet} />
        <Sayi etiket="Dağıtılabilir" deger={data.dagitilabilir} />
        <Sayi etiket="Beklemede" deger={data.beklemede} />
        <Sayi etiket="Arşiv" deger={data.arsiv} />
        <Sayi etiket="Kritik" deger={data.kritik.length} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/zimmet" className="inline-flex h-11 items-center bg-field px-4 text-sm font-semibold text-paper">Zimmet ver</Link>
        <Link to="/envanter" className="inline-flex h-11 items-center border border-ink/15 px-4 text-sm font-semibold">Envanter</Link>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-wide">Kritik stok</h2>
        <p className="text-sm text-ink/60">Sağlam ama depoda adet kalmamış kalemler.</p>
        {data.kritik.length === 0 ? <p className="mt-3 text-sm text-ink/60">Kritik kalem yok.</p> : (
          <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 text-sm">
            {data.kritik.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <Link to="/envanter/$id" params={{ id: m.id }} className="font-semibold hover:underline">{m.ad}</Link>
                <span className="text-ink/60 tabular-nums">{m.stokNo} · elde {m.miktar} · ayrılmış {m.zimmetli}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-wide">Kimde</h2>
        {tutan.length === 0 ? <p className="mt-3 text-sm text-ink/60">Açık zimmet yok.</p> : (
          <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 text-sm">
            {tutan.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <Link to="/personel/$id" params={{ id: p.id }} className="font-semibold hover:underline">{p.rutbe} {p.ad}</Link>
                <span className="text-ink/60 tabular-nums">{p.kalem} kalem · {p.adet} adet</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hareketler satirlar={data.hareketler} />
    </div>
  );
}

function Sayi({ etiket, deger }: { etiket: string; deger: number }) {
  return (
    <div className="border border-ink/10 bg-paper px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-ink/50">{etiket}</p>
      <p className="font-display text-4xl font-semibold tabular-nums">{deger}</p>
    </div>
  );
}

function Hareketler({
  satirlar,
  kendi = false,
}: {
  satirlar: Array<{ id: string; action: string; malzeme: string; personel: string; miktar: number; tarih: string }>;
  kendi?: boolean;
}) {
  const ad: Record<string, string> = { zimmet: "Çıkış", iade: "Giriş", duzenle: "Düzeltme" };
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold tracking-wide">Denetim kaydı</h2>
      {satirlar.length === 0 ? <p className="mt-3 text-sm text-ink/60">Henüz hareket yok.</p> : (
        <ul className="mt-3 divide-y divide-ink/10 border border-ink/10">
          {satirlar.map((h) => (
            <li key={h.id} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-semibold">{ad[h.action] ?? h.action}</span>
                {" · "}
                {h.malzeme}
                {kendi ? "" : ` · ${h.personel}`}
                {" · "}
                <span className="tabular-nums">{h.miktar}</span>
              </span>
              <span className="shrink-0 text-ink/50 tabular-nums">{tarih(h.tarih)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}