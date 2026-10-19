import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, useInvalidate } from "@/components/shell";
import { Button, Empty, Field, TextInput } from "@/components/ui";
import { listFaults, listMaterials, setMaterialStatus } from "@/lib/zimmet/api";
import { DURUM_AD, hataMetni, tarih } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/ariza")({ component: Page });

function Page() {
  return (
    <AppShell need="envanter">
      <Ariza />
    </AppShell>
  );
}

function Ariza() {
  const [q, setQ] = useState("");
  const [bas, setBas] = useState("");
  const [bit, setBit] = useState("");
  const [aranan, setAranan] = useState({ q: "", bas: "", bit: "" });
  const [ekle, setEkle] = useState(false);
  const [muharebe, setMuharebe] = useState<"eder" | "edemez">("edemez");
  const [ara, setAra] = useState("");
  const [secim, setSecim] = useState("");
  const [kademe, setKademe] = useState("");
  const [gun, setGun] = useState("");
  const [not, setNot] = useState("");
  const invalidate = useInvalidate();
  const envanter = useQuery({
    queryKey: ["zimmet", "malzeme"],
    queryFn: () => listMaterials(),
    enabled: ekle,
  });
  const adaylar = useMemo(() => {
    const hepsi = (envanter.data?.malzemeler ?? []).filter((m) => !m.deleted);
    const arama = ara.trim().toLocaleLowerCase("tr");
    const suzulmus = arama
      ? hepsi.filter((m) => [m.ad, m.stokNo, m.seriNo, m.kategori].join(" ").toLocaleLowerCase("tr").includes(arama))
      : hepsi;
    return suzulmus.slice(0, 30);
  }, [envanter.data, ara]);
  const secilen = (envanter.data?.malzemeler ?? []).find((m) => m.id === secim);
  const liste = useQuery({
    queryKey: ["zimmet", "ariza", aranan],
    queryFn: () => listFaults({ data: aranan }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-wide">Arızalı malzeme</h1>
          <p className="mt-1 max-w-xl text-sm text-ink/60">
            Envanterden malzemeyi seçin. Ad, stok ve seri oradan gelir.
          </p>
        </div>
        <Button type="button" onClick={() => setEkle((v) => !v)}>{ekle ? "Liste" : "Malzeme ekle"}</Button>
      </div>

      {ekle ? (
        <form
          className="mt-4 max-w-xl space-y-3 border border-ink/10 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!secilen) return toast.error("Envanterden malzeme seçin.");
            if (kademe.trim().length < 2) return toast.error("Kademe yazın.");
            if (gun.length < 8) return toast.error("Tarih seçin.");
            try {
              await setMaterialStatus({
                data: {
                  id: secilen.id,
                  durum: "arizali",
                  kademe,
                  tarih: gun,
                  notlar: not,
                  muharebe,
                },
              });
              toast.success("Arızalı olarak işaretlendi");
              setEkle(false);
              setSecim("");
              setKademe("");
              setNot("");
              await invalidate();
            } catch (error) {
              toast.error(hataMetni(error));
            }
          }}
        >
          <div className="flex gap-2">
            <Button type="button" variant={muharebe === "eder" ? "solid" : "ghost"} onClick={() => setMuharebe("eder")}>Muharebe eder</Button>
            <Button type="button" variant={muharebe === "edemez" ? "solid" : "ghost"} onClick={() => setMuharebe("edemez")}>Muharebe edemez</Button>
          </div>
          <Field label="Envanterde ara">
            <TextInput value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ad, stok veya seri" />
          </Field>
          <div className="max-h-52 overflow-y-auto border border-ink/10 text-sm">
            {envanter.isLoading ? <p className="px-3 py-2 text-ink/60">Yükleniyor</p> : null}
            {adaylar.length === 0 && !envanter.isLoading ? <p className="px-3 py-2 text-ink/60">Malzeme yok.</p> : null}
            {adaylar.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`block w-full px-3 py-2 text-left ${m.id === secim ? "bg-field text-paper" : "hover:bg-ink/5"}`}
                onClick={() => setSecim(m.id)}
              >
                <span className="font-semibold">{m.ad}</span>
                <span className="block text-xs opacity-80">
                  {m.stokNo}{m.seriNo ? ` · seri ${m.seriNo}` : ""} · {m.miktar} {m.birim} · {DURUM_AD[m.durum]}
                </span>
              </button>
            ))}
          </div>
          {!ara && (envanter.data?.malzemeler.length ?? 0) > 30 ? (
            <p className="text-xs text-ink/50">İlk 30 malzeme görünüyor. Ad, stok veya seri yazarak bulun.</p>
          ) : null}
          {secilen ? (
            <p className="text-sm text-ink/70">
              Seçilen: {secilen.ad} · stok {secilen.stokNo}
              {secilen.seriNo ? ` · seri ${secilen.seriNo}` : ""} · {secilen.miktar} {secilen.birim}
            </p>
          ) : null}
          <Field label="Kademe"><TextInput value={kademe} onChange={(e) => setKademe(e.target.value)} placeholder="Örn. 2. kademe" required /></Field>
          <Field label="Gidiş tarihi"><TextInput type="date" value={gun} onChange={(e) => setGun(e.target.value)} required /></Field>
          <Field label="Arıza notu"><TextInput value={not} onChange={(e) => setNot(e.target.value)} /></Field>
          <Button type="submit">Kaydet</Button>
        </form>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_10rem_10rem_auto]">
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, seri veya stok" aria-label="Ara" />
            <TextInput type="date" value={bas} onChange={(e) => setBas(e.target.value)} aria-label="Başlangıç" />
            <TextInput type="date" value={bit} onChange={(e) => setBit(e.target.value)} aria-label="Bitiş" />
            <Button type="button" onClick={() => setAranan({ q, bas, bit })}>Ara</Button>
          </div>
          {liste.isLoading ? <p className="mt-6 text-sm text-ink/60">Yükleniyor</p> : null}
          {liste.error ? <p className="mt-6 text-signal">{hataMetni(liste.error)}</p> : null}
          {(liste.data?.kayitlar.length ?? 0) === 0 && !liste.isLoading ? <div className="mt-6"><Empty>Bu aramada arıza kaydı yok.</Empty></div> : null}
          <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 text-sm">
            {liste.data?.kayitlar.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <Link to="/ariza/$id" params={{ id: k.materialId }} className="font-semibold hover:underline">{k.ad}</Link>
                  <p className="text-ink/60">
                    {tarih(k.tarih)} · {k.kademe || "kademe yazılmamış"} · seri {k.seriNo || "—"} · {DURUM_AD[k.durum as keyof typeof DURUM_AD] ?? k.durum}
                    {k.muharebe === "eder" ? " · muharebe eder" : k.muharebe === "edemez" ? " · muharebe edemez" : ""}
                  </p>
                </div>
                <Link to="/ariza/$id" params={{ id: k.materialId }} className="inline-flex h-11 items-center border border-ink/15 px-3 font-semibold">
                  Rapor
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
