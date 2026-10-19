import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, useInvalidate, useWorkspaceQuery } from "@/components/shell";
import { Button, Dialog, Empty, Field, Select, TextInput } from "@/components/ui";
import { assignZimmet, listMaterials, listPersonnel, removeMaterial, saveMaterial, type Material } from "@/lib/zimmet/api";
import { DURUM_AD, SINIF_AD, hataMetni, stokSinifi } from "@/lib/zimmet/labels";
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
      <div className="mt-4 overflow-x-auto border border-ink/10">
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
                <td className="px-3 py-2 text-right tabular-nums">{m.zimmetli}</td>
                <td className="px-3 py-2 text-right tabular-nums">{m.musait}</td>
                <td className="px-3 py-2 text-right">
                  {zimmetYetkisi && !m.deleted && m.durum === "saglam" && m.musait > 0 ? (
                    <Button type="button" variant="ghost" onClick={() => setZimmet(m)}>Zimmet</Button>
                  ) : null}
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
  const malzemeler = useQuery({
    queryKey: ["zimmet", "malzeme"],
    queryFn: () => listMaterials(),
    enabled: !!mal,
  });
  const invalidate = useInvalidate();
  const [personnelId, setPersonnelId] = useState("");
  const [secim, setSecim] = useState("");
  const [miktar, setMiktar] = useState(1);
  const [notlar, setNotlar] = useState("");
  const [busy, setBusy] = useState(false);
  const kisiler = (personel.data?.personeller ?? []).filter((p) => p.aktif);
  const kardes = (malzemeler.data?.malzemeler ?? []).filter(
    (m) => mal && !m.deleted && m.durum === "saglam" && m.musait > 0 && m.stokNo === mal.stokNo && m.ad === mal.ad,
  );
  const seriVar = kardes.some((m) => m.seriNo);
  const hedef = kardes.find((m) => m.id === secim) ?? kardes.find((m) => m.id === mal?.id) ?? mal;
  return (
    <Dialog
      open={!!mal}
      title="Zimmet ver"
      onClose={() => {
        setPersonnelId("");
        setSecim("");
        setMiktar(1);
        setNotlar("");
        onClose();
      }}
    >
      {mal && hedef ? (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!personnelId) return toast.error("Personel seçin.");
            if (miktar < 1 || miktar > hedef.musait) return toast.error("Zimmetsiz miktarı aşıyor.");
            setBusy(true);
            try {
              const sonuc = await assignZimmet({
                data: { personnelId, lines: [{ materialId: hedef.id, miktar, notlar }] },
              });
              toast.success(`Zimmet yazıldı · ${sonuc.belgeNo}`);
              setPersonnelId("");
              setSecim("");
              setMiktar(1);
              setNotlar("");
              await invalidate();
              onClose();
            } catch (error) {
              toast.error(hataMetni(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm text-ink/70">{hedef.ad} · zimmetsiz {hedef.musait} {hedef.birim}</p>
          {seriVar ? (
            <Field label="Seri no">
              <Select value={hedef.id} onChange={(e) => setSecim(e.target.value)}>
                {kardes.map((m) => (
                  <option key={m.id} value={m.id}>{m.seriNo || "Seri yok"} · zimmetsiz {m.musait}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Personel">
            <Select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)}>
              <option value="">Seçin</option>
              {kisiler.map((p) => (
                <option key={p.id} value={p.id}>{p.rutbe} {p.adSoyad} · {p.sicil}</option>
              ))}
            </Select>
          </Field>
          <Field label="Miktar">
            <TextInput type="number" min={1} max={hedef.musait} value={miktar} onChange={(e) => setMiktar(Number(e.target.value))} />
          </Field>
          <Field label="Not">
            <TextInput value={notlar} onChange={(e) => setNotlar(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>Zimmet ver</Button>
        </form>
      ) : null}
    </Dialog>
  );
}
