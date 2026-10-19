import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, useInvalidate } from "@/components/shell";
import { Button, Empty, Field, TextInput } from "@/components/ui";
import { addFaultyMaterial, listFaults } from "@/lib/zimmet/api";
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
  const [form, setForm] = useState({ ad: "", stokNo: "", seriNo: "", miktar: "1", birim: "adet", kademe: "", tarih: "", notlar: "" });
  const invalidate = useInvalidate();
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
            Tarih, seri numarası veya adla arayın. Yeni kayıt envantere arızalı olarak eklenir.
          </p>
        </div>
        <Button type="button" onClick={() => setEkle((v) => !v)}>{ekle ? "Liste" : "Malzeme ekle"}</Button>
      </div>

      {ekle ? (
        <form
          className="mt-4 max-w-xl space-y-3 border border-ink/10 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await addFaultyMaterial({
                data: {
                  ad: form.ad,
                  stokNo: form.stokNo,
                  seriNo: form.seriNo,
                  miktar: Number(form.miktar),
                  birim: form.birim,
                  kademe: form.kademe,
                  tarih: form.tarih,
                  notlar: form.notlar,
                  muharebe,
                },
              });
              toast.success("Arızalı olarak envantere alındı");
              setEkle(false);
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
          <Field label="Ad"><TextInput value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok no"><TextInput value={form.stokNo} onChange={(e) => setForm({ ...form, stokNo: e.target.value })} /></Field>
            <Field label="Seri no"><TextInput value={form.seriNo} onChange={(e) => setForm({ ...form, seriNo: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Miktar"><TextInput type="number" min={1} value={form.miktar} onChange={(e) => setForm({ ...form, miktar: e.target.value })} /></Field>
            <Field label="Birim"><TextInput value={form.birim} onChange={(e) => setForm({ ...form, birim: e.target.value })} /></Field>
          </div>
          <Field label="Kademe"><TextInput value={form.kademe} onChange={(e) => setForm({ ...form, kademe: e.target.value })} placeholder="Örn. 2. kademe" required /></Field>
          <Field label="Gidiş tarihi"><TextInput type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} required /></Field>
          <Field label="Arıza notu"><TextInput value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} /></Field>
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
