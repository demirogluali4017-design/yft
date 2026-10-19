import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, useInvalidate } from "@/components/shell";
import { Sened } from "@/components/sened";
import { Button, Empty, Field, Select, TextInput } from "@/components/ui";
import {
  assignZimmet,
  getSened,
  listAssignments,
  listMaterials,
  listPersonnel,
  returnAssignment,
  updateAssignment,
} from "@/lib/zimmet/api";
import { DURUM_AD, hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/zimmet")({ component: Page });

const SEKMELER = [
  ["ekle", "Zimmet ver"],
  ["cikar", "İade al"],
  ["belge", "Senet"],
  ["bos", "Zimmetsiz"],
] as const;

function Page() {
  return (
    <AppShell need="zimmet">
      <Zimmet />
    </AppShell>
  );
}

function Zimmet() {
  const personel = useQuery({ queryKey: ["zimmet", "personel"], queryFn: () => listPersonnel() });
  const malzeme = useQuery({ queryKey: ["zimmet", "malzeme"], queryFn: () => listMaterials() });
  const acik = useQuery({
    queryKey: ["zimmet", "atamalar", "aktif"],
    queryFn: () => listAssignments({ data: { durum: "aktif" } }),
  });
  const invalidate = useInvalidate();
  const [sekme, setSekme] = useState<(typeof SEKMELER)[number][0]>("ekle");
  const [personnelId, setPersonnelId] = useState("");
  const [belgeKisi, setBelgeKisi] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [miktar, setMiktar] = useState(1);
  const [notlar, setNotlar] = useState("");
  const [sepet, setSepet] = useState<Array<{ materialId: string; ad: string; miktar: number; notlar: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [sened, setSened] = useState<Awaited<ReturnType<typeof getSened>> | null>(null);

  const saglam = (malzeme.data?.malzemeler ?? []).filter((m) => !m.deleted && m.durum === "saglam" && m.musait > 0);
  const kisiler = (personel.data?.personeller ?? []).filter((p) => p.aktif);
  const tamamenBos = (malzeme.data?.malzemeler ?? []).filter((m) => !m.deleted && m.zimmetli === 0);
  const kismenBos = (malzeme.data?.malzemeler ?? []).filter((m) => !m.deleted && m.zimmetli > 0 && m.musait > 0);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Zimmet</h1>
      <p className="mt-1 text-sm text-ink/60">Çıkış personele yazar, iade depoya döndürür. Senet kişi bazındadır.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {SEKMELER.map(([id, ad]) => (
          <Button key={id} type="button" variant={sekme === id ? "solid" : "ghost"} onClick={() => setSekme(id)}>
            {ad}
          </Button>
        ))}
      </div>

      {sekme === "ekle" ? (
        <section className="mt-6">
          <p className="text-sm text-ink/60">Yalnızca zimmetsiz adedi olan kalemler çıkar.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Personel">
              <Select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)}>
                <option value="">Seçin</option>
                {kisiler.map((p) => (
                  <option key={p.id} value={p.id}>{p.rutbe} {p.adSoyad} · {p.sicil}</option>
                ))}
              </Select>
            </Field>
            <Field label="Malzeme">
              <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">Seçin</option>
                {saglam.map((m) => (
                  <option key={m.id} value={m.id}>{m.ad} · zimmetsiz {m.musait}</option>
                ))}
              </Select>
            </Field>
            <Field label="Miktar">
              <TextInput type="number" min={1} value={miktar} onChange={(e) => setMiktar(Number(e.target.value))} />
            </Field>
            <Field label="Not">
              <TextInput value={notlar} onChange={(e) => setNotlar(e.target.value)} />
            </Field>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-3"
            onClick={() => {
              const mal = saglam.find((m) => m.id === materialId);
              if (!mal) return toast.error("Malzeme seçin.");
              if (miktar < 1 || miktar > mal.musait) return toast.error("Zimmetsiz miktarı aşıyor.");
              setSepet((s) => [...s, { materialId: mal.id, ad: mal.ad, miktar, notlar }]);
              setNotlar("");
            }}
          >
            Listeye ekle
          </Button>
          {sepet.length > 0 ? (
            <ul className="mt-4 border border-ink/10 text-sm">
              {sepet.map((s, i) => (
                <li key={`${s.materialId}-${i}`} className="flex justify-between px-3 py-2">
                  <span>{s.ad} · {s.miktar}</span>
                  <button type="button" className="text-signal" onClick={() => setSepet((v) => v.filter((_, n) => n !== i))}>Çıkar</button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            type="button"
            className="mt-3"
            disabled={busy || sepet.length === 0}
            onClick={async () => {
              if (!personnelId) return toast.error("Personel seçin.");
              setBusy(true);
              try {
                const sonuc = await assignZimmet({
                  data: { personnelId, lines: sepet.map((s) => ({ materialId: s.materialId, miktar: s.miktar, notlar: s.notlar })) },
                });
                toast.success(`Zimmet yazıldı · ${sonuc.belgeNo}`);
                setSepet([]);
                await invalidate();
              } catch (error) {
                toast.error(hataMetni(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            Zimmet ver
          </Button>
        </section>
      ) : null}

      {sekme === "cikar" ? (
        <section className="mt-6">
          {acik.isLoading ? <p className="text-sm text-ink/60">Yükleniyor</p> : null}
          {(acik.data?.zimmetler.length ?? 0) === 0 && !acik.isLoading ? <Empty>Açık zimmet yok.</Empty> : null}
          <ul className="divide-y divide-ink/10 border border-ink/10 text-sm">
            {acik.data?.zimmetler.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="font-semibold">{z.malzemeAd} · {z.miktar} {z.birim}</p>
                  <p className="text-ink/60">{z.rutbe} {z.personelAd} · {z.belgeNo} · {tarih(z.assignedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      const yeni = window.prompt("Yeni miktar", String(z.miktar));
                      if (!yeni) return;
                      try {
                        await updateAssignment({ data: { id: z.id, miktar: Number(yeni), notlar: z.notlar } });
                        await invalidate();
                      } catch (error) {
                        toast.error(hataMetni(error));
                      }
                    }}
                  >
                    Düzelt
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={async () => {
                      try {
                        await returnAssignment({ data: z.id });
                        toast.success("İade alındı");
                        await invalidate();
                      } catch (error) {
                        toast.error(hataMetni(error));
                      }
                    }}
                  >
                    İade al
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sekme === "belge" ? (
        <section className="mt-6 max-w-lg space-y-3">
          <p className="text-sm text-ink/60">Seçilen kişinin üzerindeki açık zimmetler senede dökülür.</p>
          <Field label="Personel">
            <Select value={belgeKisi} onChange={(e) => setBelgeKisi(e.target.value)}>
              <option value="">Seçin</option>
              {kisiler.map((p) => (
                <option key={p.id} value={p.id}>{p.rutbe} {p.adSoyad} · {p.sicil}</option>
              ))}
            </Select>
          </Field>
          <Button
            type="button"
            disabled={!belgeKisi}
            onClick={async () => {
              try {
                setSened(await getSened({ data: belgeKisi }));
              } catch (error) {
                toast.error(hataMetni(error));
              }
            }}
          >
            Zimmet belgesi al
          </Button>
        </section>
      ) : null}

      {sekme === "bos" ? (
        <section className="mt-6">
          <h2 className="font-display text-2xl font-semibold">Tamamı zimmetsiz</h2>
          <p className="text-sm text-ink/60">Hiç ayrılmamış stok.</p>
          {tamamenBos.length === 0 ? <div className="mt-3"><Empty>Boşta malzeme yok.</Empty></div> : (
            <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 text-sm">
              {tamamenBos.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 px-3 py-2">
                  <span>{m.ad} · {m.stokNo}</span>
                  <span className="text-ink/60">{m.miktar} {m.birim} · {DURUM_AD[m.durum]}</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-8 font-display text-2xl font-semibold">Kısmen zimmetli</h2>
          <p className="text-sm text-ink/60">Bir kısmı zimmetli, kalan zimmetsiz.</p>
          {kismenBos.length === 0 ? <div className="mt-3"><Empty>Kısmen boşta kalem yok.</Empty></div> : (
            <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 text-sm">
              {kismenBos.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 px-3 py-2">
                  <span>{m.ad}</span>
                  <span className="tabular-nums text-ink/60">zimmetli {m.zimmetli} · zimmetsiz {m.musait}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {sened ? (
        <Sened birlik={sened.birlik} kisi={sened.kisi} zimmetler={sened.zimmetler} gun={sened.tarih} onClose={() => setSened(null)} />
      ) : null}
    </div>
  );
}
