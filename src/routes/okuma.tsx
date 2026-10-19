import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { AppShell, useInvalidate } from "@/components/shell";
import { Button, Empty, Field, TextInput } from "@/components/ui";
import { decideDocument, draftDocument, listDocuments, readDocument } from "@/lib/zimmet/api";
import { hataMetni, tarih } from "@/lib/zimmet/labels";
import type { KalemInput } from "@/lib/zimmet/schema";

export const Route = createFileRoute("/okuma")({ component: Page });

function Page() {
  return (
    <AppShell need="belge">
      <Okuma />
    </AppShell>
  );
}

const bos = (): KalemInput => ({ name: "", stock_no: "", serial_no: "", quantity: 1, unit: "adet", notes: "" });

function Okuma() {
  const gecmis = useQuery({ queryKey: ["zimmet", "belge"], queryFn: () => listDocuments() });
  const invalidate = useInvalidate();
  const [belgeId, setBelgeId] = useState("");
  const [satirlar, setSatirlar] = useState<KalemInput[]>([]);
  const [busy, setBusy] = useState(false);

  async function dosya(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("JPEG, PNG veya WebP yükleyin.");
      return;
    }
    setBusy(true);
    try {
      const image = await sikistir(file);
      const sonuc = await readDocument({ data: { image, mime: "image/jpeg" } });
      setBelgeId(sonuc.id);
      setSatirlar(sonuc.materials);
      toast.success("Belge okundu. Satırları kontrol edin.");
    } catch (error) {
      toast.error(hataMetni(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Belge oku</h1>
      <p className="mt-1 max-w-xl text-sm text-ink/60">
        Kâğıdın fotoğrafını yükleyin. Okunan satırları düzeltip envantere ekleyin. Fotoğraf kaydedilmez.
      </p>
      <label className="mt-4 inline-flex h-11 cursor-pointer items-center bg-field px-4 text-sm font-semibold text-paper">
        {busy ? "Okunuyor" : "Fotoğraf seç"}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void dosya(file);
          }}
        />
      </label>
      <div className="mt-6 space-y-3">
        {satirlar.map((s, i) => (
          <div key={i} className="grid gap-2 border border-ink/10 p-3 md:grid-cols-6">
            <Field label="Ad">
              <TextInput value={s.name} onChange={(e) => guncelle(setSatirlar, i, { name: e.target.value })} />
            </Field>
            <Field label="Stok">
              <TextInput value={s.stock_no ?? ""} onChange={(e) => guncelle(setSatirlar, i, { stock_no: e.target.value })} />
            </Field>
            <Field label="Seri">
              <TextInput value={s.serial_no ?? ""} onChange={(e) => guncelle(setSatirlar, i, { serial_no: e.target.value })} />
            </Field>
            <Field label="Miktar">
              <TextInput type="number" value={s.quantity} onChange={(e) => guncelle(setSatirlar, i, { quantity: Number(e.target.value) })} />
            </Field>
            <Field label="Birim">
              <TextInput value={s.unit} onChange={(e) => guncelle(setSatirlar, i, { unit: e.target.value })} />
            </Field>
            <Field label="Not">
              <TextInput value={s.notes ?? ""} onChange={(e) => guncelle(setSatirlar, i, { notes: e.target.value })} />
            </Field>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => setSatirlar((s) => [...s, bos()])}>Satır ekle</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            const dolu = satirlar.filter((s) => s.name.trim());
            if (!dolu.length) return toast.error("En az bir ad yazın.");
            try {
              const sonuc = await draftDocument({ data: { materials: dolu } });
              setBelgeId(sonuc.id);
              setSatirlar(sonuc.materials);
              toast.success("Taslak hazır. Onaylayınca envantere geçer.");
            } catch (error) {
              toast.error(hataMetni(error));
            }
          }}
        >
          Elle taslak
        </Button>
        <Button
          type="button"
          disabled={!belgeId}
          onClick={async () => {
            try {
              const sonuc = await decideDocument({ data: { id: belgeId, karar: "onay", materials: satirlar.filter((s) => s.name.trim()) } });
              toast.success(`${sonuc.eklenen} kalem envantere alındı`);
              setBelgeId("");
              setSatirlar([]);
              await invalidate();
            } catch (error) {
              toast.error(hataMetni(error));
            }
          }}
        >
          Onayla ve kaydet
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={!belgeId}
          onClick={async () => {
            try {
              await decideDocument({ data: { id: belgeId, karar: "red" } });
              setBelgeId("");
              setSatirlar([]);
              await invalidate();
            } catch (error) {
              toast.error(hataMetni(error));
            }
          }}
        >
          Reddet
        </Button>
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold">Son belgeler</h2>
      {(gecmis.data?.belgeler.length ?? 0) === 0 ? <div className="mt-3"><Empty>Henüz belge yok.</Empty></div> : (
        <ul className="mt-3 text-sm">
          {gecmis.data?.belgeler.map((b) => (
            <li key={b.id} className="border-t border-ink/10 py-2">{tarih(b.tarih)} · {b.durum}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function guncelle(set: Dispatch<SetStateAction<KalemInput[]>>, i: number, patch: Partial<KalemInput>) {
  set((rows) => rows.map((row, n) => (n === i ? { ...row, ...patch } : row)));
}

async function sikistir(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const oran = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * oran));
  canvas.height = Math.max(1, Math.round(bitmap.height * oran));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görüntü hazırlanamadı.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.72);
  return url.slice(url.indexOf(",") + 1);
}
