import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, useWorkspaceQuery } from "@/components/shell";
import { Sened } from "@/components/sened";
import { Button, Empty } from "@/components/ui";
import { getSened, listAssignments } from "@/lib/zimmet/api";
import { hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/zimmetim")({ component: Page });

function Page() {
  return (
    <AppShell>
      <Benim />
    </AppShell>
  );
}

function Benim() {
  const { data: ws } = useWorkspaceQuery();
  const liste = useQuery({
    queryKey: ["zimmet", "atamalar", "benim"],
    queryFn: () => listAssignments({ data: {} }),
  });
  const [sekme, setSekme] = useState<"aktif" | "iade">("aktif");
  const [sened, setSened] = useState<Awaited<ReturnType<typeof getSened>> | null>(null);
  const satirlar = (liste.data?.zimmetler ?? []).filter((z) => z.durum === sekme);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-wide">
          {ws?.profile?.role === "personel" ? "Zimmetim" : "Zimmet kayıtları"}
        </h1>
        {ws?.personnelId ? (
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                setSened(await getSened({ data: ws.personnelId! }));
              } catch (error) {
                toast.error(hataMetni(error));
              }
            }}
          >
            Senedim
          </Button>
        ) : null}
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant={sekme === "aktif" ? "solid" : "ghost"} onClick={() => setSekme("aktif")}>Açık</Button>
        <Button type="button" variant={sekme === "iade" ? "solid" : "ghost"} onClick={() => setSekme("iade")}>Geçmiş</Button>
      </div>
      {liste.isLoading ? <p className="mt-6 text-sm text-ink/60">Yükleniyor</p> : null}
      {liste.error ? <p className="mt-6 text-signal">{hataMetni(liste.error)}</p> : null}
      {satirlar.length === 0 && !liste.isLoading ? <div className="mt-6"><Empty>Bu bölümde kayıt yok.</Empty></div> : null}
      <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 text-sm">
        {satirlar.map((z) => (
          <li key={z.id} className="px-3 py-3">
            <p className="font-semibold">{z.malzemeAd}</p>
            <p className="text-ink/60">
              {z.miktar} {z.birim}
              {ws?.profile?.role === "personel" ? "" : ` · ${z.personelAd}`}
              {" · "}{z.belgeNo} · {tarih(z.assignedAt)}
              {z.returnedAt ? ` – ${tarih(z.returnedAt)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {sened ? (
        <Sened birlik={sened.birlik} kisi={sened.kisi} zimmetler={sened.zimmetler} gun={sened.tarih} veren={sened.veren} onClose={() => setSened(null)} />
      ) : null}
    </div>
  );
}
