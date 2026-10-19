import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/shell";
import { Sened } from "@/components/sened";
import { Button } from "@/components/ui";
import { getPersonnel, getSened } from "@/lib/zimmet/api";
import { hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/personel/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <Detay id={id} />
    </AppShell>
  );
}

function Detay({ id }: { id: string }) {
  const sorgu = useQuery({ queryKey: ["zimmet", "personel", id], queryFn: () => getPersonnel({ data: id }) });
  const [sened, setSened] = useState<Awaited<ReturnType<typeof getSened>> | null>(null);
  if (sorgu.isLoading) return <p className="text-sm text-ink/60">Yükleniyor</p>;
  if (sorgu.error) return <p className="text-signal">{hataMetni(sorgu.error)}</p>;
  const data = sorgu.data;
  if (!data) return null;
  const p = data.kisi;
  const acik = data.zimmetler.filter((z) => z.durum === "aktif");
  return (
    <div>
      <Link to="/personel" className="text-sm text-ink/60">Personele dön</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide">{p.rutbe} {p.adSoyad}</h1>
      <p className="text-sm text-ink/60">
        Sicil {p.sicil}{p.gorev ? ` · ${p.gorev}` : ""}{p.telefon ? ` · ${p.telefon}` : ""}{p.birlik ? ` · ${p.birlik}` : ""}
      </p>
      <Button
        type="button"
        className="mt-4"
        variant="ghost"
        onClick={async () => {
          try {
            setSened(await getSened({ data: p.id }));
          } catch (error) {
            setSened(null);
            alert(hataMetni(error));
          }
        }}
      >
        Zimmet senedi
      </Button>
      <h2 className="mt-8 font-display text-2xl font-semibold">Zimmetler</h2>
      <ul className="mt-2 divide-y divide-ink/10 border border-ink/10 text-sm">
        {data.zimmetler.length === 0 ? <li className="px-3 py-3 text-ink/60">Kayıt yok.</li> : null}
        {data.zimmetler.map((z) => (
          <li key={z.id} className="flex justify-between gap-3 px-3 py-2">
            <span>{z.malzemeAd} · {z.miktar} {z.birim} · {z.durum === "aktif" ? "açık" : "iade"}</span>
            <span className="text-ink/50">{tarih(z.assignedAt)}{z.returnedAt ? ` – ${tarih(z.returnedAt)}` : ""}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink/60">Açık kalem: {acik.length}</p>
      {sened ? (
        <Sened birlik={sened.birlik} kisi={sened.kisi} zimmetler={sened.zimmetler} gun={sened.tarih} onClose={() => setSened(null)} />
      ) : null}
    </div>
  );
}
