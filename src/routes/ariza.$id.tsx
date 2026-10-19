import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useInvalidate } from "@/components/shell";
import { Button, Field, TextInput } from "@/components/ui";
import { yazdirBelge } from "@/components/sened";
import { getFaultReport, updateFault } from "@/lib/zimmet/api";
import { DURUM_AD, hataMetni, tarih } from "@/lib/zimmet/labels";
import { DURUMLAR } from "@/lib/zimmet/schema";

export const Route = createFileRoute("/ariza/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return <Rapor id={id} />;
}

type Log = {
  id: string;
  durum: string;
  notlar: string;
  kademe: string;
  muharebe: string;
  tespit: string;
  gidis: string;
};

function Rapor({ id }: { id: string }) {
  const sorgu = useQuery({ queryKey: ["zimmet", "ariza-rapor", id], queryFn: () => getFaultReport({ data: id }) });
  const [secili, setSecili] = useState("");
  if (sorgu.isLoading) return <p className="text-sm text-ink/60">Rapor hazırlanıyor</p>;
  if (sorgu.error) return <p className="text-signal">{hataMetni(sorgu.error)}</p>;
  const data = sorgu.data;
  if (!data) return null;
  const m = data.malzeme;
  const log = data.loglar.find((l) => l.id === secili) ?? data.loglar[data.loglar.length - 1];
  const muharebe = m.muharebe === "eder" ? "Muharebe eder" : m.muharebe === "edemez" ? "Muharebe edemez" : "Belirtilmedi";
  return (
    <div>
      <div className="no-print mb-4 flex gap-2">
        <Link to="/ariza" className="inline-flex h-11 items-center px-3 text-sm text-ink/60">Arızaya dön</Link>
        <Button type="button" onClick={yazdirBelge}>PDF / Yazdır</Button>
      </div>
      <article id="zimmet-senedi">
        <p className="text-xs uppercase tracking-widest text-ink/50">{data.birlik}</p>
        <h1 className="font-display text-4xl font-semibold tracking-wide">Arıza raporu</h1>
        <p className="mt-1 text-sm text-ink/60">Rapor tarihi {tarih(data.tarih)}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <Bilgi ad="Malzeme" deger={m.ad} />
          <Bilgi ad="Stok" deger={m.stokNo} />
          <Bilgi ad="Seri" deger={m.seriNo || "—"} />
          <Bilgi ad="Durum" deger={DURUM_AD[m.durum]} />
          <Bilgi ad="Muharebe" deger={muharebe} />
          <Bilgi ad="Adet" deger={`${m.miktar} ${m.birim}`} />
          <Bilgi ad="Zimmetli" deger={String(m.zimmetli)} />
          <Bilgi ad="Konum / kademe" deger={m.konum || "—"} />
        </dl>
        {m.aciklama ? <p className="mt-4 text-sm">{m.aciklama}</p> : null}
        {data.zimmetler.length > 0 ? (
          <p className="mt-4 text-sm">
            Üzerinde açık zimmet: {data.zimmetler.map((z) => `${z.rutbe} ${z.personelAd} (${z.miktar})`).join(", ")}
          </p>
        ) : <p className="mt-4 text-sm text-ink/60">Açık zimmet yok.</p>}
        <h2 className="mt-8 font-display text-2xl font-semibold">Geçmiş arızalar</h2>
        {data.loglar.length === 0 ? <p className="mt-2 text-sm text-ink/60">Kayıt yok.</p> : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="py-2 pr-2">Tespit</th>
                <th className="py-2 pr-2">Gidiş</th>
                <th className="py-2 pr-2">Kademe</th>
                <th className="py-2 pr-2">Durum</th>
                <th className="py-2 pr-2">Muharebe</th>
                <th className="py-2">Not</th>
              </tr>
            </thead>
            <tbody>
              {data.loglar.map((l) => (
                <tr key={l.id} className="border-b border-ink/15">
                  <td className="py-2 pr-2 tabular-nums">{tarih(l.tespit)}</td>
                  <td className="py-2 pr-2 tabular-nums">{l.gidis ? tarih(l.gidis) : "—"}</td>
                  <td className="py-2 pr-2">{l.kademe || "—"}</td>
                  <td className="py-2 pr-2">{DURUM_AD[l.durum as keyof typeof DURUM_AD] ?? l.durum}</td>
                  <td className="py-2 pr-2">{l.muharebe === "eder" ? "Eder" : l.muharebe === "edemez" ? "Edemez" : "—"}</td>
                  <td className="py-2">{l.notlar || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
      {log ? <Guncelle key={log.id} log={log} secili={secili || log.id} loglar={data.loglar} onSec={setSecili} /> : null}
    </div>
  );
}

function Guncelle({
  log,
  loglar,
  secili,
  onSec,
}: {
  log: Log;
  loglar: Log[];
  secili: string;
  onSec: (id: string) => void;
}) {
  const invalidate = useInvalidate();
  const [durum, setDurum] = useState(log.durum);
  const [muharebe, setMuharebe] = useState(log.muharebe === "eder" ? "eder" : "edemez");
  const [kademe, setKademe] = useState(log.kademe);
  const [tespit, setTespit] = useState(log.tespit.slice(0, 10));
  const [gidis, setGidis] = useState(log.gidis.slice(0, 10));
  const [not, setNot] = useState(log.notlar);
  return (
    <form
      className="no-print mt-8 max-w-xl space-y-3 border border-ink/10 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (tespit.length < 8) return toast.error("Tespit tarihi gerekli.");
        try {
          await updateFault({
            data: {
              id: log.id,
              durum: durum as "saglam" | "arizali" | "tamirde" | "kayip" | "hurda",
              kademe,
              tespit,
              gidis: gidis || undefined,
              notlar: not,
              muharebe,
            },
          });
          toast.success("Arıza kaydı güncellendi");
          await invalidate();
        } catch (error) {
          toast.error(hataMetni(error));
        }
      }}
    >
      <h2 className="font-display text-2xl font-semibold">Kaydı güncelle</h2>
      {loglar.length > 1 ? (
        <Field label="Hangi kayıt">
          <select className="h-11 w-full border border-ink/15 bg-transparent px-3" value={secili} onChange={(e) => onSec(e.target.value)}>
            {loglar.map((l, i) => (
              <option key={l.id} value={l.id}>{i + 1}. kayıt · tespit {tarih(l.tespit)}</option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="Durum">
        <select className="h-11 w-full border border-ink/15 bg-transparent px-3" value={durum} onChange={(e) => setDurum(e.target.value)}>
          {DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_AD[d]}</option>)}
        </select>
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant={muharebe === "eder" ? "solid" : "ghost"} onClick={() => setMuharebe("eder")}>Muharebe eder</Button>
        <Button type="button" variant={muharebe === "edemez" ? "solid" : "ghost"} onClick={() => setMuharebe("edemez")}>Muharebe edemez</Button>
      </div>
      <Field label="Kademe"><TextInput value={kademe} onChange={(e) => setKademe(e.target.value)} /></Field>
      <Field label="Tespit tarihi"><TextInput type="date" value={tespit} onChange={(e) => setTespit(e.target.value)} required /></Field>
      <Field label="Gidiş tarihi"><TextInput type="date" value={gidis} onChange={(e) => setGidis(e.target.value)} /></Field>
      <Field label="Arıza notu"><TextInput value={not} onChange={(e) => setNot(e.target.value)} /></Field>
      <Button type="submit">Güncelle</Button>
    </form>
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
