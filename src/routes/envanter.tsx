import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, useInvalidate, useWorkspaceQuery } from "@/components/shell";
import { Button, Dialog, Empty, Field, Select, TextInput } from "@/components/ui";
import { yazdirBelge } from "@/components/sened";
import { assignZimmet, getMaterial, listAssignments, listMaterials, listPersonnel, removeMaterial, returnAssignment, saveMaterial, updateAssignment, type Material } from "@/lib/zimmet/api";
import { DURUM_AD, SINIF_AD, hataMetni, stokSinifi, tarih } from "@/lib/zimmet/labels";
import { DURUMLAR, KATEGORILER, malzemeSchema, type MalzemeInput } from "@/lib/zimmet/schema";

export const Route = createFileRoute("/envanter")({ component: Page });

function Page() {
  return (
    <AppShell need="envanter">
      <Envanter />
    </AppShell>
  );
}

function Envanter() {
  const liste = useQuery({ queryKey: ["zimmet", "malzeme"], queryFn: () => listMaterials() });
  const { data: oturum } = useWorkspaceQuery();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState("tumu");
  const [kategori, setKategori] = useState("tumu");
  const [acik, setAcik] = useState(false);
  const [zimmet, setZimmet] = useState<Material | null>(null);
  const [detay, setDetay] = useState<Material | null>(null);
  const [form, setForm] = useState<Material | null>(null);
  const invalidate = useInvalidate();
  const zimmetYetkisi =
    oturum?.profile?.role === "komutan" ||
    (oturum?.profile?.role === "yetkili" && oturum.profile.yetkiler.zimmet);
  const kategoriler = useMemo(() => {
    const set = new Set((liste.data?.malzemeler ?? []).map((m) => m.kategori).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [liste.data]);

  const satirlar = useMemo(() => {
    const hepsi = liste.data?.malzemeler ?? [];
    const aranan = q.trim().toLocaleLowerCase("tr");
    return hepsi.filter((m) => {
      if (filtre !== "dusulen" && m.deleted) return false;
      if (filtre === "dusulen" && !m.deleted) return false;
      if (filtre === "dagitilabilir" && !(m.durum === "saglam" && m.musait > 0 && !m.deleted)) return false;
      if (filtre === "zimmetli" && m.zimmetli <= 0) return false;
      if (filtre === "beklemede" && m.durum !== "arizali" && m.durum !== "tamirde") return false;
      if (filtre === "arsiv" && m.durum !== "kayip" && m.durum !== "hurda" && !m.deleted) return false;
      if (filtre === "kritik" && !(m.durum === "saglam" && m.musait === 0 && !m.deleted)) return false;
      if (kategori !== "tumu" && m.kategori !== kategori) return false;
      if (!aranan) return true;
      return [m.ad, m.stokNo, m.seriNo, m.kategori, m.konum].join(" ").toLocaleLowerCase("tr").includes(aranan);
    });
  }, [liste.data, q, filtre, kategori]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-wide">Envanter</h1>
          <p className="text-sm text-ink/60">{liste.data?.birlik} · toplam, zimmetli ve zimmetsiz adet</p>
        </div>
        <Button type="button" onClick={() => setAcik(true)}>Malzeme ekle</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_11rem_11rem]">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Stok, ad, seri, kategori" aria-label="Ara" />
        <Select value={kategori} onChange={(e) => setKategori(e.target.value)} aria-label="Kategori">
          <option value="tumu">Tüm kategoriler</option>
          {kategoriler.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Durum">
          <option value="tumu">Tümü</option>
          <option value="dagitilabilir">Dağıtılabilir</option>
          <option value="zimmetli">Zimmetli</option>
          <option value="beklemede">Beklemede</option>
          <option value="kritik">Kritik</option>
          <option value="arsiv">Arşiv</option>
          <option value="dusulen">Düşülen</option>
        </Select>
      </div>
      {liste.isLoading ? <p className="mt-6 text-sm text-ink/60">Yükleniyor</p> : null}
      {liste.error ? <p className="mt-6 text-signal">{hataMetni(liste.error)}</p> : null}
      {satirlar.length === 0 && !liste.isLoading ? <div className="mt-6"><Empty>Bu filtrede malzeme yok.</Empty></div> : null}
      <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 md:hidden">
        {satirlar.map((m) => (
          <li key={m.id} className="space-y-2 px-3 py-3">
            <Link to="/envanter/$id" params={{ id: m.id }} className="font-semibold underline-offset-2 hover:underline">
              {m.ad}
            </Link>
            <p className="text-xs text-ink/50">
              {m.kategori} · stok {m.stokNo}{m.seriNo ? ` · seri ${m.seriNo}` : ""}{m.konum ? ` · ${m.konum}` : ""}
            </p>
            <p className="text-sm">
              {m.deleted ? "Düşüldü" : SINIF_AD[stokSinifi(m)]} · {DURUM_AD[m.durum]}
              {m.muharebe === "eder" ? " · muharebe eder" : m.muharebe === "edemez" ? " · muharebe edemez" : ""}
            </p>
            <p className="text-sm">Zimmet miktarı {m.miktar} · zimmetli {m.zimmetli} · zimmetsiz {m.musait}</p>
            <div className="flex flex-col gap-2">
              {m.zimmetli > 0 ? (
                <Button type="button" variant="ghost" className="w-full" onClick={() => setDetay(m)}>Zimmet detay</Button>
              ) : null}
              {zimmetYetkisi && !m.deleted ? (
                <Button type="button" variant="ghost" className="w-full" onClick={() => setZimmet(m)}>Zimmet</Button>
              ) : null}
              <Button type="button" variant="ghost" className="w-full" onClick={() => setForm(m)}>Malzeme bilgi formu</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto border border-ink/10 md:block">
        <table className="w-full min-w-2xl text-left text-sm">
          <thead className="bg-ink/5 text-xs uppercase tracking-widest text-ink/60">
            <tr>
              <th className="px-3 py-2 font-semibold">Stok</th>
              <th className="px-3 py-2 font-semibold">Malzeme</th>
              <th className="px-3 py-2 font-semibold">Seri</th>
              <th className="px-3 py-2 font-semibold">Konum</th>
              <th className="px-3 py-2 font-semibold">Durum</th>
              <th className="px-3 py-2 text-right font-semibold">Zimmet miktarı</th>
              <th className="px-3 py-2 text-right font-semibold">Zimmetli</th>
              <th className="px-3 py-2 text-right font-semibold">Zimmetsiz</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {satirlar.map((m) => (
              <tr key={m.id} className="border-t border-ink/10">
                <td className="px-3 py-2 tabular-nums">{m.stokNo}</td>
                <td className="px-3 py-2">
                  <Link to="/envanter/$id" params={{ id: m.id }} className="font-semibold underline-offset-2 hover:underline">
                    {m.ad}
                  </Link>
                  <span className="block text-xs text-ink/50">{m.kategori}</span>
                </td>
                <td className="px-3 py-2 tabular-nums">{m.seriNo || "—"}</td>
                <td className="px-3 py-2">{m.konum || "—"}</td>
                <td className="px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide">{m.deleted ? "Düşüldü" : SINIF_AD[stokSinifi(m)]}</span>
                  <span className="block text-xs text-ink/50">
                    {DURUM_AD[m.durum]}
                    {m.muharebe === "eder" ? " · muharebe eder" : m.muharebe === "edemez" ? " · muharebe edemez" : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{m.miktar}</td>
                <td className="px-3 py-2 text-right">
                  <span className="tabular-nums">{m.zimmetli}</span>
                  {m.zimmetli > 0 ? (
                    <button type="button" className="mt-1 block text-xs font-semibold underline" onClick={() => setDetay(m)}>
                      Zimmet detay
                    </button>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{m.musait}</td>
                <td className="px-3 py-2 text-right">
                  {zimmetYetkisi && !m.deleted ? (
                    <Button type="button" variant="ghost" onClick={() => setZimmet(m)}>Zimmet</Button>
                  ) : null}
                  <Button type="button" variant="ghost" onClick={() => setForm(m)}>Malzeme bilgi formu</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MalzemeDialog
        open={acik}
        onClose={() => setAcik(false)}
        onSaved={async () => {
          setAcik(false);
          await invalidate();
        }}
      />
      <ZimmetDialog mal={zimmet} onClose={() => setZimmet(null)} />
      <ZimmetDetay mal={detay} onClose={() => setDetay(null)} />
      <BilgiFormu mal={form} birlik={liste.data?.birlik ?? "2'nci Komando Kolu"} onClose={() => setForm(null)} />
    </div>
  );
}

function ZimmetDetay({ mal, onClose }: { mal: Material | null; onClose: () => void }) {
  const sorgu = useQuery({
    queryKey: ["zimmet", "malzeme", mal?.id, "detay"],
    queryFn: () => getMaterial({ data: mal!.id }),
    enabled: !!mal,
  });
  const kayitlar = sorgu.data?.zimmetler ?? [];
  const acik = kayitlar.filter((z) => z.durum === "aktif");
  const eski = kayitlar.filter((z) => z.durum !== "aktif");
  return (
    <Dialog open={!!mal} title="Zimmet detayı" onClose={onClose}>
      {mal ? (
        <p className="text-sm text-ink/70">
          {mal.ad}
          {mal.seriNo ? ` · seri ${mal.seriNo}` : ""}
          {mal.stokNo ? ` · stok ${mal.stokNo}` : ""}
        </p>
      ) : null}
      {sorgu.isLoading ? <p className="mt-4 text-sm text-ink/60">Yükleniyor</p> : null}
      {sorgu.error ? <p className="mt-4 text-signal">{hataMetni(sorgu.error)}</p> : null}
      {!sorgu.isLoading && acik.length === 0 && eski.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">Zimmet kaydı yok.</p>
      ) : null}
      {acik.length > 0 ? (
        <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 text-sm">
          {acik.map((z) => (
            <li key={z.id} className="px-3 py-2">
              <p className="font-semibold">{z.rutbe} {z.personelAd}</p>
              <p className="text-ink/70">Sicil {z.sicil} · {z.miktar} {z.birim}</p>
              <p className="text-ink/60">Zimmet tarihi {tarih(z.assignedAt)}{z.yapanAd ? ` · yapan ${z.yapanAd}` : ""}{z.belgeNo ? ` · belge ${z.belgeNo}` : ""}</p>
              {z.notlar ? <p className="text-ink/60">{z.notlar}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {eski.length > 0 ? (
        <>
          <h3 className="mt-5 text-sm font-semibold">Eski zimmetler</h3>
          <ul className="mt-2 divide-y divide-ink/10 border border-ink/10 text-sm">
            {eski.map((z) => (
              <li key={z.id} className="px-3 py-2">
                <p className="font-semibold">{z.rutbe} {z.personelAd}</p>
                <p className="text-ink/70">Sicil {z.sicil} · {z.miktar} {z.birim} · iade edildi</p>
                <p className="text-ink/60">
                  Zimmet {tarih(z.assignedAt)} · iade {tarih(z.returnedAt)}
                  {z.yapanAd ? ` · yapan ${z.yapanAd}` : ""}
                  {z.belgeNo ? ` · belge ${z.belgeNo}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Dialog>
  );
}

function BilgiFormu({ mal, birlik, onClose }: { mal: Material | null; birlik: string; onClose: () => void }) {
  const sorgu = useQuery({
    queryKey: ["zimmet", "malzeme", mal?.id, "form"],
    queryFn: () => getMaterial({ data: mal!.id }),
    enabled: !!mal,
  });
  if (!mal) return null;
  const m = sorgu.data?.malzeme ?? mal;
  const zimmetler = sorgu.data?.zimmetler ?? [];
  const acik = zimmetler.filter((z) => z.durum === "aktif");
  const loglar = sorgu.data?.loglar ?? [];
  const bugun = new Date().toISOString().slice(0, 10);
  return (
    <div className="sened-ekran fixed inset-0 z-50 overflow-auto bg-white">
      <div className="no-print flex gap-2 border-b border-ink/10 px-4 py-3">
        <Button type="button" onClick={yazdirBelge}>PDF / Yazdır</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Kapat</Button>
      </div>
      <article id="zimmet-senedi" className="mx-auto max-w-5xl px-4 py-6 text-[12px] text-black">
        <h1 className="text-center text-sm font-bold tracking-wide">MALZEME BİLGİ FORMU</h1>
        <p className="mt-1 text-center">{birlik} · {tarih(bugun)}</p>
        {sorgu.isLoading ? <p className="mt-4">Yükleniyor</p> : null}
        {sorgu.error ? <p className="mt-4">{hataMetni(sorgu.error)}</p> : null}
        <table className="mt-4 w-full border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Malzeme</td>
              <td className="border border-black px-2 py-1" colSpan={3}>{m.ad}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Stok no</td>
              <td className="border border-black px-2 py-1">{m.stokNo}</td>
              <td className="border border-black px-2 py-1 font-semibold">Seri no</td>
              <td className="border border-black px-2 py-1">{m.seriNo || "—"}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Kategori</td>
              <td className="border border-black px-2 py-1">{m.kategori}</td>
              <td className="border border-black px-2 py-1 font-semibold">Konum</td>
              <td className="border border-black px-2 py-1">{m.konum || "—"}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Durum</td>
              <td className="border border-black px-2 py-1">
                {m.deleted ? "Düşüldü" : DURUM_AD[m.durum]}
                {m.muharebe === "eder" ? " · muharebe eder" : m.muharebe === "edemez" ? " · muharebe edemez" : ""}
              </td>
              <td className="border border-black px-2 py-1 font-semibold">Miktar</td>
              <td className="border border-black px-2 py-1">{m.miktar} {m.birim} · zimmetli {m.zimmetli} · zimmetsiz {m.musait}</td>
            </tr>
          </tbody>
        </table>
        <h2 className="mt-4 font-semibold">Şu an kimde</h2>
        {acik.length === 0 ? <p>Zimmetli değil.</p> : (
          <ul>
            {acik.map((z) => (
              <li key={z.id}>{z.rutbe} {z.personelAd} · sicil {z.sicil} · {z.miktar} {z.birim} · {tarih(z.assignedAt)}{z.yapanAd ? ` · veren ${z.yapanAd}` : ""}</li>
            ))}
          </ul>
        )}
        <h2 className="mt-4 font-semibold">Zimmet safahatı</h2>
        <table className="mt-1 w-full border-collapse border border-black">
          <thead>
            <tr className="text-left">
              <th className="border border-black px-2 py-1">Kişi</th>
              <th className="border border-black px-2 py-1">Miktar</th>
              <th className="border border-black px-2 py-1">Zimmet</th>
              <th className="border border-black px-2 py-1">İade</th>
              <th className="border border-black px-2 py-1">Yapan</th>
            </tr>
          </thead>
          <tbody>
            {zimmetler.length === 0 ? (
              <tr><td className="border border-black px-2 py-1" colSpan={5}>Kayıt yok.</td></tr>
            ) : zimmetler.map((z) => (
              <tr key={z.id}>
                <td className="border border-black px-2 py-1">{z.rutbe} {z.personelAd}</td>
                <td className="border border-black px-2 py-1">{z.miktar} {z.birim} · {z.durum === "aktif" ? "açık" : "iade"}</td>
                <td className="border border-black px-2 py-1">{tarih(z.assignedAt)}</td>
                <td className="border border-black px-2 py-1">{z.returnedAt ? tarih(z.returnedAt) : "—"}</td>
                <td className="border border-black px-2 py-1">{z.yapanAd || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-4 font-semibold">Arıza geçmişi</h2>
        <table className="mt-1 w-full border-collapse border border-black">
          <thead>
            <tr className="text-left">
              <th className="border border-black px-2 py-1">Tarih</th>
              <th className="border border-black px-2 py-1">Saat</th>
              <th className="border border-black px-2 py-1">Durum</th>
              <th className="border border-black px-2 py-1">Kademe</th>
              <th className="border border-black px-2 py-1">Not</th>
            </tr>
          </thead>
          <tbody>
            {loglar.length === 0 ? (
              <tr><td className="border border-black px-2 py-1" colSpan={5}>Arıza kaydı yok.</td></tr>
            ) : loglar.map((l) => (
              <tr key={l.id}>
                <td className="border border-black px-2 py-1">{tarih(l.tespit || l.tarih)}</td>
                <td className="border border-black px-2 py-1">{l.saat?.slice(11) || "—"}</td>
                <td className="border border-black px-2 py-1">
                  {DURUM_AD[l.durum as keyof typeof DURUM_AD] ?? l.durum}
                  {l.muharebe === "eder" ? " · eder" : l.muharebe === "edemez" ? " · edemez" : ""}
                </td>
                <td className="border border-black px-2 py-1">{l.kademe || "—"}{l.gidis ? ` · gidiş ${tarih(l.gidis)}` : ""}</td>
                <td className="border border-black px-2 py-1">{l.notlar || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}

export function MalzemeDialog({
  open,
  kayit,
  onClose,
  onSaved,
}: {
  open: boolean;
  kayit?: Material;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const form = useForm<MalzemeInput>({
    resolver: zodResolver(malzemeSchema) as Resolver<MalzemeInput>,
    values: {
      id: kayit?.id,
      stokNo: kayit?.stokNo ?? "",
      ad: kayit?.ad ?? "",
      kategori: kayit?.kategori ?? "Genel",
      birim: kayit?.birim ?? "adet",
      miktar: kayit?.miktar ?? 1,
      seriNo: kayit?.seriNo ?? "",
      durum: kayit?.durum ?? "saglam",
      konum: kayit?.konum ?? "",
      aciklama: kayit?.aciklama ?? "",
    },
  });
  const invalidate = useInvalidate();
  return (
    <Dialog open={open} title={kayit ? "Malzemeyi düzenle" : "Yeni malzeme"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await saveMaterial({ data: values });
            toast.success("Kaydedildi");
            await onSaved();
          } catch (error) {
            toast.error(hataMetni(error));
          }
        })}
      >
        <Field label="Ad" error={form.formState.errors.ad?.message}>
          <TextInput {...form.register("ad")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stok no" error={form.formState.errors.stokNo?.message}>
            <TextInput {...form.register("stokNo")} />
          </Field>
          <Field label="Seri no">
            <TextInput {...form.register("seriNo")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <Select {...form.register("kategori")}>
              {KATEGORILER.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="Birim">
            <TextInput {...form.register("birim")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Miktar" error={form.formState.errors.miktar?.message}>
            <TextInput type="number" {...form.register("miktar")} />
          </Field>
          <Field label="Durum">
            <Select {...form.register("durum")}>
              {DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_AD[d]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Konum">
          <TextInput {...form.register("konum")} />
        </Field>
        <Field label="Açıklama">
          <TextInput {...form.register("aciklama")} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>Kaydet</Button>
          {kayit ? (
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                try {
                  await removeMaterial({ data: kayit.id });
                  toast.success("Envanterden düşüldü");
                  await invalidate();
                  onClose();
                } catch (error) {
                  toast.error(hataMetni(error));
                }
              }}
            >
              Düş
            </Button>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}

export function ZimmetDialog({ mal, onClose }: { mal: Material | null; onClose: () => void }) {
  const personel = useQuery({
    queryKey: ["zimmet", "personel"],
    queryFn: () => listPersonnel(),
    enabled: !!mal,
  });
  const aciklar = useQuery({
    queryKey: ["zimmet", "atama", "aktif"],
    queryFn: () => listAssignments({ data: { personnelId: "", durum: "aktif" } }),
    enabled: !!mal,
  });
  const malzemeler = useQuery({
    queryKey: ["zimmet", "malzeme"],
    queryFn: () => listMaterials(),
    enabled: !!mal,
  });
  const invalidate = useInvalidate();
  const [kisiAra, setKisiAra] = useState("");
  const [secili, setSecili] = useState<Record<string, number>>({});
  const [cekilecek, setCekilecek] = useState<Record<string, string>>({});
  const [notlar, setNotlar] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setKisiAra("");
    setSecili({});
    setCekilecek({});
    setNotlar("");
  }, [mal?.id]);

  function kapat() {
    setKisiAra("");
    setSecili({});
    setCekilecek({});
    setNotlar("");
    onClose();
  }

  const guncel = malzemeler.data?.malzemeler.find((m) => m.id === mal?.id) ?? mal;
  const uygun = !!guncel && !guncel.deleted && guncel.durum === "saglam" && guncel.musait > 0;
  const kq = kisiAra.trim().toLocaleLowerCase("tr");
  const kisiler = (personel.data?.personeller ?? [])
    .filter((p) => p.aktif)
    .filter((p) => !kq || `${p.rutbe} ${p.adSoyad} ${p.sicil}`.toLocaleLowerCase("tr").includes(kq))
    .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
  const uzerinde = (aciklar.data?.zimmetler ?? []).filter((z) => z.materialId === guncel?.id);
  const toplam = Object.values(secili).reduce((n, v) => n + (Number(v) || 0), 0);
  const fazla = guncel ? toplam > guncel.musait : false;
  const cekSatirlari = uzerinde
    .map((z) => ({ id: z.id, miktar: Number(cekilecek[z.id] || 0), max: z.miktar, ad: z.personelAd }))
    .filter((z) => z.miktar > 0);
  const cekHata = cekSatirlari.some((z) => !Number.isFinite(z.miktar) || z.miktar < 1 || z.miktar > z.max);

  function sec(id: string, acik: boolean) {
    setSecili((eski) => {
      const sonraki = { ...eski };
      if (acik) sonraki[id] = sonraki[id] || 1;
      else delete sonraki[id];
      return sonraki;
    });
  }

  return (
    <Dialog open={!!mal} title="Zimmet" onClose={kapat}>
      {guncel ? (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">
            {guncel.ad}
            {guncel.seriNo ? ` · seri ${guncel.seriNo}` : ""}
            {` · zimmetsiz ${guncel.musait} ${guncel.birim}`}
          </p>
          {uygun ? (
            <>
              <Field label="Personel ara">
                <TextInput value={kisiAra} placeholder="Ad, rütbe veya sicil" onChange={(e) => setKisiAra(e.target.value)} />
              </Field>
              <ul className="max-h-64 space-y-2 overflow-auto">
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
                          className="h-11 w-20 border border-ink/15 px-2 text-base"
                          value={secili[p.id]}
                          onChange={(e) => setSecili((eski) => ({ ...eski, [p.id]: Math.max(1, Number(e.target.value) || 1) }))}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className={`text-sm ${fazla ? "text-signal" : "text-ink/70"}`}>
                Seçilen {Object.keys(secili).length} kişi · toplam {toplam} {guncel.birim}
                {fazla ? ` · zimmetsiz ${guncel.musait} ${guncel.birim} yetmiyor` : ""}
              </p>
              <Field label="Not">
                <TextInput value={notlar} onChange={(e) => setNotlar(e.target.value)} />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={busy || fazla || toplam < 1}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    const yazilacak = Object.entries(secili).map(([personnelId, miktar]) => ({ personnelId, miktar }));
                    let yazilan = 0;
                    try {
                      for (const kisi of yazilacak) {
                        await assignZimmet({
                          data: { personnelId: kisi.personnelId, lines: [{ materialId: guncel.id, miktar: kisi.miktar, notlar }] },
                        });
                        yazilan += 1;
                      }
                      toast.success(`${yazilan} kişiye zimmet yazıldı`);
                      setSecili({});
                      setNotlar("");
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
          ) : (
            <p className="text-sm text-ink/60">Bu satır yeni zimmete uygun değil.</p>
          )}
          {uzerinde.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Üzerinde olanlar</h3>
              <ul className="space-y-2">
                {uzerinde.map((z) => (
                  <li key={z.id} className="border border-ink/10 px-3 py-2">
                    <p className="text-sm font-semibold">{z.rutbe} {z.personelAd}</p>
                    <p className="text-sm text-ink/70">Üzerinde {z.miktar} {z.birim} · {z.sicil}</p>
                    <label className="mt-2 block text-sm">
                      <span className="mb-1 block font-semibold">Çekilecek adet</span>
                      <input
                        type="number"
                        min={1}
                        max={z.miktar}
                        inputMode="numeric"
                        placeholder="Adet"
                        aria-label={`${z.personelAd} çekilecek adet`}
                        className="h-11 w-full border border-ink/15 px-3 text-base"
                        value={cekilecek[z.id] ?? ""}
                        onChange={(e) => setCekilecek((eski) => ({ ...eski, [z.id]: e.target.value }))}
                      />
                    </label>
                  </li>
                ))}
              </ul>
              {cekHata ? <p className="text-sm text-signal">Adet, üzerindeki miktarı geçemez.</p> : null}
              <Button
                type="button"
                className="w-full"
                variant="ghost"
                disabled={busy || cekSatirlari.length < 1 || cekHata}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    let cekilen = 0;
                    try {
                      for (const satir of cekSatirlari) {
                        if (satir.miktar >= satir.max) {
                          await returnAssignment({ data: satir.id });
                        } else {
                          await updateAssignment({
                            data: {
                              id: satir.id,
                              miktar: satir.max - satir.miktar,
                              notlar: `${satir.miktar} adet çekildi`,
                            },
                          });
                        }
                        cekilen += 1;
                      }
                      toast.success(`${cekilen} kişiden zimmet çekildi`);
                      setCekilecek({});
                      await invalidate();
                    } catch (error) {
                      if (cekilen > 0) {
                        toast.error(`${cekilen} kişi çekildi, kalanı çekilemedi. ${hataMetni(error)}`);
                        setCekilecek({});
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
                {busy ? "Çekiliyor…" : "Yazılan adetleri çek"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
