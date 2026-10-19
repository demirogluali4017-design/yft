import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, useWorkspaceQuery } from "@/components/shell";
import { Button } from "@/components/ui";
import { MalzemeDialog, ZimmetDialog } from "./envanter";
import { getMaterial } from "@/lib/zimmet/api";
import { DURUM_AD, hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/envanter/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <AppShell need="envanter">
      <Detay id={id} />
    </AppShell>
  );
}

function Detay({ id }: { id: string }) {
  const [duzenle, setDuzenle] = useState(false);
  const [zimmet, setZimmet] = useState(false);
  const { data: oturum } = useWorkspaceQuery();
  const sorgu = useQuery({ queryKey: ["zimmet", "malzeme", id], queryFn: () => getMaterial({ data: id }) });
  if (sorgu.isLoading) return <p className="text-sm text-ink/60">Yükleniyor</p>;
  if (sorgu.error) return <p className="text-signal">{hataMetni(sorgu.error)}</p>;
  const data = sorgu.data;
  if (!data) return null;
  const m = data.malzeme;
  const zimmetYetkisi =
    oturum?.profile?.role === "komutan" ||
    (oturum?.profile?.role === "yetkili" && oturum.profile.yetkiler.zimmet);
  return (
    <div>
      <Link to="/envanter" className="text-sm text-ink/60">Envantere dön</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/50">{m.stokNo}</p>
          <h1 className="font-display text-4xl font-semibold tracking-wide">{m.ad}</h1>
        </div>
        <div className="flex gap-2">
          {zimmetYetkisi && !m.deleted && m.durum === "saglam" && m.musait > 0 ? (
            <Button type="button" onClick={() => setZimmet(true)}>Zimmet ver</Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => setDuzenle(true)}>Düzenle</Button>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Bilgi ad="Durum" deger={m.deleted ? "Düşüldü" : DURUM_AD[m.durum]} />
        <Bilgi ad="Kategori" deger={m.kategori} />
        <Bilgi ad="Seri" deger={m.seriNo || "—"} />
        <Bilgi ad="Konum" deger={m.konum || "—"} />
        <Bilgi ad="Zimmet miktarı" deger={`${m.miktar} ${m.birim}`} />
        <Bilgi ad="Zimmetli" deger={String(m.zimmetli)} />
        <Bilgi ad="Zimmetsiz" deger={String(m.musait)} />
      </dl>
      {m.aciklama ? <p className="mt-4 text-sm text-ink/70">{m.aciklama}</p> : null}
      <h2 className="mt-8 font-display text-2xl font-semibold">Zimmetler</h2>
      <ul className="mt-2 divide-y divide-ink/10 border border-ink/10 text-sm">
        {data.zimmetler.length === 0 ? <li className="px-3 py-3 text-ink/60">Zimmet yok.</li> : null}
        {data.zimmetler.map((z) => (
          <li key={z.id} className="flex justify-between gap-3 px-3 py-2">
            <span>{z.personelAd} · {z.durum === "aktif" ? "açık" : "iade"} · {z.miktar} {z.birim}</span>
            <span className="text-ink/50 tabular-nums">{tarih(z.assignedAt)}</span>
          </li>
        ))}
      </ul>
      {data.loglar.length > 0 ? (
        <>
          <h2 className="mt-8 font-display text-2xl font-semibold">Durum geçmişi</h2>
          <ul className="mt-2 text-sm">
            {data.loglar.map((l) => (
              <li key={l.id} className="border-t border-ink/10 py-2">
                {DURUM_AD[l.durum as keyof typeof DURUM_AD] ?? l.durum} · {tarih(l.tarih)}
                {l.kademe ? ` · ${l.kademe}` : ""}
                {l.notlar ? ` · ${l.notlar}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <MalzemeDialog open={duzenle} kayit={m} onClose={() => setDuzenle(false)} onSaved={async () => { await sorgu.refetch(); }} />
      <ZimmetDialog mal={zimmet ? m : null} onClose={() => setZimmet(false)} />
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
