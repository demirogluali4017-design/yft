import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, useWorkspaceQuery } from "@/components/shell";
import { Button, TextInput } from "@/components/ui";
import { listPersonnel, listZimmetGecmisi } from "@/lib/zimmet/api";
import { hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/gecmis")({ component: Page });

const ISLEM: Record<string, string> = {
  zimmet: "Çıkış",
  iade: "Giriş",
  duzenle: "Düzeltme",
};

function Page() {
  return (
    <AppShell need="ozet">
      <Gecmis />
    </AppShell>
  );
}

function Gecmis() {
  const [kisi, setKisi] = useState("");
  const [q, setQ] = useState("");
  const [aranan, setAranan] = useState({ personnelId: "", q: "" });
  const oturum = useWorkspaceQuery();
  const kadro = oturum.data?.profile?.role === "komutan" || oturum.data?.profile?.role === "yetkili";
  const personel = useQuery({
    queryKey: ["zimmet", "personel"],
    queryFn: () => listPersonnel(),
    enabled: kadro,
  });
  const liste = useQuery({
    queryKey: ["zimmet", "gecmis", aranan],
    queryFn: () => listZimmetGecmisi({ data: aranan }),
  });
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Zimmet geçmişi</h1>
      <p className="mt-1 text-sm text-ink/60">Kimin üzerine ne girmiş, ne çıkmış. İşlemi kim, hangi tarihte yazmış.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[16rem_1fr_auto]">
        {kadro ? (
          <select className="h-11 border border-ink/15 bg-transparent px-3 text-sm" value={kisi} onChange={(e) => setKisi(e.target.value)} aria-label="Personel">
            <option value="">Tüm personel</option>
            {(personel.data?.personeller ?? []).filter((p) => p.aktif).map((p) => (
              <option key={p.id} value={p.id}>{p.rutbe} {p.adSoyad}</option>
            ))}
          </select>
        ) : <div />}
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Malzeme, seri veya yapan" aria-label="Ara" />
        <Button type="button" onClick={() => setAranan({ personnelId: kisi, q })}>Ara</Button>
      </div>
      {liste.isLoading ? <p className="mt-6 text-sm text-ink/60">Yükleniyor</p> : null}
      {liste.error ? <p className="mt-6 text-signal">{hataMetni(liste.error)}</p> : null}
      <div className="mt-4 overflow-x-auto border border-ink/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/5 text-xs uppercase tracking-widest text-ink/60">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">İşlem</th>
              <th className="px-3 py-2">Malzeme</th>
              <th className="px-3 py-2">Kime</th>
              <th className="px-3 py-2">Yapan</th>
              <th className="px-3 py-2">Not</th>
            </tr>
          </thead>
          <tbody>
            {(liste.data?.hareketler.length ?? 0) === 0 && !liste.isLoading ? (
              <tr><td className="px-3 py-3 text-ink/60" colSpan={6}>Kayıt yok.</td></tr>
            ) : null}
            {liste.data?.hareketler.map((h) => (
              <tr key={h.id} className="border-t border-ink/10">
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{tarih(h.tarih.slice(0, 10))} {h.tarih.slice(11)}</td>
                <td className="px-3 py-2 font-semibold">{ISLEM[h.action] ?? h.action}</td>
                <td className="px-3 py-2">{h.malzeme}{h.seriNo ? ` · ${h.seriNo}` : ""} · {h.miktar}</td>
                <td className="px-3 py-2">{h.personel}</td>
                <td className="px-3 py-2">{h.yapan || "—"}</td>
                <td className="px-3 py-2 text-ink/70">{h.notlar || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
