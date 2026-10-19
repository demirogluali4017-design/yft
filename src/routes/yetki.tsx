import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, useInvalidate, useWorkspaceQuery } from "@/components/shell";
import { Button, Empty } from "@/components/ui";
import { listYetkiler, setYetki } from "@/lib/zimmet/api";
import { ROL_AD, hataMetni } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/yetki")({ component: Page });

function Page() {
  return (
    <AppShell need="komutan">
      <Yetki />
    </AppShell>
  );
}

function Yetki() {
  const { data: ws } = useWorkspaceQuery();
  const sorgu = useQuery({ queryKey: ["zimmet", "yetki"], queryFn: () => listYetkiler() });
  const invalidate = useInvalidate();
  const komutan = ws?.profile?.role === "komutan";

  async function ver(userId: string, role: "yetkili" | "personel" | "beklemede", preset?: "tam" | "sinirli") {
    if (!komutan) return toast.error("Yetki vermek ve almak yalnız kol komutanına aittir.");
    try {
      await setYetki({ data: { userId, role, preset } });
      toast.success("Yetki güncellendi");
      await invalidate();
    } catch (error) {
      toast.error(hataMetni(error));
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Yetki</h1>
      <p className="mt-1 max-w-xl text-sm text-ink/60">
        Yetkiyi yalnız kol komutanı verir ve alır. Hesabı olmayan kişiye önce Personel sayfasından şifre açın.
      </p>
      {sorgu.isLoading ? <p className="mt-6 text-sm text-ink/60">Yükleniyor</p> : null}
      {(sorgu.data?.personeller.length ?? 0) === 0 && !sorgu.isLoading ? <div className="mt-6"><Empty>Personel yok.</Empty></div> : null}
      <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
        {sorgu.data?.personeller.map((p) => (
          <li key={p.id} className="px-3 py-3">
            <p className="font-semibold">{p.rutbe} {p.adSoyad}</p>
            <p className="text-sm text-ink/60">
              Sicil {p.sicil}{p.gorev ? ` · ${p.gorev}` : ""} · {p.rol ? ROL_AD[p.rol] : "hesabı yok"}
            </p>
            {p.userId && komutan ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => ver(p.userId!, "yetkili", "tam")}>Tam yetki</Button>
                <Button type="button" variant="ghost" onClick={() => ver(p.userId!, "yetkili", "sinirli")}>Sınırlı yetki</Button>
                <Button type="button" variant="ghost" onClick={() => ver(p.userId!, "personel")}>Yalnız personel</Button>
                <Button type="button" variant="danger" onClick={() => ver(p.userId!, "beklemede")}>Yetkiyi al</Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink/50">Hesabı yok. Yetki için önce giriş hesabı açın.</p>
            )}
          </li>
        ))}
      </ul>
      {(sorgu.data?.disari.length ?? 0) > 0 ? (
        <>
          <h2 className="mt-8 font-display text-2xl font-semibold">Kadrodaki kaydı olmayan hesaplar</h2>
          <ul className="mt-3 divide-y divide-ink/10 border border-ink/10">
            {sorgu.data?.disari.map((k) => (
              <li key={k.userId} className="px-3 py-3">
                <p className="font-semibold">{k.rutbe} {k.adSoyad}</p>
                <p className="text-sm text-ink/60">Sicil {k.sicil} · {ROL_AD[k.role]}</p>
                {komutan ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" onClick={() => ver(k.userId, "yetkili", "tam")}>Tam yetki</Button>
                    <Button type="button" variant="ghost" onClick={() => ver(k.userId, "personel")}>Personel yap</Button>
                    <Button type="button" variant="danger" onClick={() => ver(k.userId, "beklemede")}>Yetkiyi al</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
