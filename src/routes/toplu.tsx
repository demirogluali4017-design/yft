import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, useInvalidate } from "@/components/shell";
import { Button, Field, TextInput } from "@/components/ui";
import { listAssignments, listMaterials, listPersonnel, assignZimmet, returnAssignment } from "@/lib/zimmet/api";
import { hataMetni } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/toplu")({ component: Page });

function Page() {
  return (
    <AppShell need="zimmet">
      <Toplu />
    </AppShell>
  );
}

function Toplu() {
  const [sekme, setSekme] = useState<"ver" | "cek">("ver");
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Toplu zimmet</h1>
      <p className="mt-1 text-sm text-ink/60">Aynı malzemeyi birkaç kişiye birden verin veya açık zimmetleri birlikte çekin.</p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant={sekme === "ver" ? "solid" : "ghost"} onClick={() => setSekme("ver")}>Zimmet ver</Button>
        <Button type="button" variant={sekme === "cek" ? "solid" : "ghost"} onClick={() => setSekme("cek")}>Zimmet çek</Button>
      </div>
      <div className="mt-6">{sekme === "ver" ? <Ver /> : <Cek />}</div>
    </div>
  );
}

function ara(metin: string) {
  return metin.trim().toLocaleLowerCase("tr");
}

function Ver() {
  const malzemeler = useQuery({ queryKey: ["zimmet", "malzeme"], queryFn: () => listMaterials() });
  const personel = useQuery({ queryKey: ["zimmet", "personel"], queryFn: () => listPersonnel() });
  const invalidate = useInvalidate();
  const [arama, setArama] = useState("");
  const [kisiAra, setKisiAra] = useState("");
  const [malzemeId, setMalzemeId] = useState("");
  const [secili, setSecili] = useState<Record<string, number>>({});
  const [notlar, setNotlar] = useState("");
  const [busy, setBusy] = useState(false);

  const liste = (malzemeler.data?.malzemeler ?? []).filter((m) => !m.deleted && m.durum === "saglam" && m.musait > 0);
  const q = ara(arama);
  const bulunan = liste
    .filter((m) => !q || `${m.ad} ${m.stokNo} ${m.seriNo}`.toLocaleLowerCase("tr").includes(q))
    .sort((a, b) => b.musait - a.musait || a.ad.localeCompare(b.ad, "tr"))
    .slice(0, 30);
  const mal = liste.find((m) => m.id === malzemeId) ?? null;
  const kq = ara(kisiAra);
  const kisiler = (personel.data?.personeller ?? [])
    .filter((p) => p.aktif)
    .filter((p) => !kq || `${p.rutbe} ${p.adSoyad} ${p.sicil}`.toLocaleLowerCase("tr").includes(kq))
    .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
  const toplam = Object.values(secili).reduce((n, v) => n + (Number(v) || 0), 0);
  const kisiSayisi = Object.keys(secili).length;
  const fazla = mal ? toplam > mal.musait : false;

  function sec(id: string, acik: boolean) {
    setSecili((eski) => {
      const sonraki = { ...eski };
      if (acik) sonraki[id] = sonraki[id] || 1;
      else delete sonraki[id];
      return sonraki;
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field label="Malzeme ara">
        <TextInput value={arama} placeholder="Ad, stok veya seri" onChange={(e) => setArama(e.target.value)} />
      </Field>
      {mal ? (
        <div className="border border-ink/15 p-3">
          <p className="font-semibold">{mal.ad}</p>
          <p className="text-sm text-ink/70">
            {mal.seriNo ? `Seri ${mal.seriNo} · ` : ""}zimmetsiz {mal.musait} {mal.birim}
          </p>
          <button type="button" className="mt-2 text-sm underline" onClick={() => { setMalzemeId(""); setSecili({}); }}>Başka malzeme seç</button>
        </div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-auto">
          {bulunan.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full border border-ink/10 px-3 py-2 text-left text-sm"
                onClick={() => setMalzemeId(m.id)}
              >
                <span className="block font-semibold">{m.ad}</span>
                <span className="text-ink/60">{m.seriNo ? `Seri ${m.seriNo} · ` : ""}zimmetsiz {m.musait} {m.birim}</span>
              </button>
            </li>
          ))}
          {bulunan.length === 0 ? <li className="text-sm text-ink/60">Zimmetsiz malzeme yok.</li> : null}
        </ul>
      )}
      {mal ? (
        <>
          <Field label="Personel ara">
            <TextInput value={kisiAra} placeholder="Ad, rütbe veya sicil" onChange={(e) => setKisiAra(e.target.value)} />
          </Field>
          <ul className="max-h-80 space-y-2 overflow-auto">
            {kisiler.map((p) => {
              const acik = secili[p.id] != null;
              return (
                <li key={p.id} className="flex items-center gap-3 border border-ink/10 px-3 py-2">
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <input type="checkbox" className="size-5 shrink-0" checked={acik} onChange={(e) => sec(p.id, e.target.checked)} />
                    <span className="min-w-0 text-sm">
                      <span className="block">{p.rutbe} {p.adSoyad}</span>
                      <span className="text-ink/60">{p.sicil}</span>
                    </span>
                  </label>
                  {acik ? (
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      aria-label={`${p.adSoyad} miktar`}
                      className="h-11 w-16 border border-ink/15 px-2 text-sm"
                      value={secili[p.id]}
                      onChange={(e) => setSecili((eski) => ({ ...eski, [p.id]: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                  ) : null}
                </li>
              );
            })}
            {kisiler.length === 0 ? <li className="text-sm text-ink/60">Personel yok.</li> : null}
          </ul>
          <p className={`text-sm ${fazla ? "text-signal" : "text-ink/70"}`}>
            Seçilen {kisiSayisi} kişi · toplam {toplam} {mal.birim}
            {fazla ? ` · zimmetsiz ${mal.musait} ${mal.birim} yetmiyor` : ""}
          </p>
          <Field label="Not">
            <TextInput value={notlar} onChange={(e) => setNotlar(e.target.value)} />
          </Field>
          <Button
            type="button"
            disabled={busy || fazla || toplam < 1}
            onClick={() => {
              void (async () => {
                setBusy(true);
                const yazilacak = Object.entries(secili).map(([personnelId, miktar]) => ({ personnelId, miktar }));
                let yazilan = 0;
                try {
                  for (const kisi of yazilacak) {
                    await assignZimmet({
                      data: { personnelId: kisi.personnelId, lines: [{ materialId: mal.id, miktar: kisi.miktar, notlar }] },
                    });
                    yazilan += 1;
                  }
                  toast.success(`${yazilan} kişiye zimmet yazıldı`);
                  setSecili({});
                  setNotlar("");
                  setMalzemeId("");
                  await invalidate();
                } catch (error) {
                  if (yazilan > 0) {
                    toast.error(`${yazilan} kişiye yazıldı, kalanı yazılamadı. ${hataMetni(error)}`);
                    setSecili({});
                    await invalidate();
                  } else {
                    toast.error(hataMetni(error));
                  }
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {busy ? "Yazılıyor…" : "Zimmet ver"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function Cek() {
  const zimmet = useQuery({
    queryKey: ["zimmet", "atama", "aktif"],
    queryFn: () => listAssignments({ data: { personnelId: "", durum: "aktif" } }),
  });
  const invalidate = useInvalidate();
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const q = ara(arama);
  const liste = useMemo(
    () => (zimmet.data?.zimmetler ?? []).filter((z) => !q || `${z.malzemeAd} ${z.seriNo} ${z.personelAd} ${z.sicil}`.toLocaleLowerCase("tr").includes(q)),
    [zimmet.data, q],
  );
  const adet = liste.filter((z) => secili[z.id]).length;

  return (
    <div className="max-w-xl space-y-4">
      <Field label="Ara">
        <TextInput value={arama} placeholder="Malzeme, seri veya kişi" onChange={(e) => setArama(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setSecili(Object.fromEntries(liste.map((z) => [z.id, true])))}>Görünenleri seç</Button>
        <Button type="button" variant="ghost" onClick={() => setSecili({})}>Seçimi bırak</Button>
      </div>
      <ul className="max-h-[28rem] space-y-1 overflow-auto">
        {liste.map((z) => (
          <li key={z.id}>
            <label className="flex items-start gap-3 border border-ink/10 px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0"
                checked={!!secili[z.id]}
                onChange={(e) => setSecili((eski) => ({ ...eski, [z.id]: e.target.checked }))}
              />
              <span>
                <span className="block font-semibold">{z.malzemeAd}{z.seriNo ? ` · ${z.seriNo}` : ""}</span>
                <span className="text-ink/70">{z.rutbe} {z.personelAd} · {z.miktar} {z.birim}</span>
              </span>
            </label>
          </li>
        ))}
        {liste.length === 0 ? <li className="text-sm text-ink/60">Açık zimmet yok.</li> : null}
      </ul>
      <Button
        type="button"
        disabled={busy || adet < 1}
        onClick={() => {
          void (async () => {
            setBusy(true);
            const ids = liste.filter((z) => secili[z.id]).map((z) => z.id);
            let cekilen = 0;
            try {
              for (const id of ids) {
                await returnAssignment({ data: id });
                cekilen += 1;
              }
              toast.success(`${cekilen} zimmet çekildi`);
              setSecili({});
              await invalidate();
            } catch (error) {
              if (cekilen > 0) {
                toast.error(`${cekilen} zimmet çekildi, kalanı çekilemedi. ${hataMetni(error)}`);
                setSecili({});
                await invalidate();
              } else {
                toast.error(hataMetni(error));
              }
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? "Çekiliyor…" : `Seçilenleri çek${adet ? ` (${adet})` : ""}`}
      </Button>
    </div>
  );
}
