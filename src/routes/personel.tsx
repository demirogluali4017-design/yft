import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, useInvalidate } from "@/components/shell";
import { Button, Dialog, Empty, Field, TextInput } from "@/components/ui";
import { listPersonnel, savePersonnel, setPersonnelActive, type Personnel } from "@/lib/zimmet/api";
import { hataMetni } from "@/lib/zimmet/labels";
import { personelSchema, type PersonelInput } from "@/lib/zimmet/schema";

export const Route = createFileRoute("/personel")({ component: Page });

function Page() {
  return (
    <AppShell need="personel">
      <Liste />
    </AppShell>
  );
}

function Liste() {
  const sorgu = useQuery({ queryKey: ["zimmet", "personel"], queryFn: () => listPersonnel() });
  const [q, setQ] = useState("");
  const [acik, setAcik] = useState(false);
  const [duzenle, setDuzenle] = useState<Personnel | null>(null);
  const invalidate = useInvalidate();
  const satirlar = useMemo(() => {
    const aranan = q.trim().toLocaleLowerCase("tr");
    return (sorgu.data?.personeller ?? []).filter((p) =>
      !aranan || `${p.adSoyad} ${p.sicil} ${p.rutbe} ${p.gorev}`.toLocaleLowerCase("tr").includes(aranan),
    );
  }, [sorgu.data, q]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-wide">Personel</h1>
        <Button type="button" onClick={() => { setDuzenle(null); setAcik(true); }}>Personel ekle</Button>
      </div>
      <TextInput className="mt-4" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, sicil, rütbe" aria-label="Personel ara" />
      {sorgu.isLoading ? <p className="mt-6 text-sm text-ink/60">Yükleniyor</p> : null}
      {sorgu.error ? <p className="mt-6 text-signal">{hataMetni(sorgu.error)}</p> : null}
      {satirlar.length === 0 && !sorgu.isLoading ? <div className="mt-6"><Empty>Personel yok.</Empty></div> : null}
      <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
        {satirlar.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div>
              <Link to="/personel/$id" params={{ id: p.id }} className="font-semibold hover:underline">
                {p.rutbe} {p.adSoyad}
              </Link>
              <p className="text-sm text-ink/60">
                Sicil {p.sicil}{p.gorev ? ` · ${p.gorev}` : ""}{p.telefon ? ` · ${p.telefon}` : ""}
                {p.aktif ? "" : " · ayrıldı"}
                {p.userId ? " · hesabı var" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setDuzenle(p)}>Düzenle</Button>
              {p.aktif ? (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  try {
                    await setPersonnelActive({ data: { id: p.id, aktif: false } });
                    await invalidate();
                  } catch (error) {
                    toast.error(hataMetni(error));
                  }
                }}
              >
                Ayrıldı işaretle
              </Button>
            ) : null}
            </div>
          </li>
        ))}
      </ul>
      <PersonelDialog
        key={duzenle?.id ?? "yeni"}
        open={acik || !!duzenle}
        kayit={duzenle}
        onClose={() => {
          setAcik(false);
          setDuzenle(null);
        }}
      />
    </div>
  );
}

function PersonelDialog({
  open,
  kayit,
  onClose,
}: {
  open: boolean;
  kayit?: Personnel | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidate();
  const form = useForm<PersonelInput>({
    resolver: zodResolver(personelSchema),
    defaultValues: {
      id: kayit?.id,
      adSoyad: kayit?.adSoyad ?? "",
      rutbe: kayit?.rutbe ?? "",
      sicil: kayit?.sicil ?? "",
      gorev: kayit?.gorev ?? "",
      telefon: kayit?.telefon ?? "",
      sifre: "",
    },
  });
  return (
    <Dialog open={open} title={kayit ? "Personeli düzenle" : "Personel ekle"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const sonuc = await savePersonnel({ data: { ...values, id: kayit?.id } });
            toast.success(kayit ? "Personel güncellendi" : sonuc.hesap ? `Hesap açıldı. Kullanıcı adı: ${values.sicil}` : "Personel eklendi");
            await invalidate();
            onClose();
          } catch (error) {
            toast.error(hataMetni(error));
          }
        })}
      >
        <Field label="Ad soyad" error={form.formState.errors.adSoyad?.message}>
          <TextInput {...form.register("adSoyad")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rütbe" error={form.formState.errors.rutbe?.message}>
            <TextInput {...form.register("rutbe")} />
          </Field>
          <Field label="Sicil" error={form.formState.errors.sicil?.message}>
            <TextInput {...form.register("sicil")} />
          </Field>
        </div>
        <Field label="Görev">
          <TextInput {...form.register("gorev")} />
        </Field>
        <Field label="Telefon">
          <TextInput {...form.register("telefon")} />
        </Field>
        <Field label={kayit ? "Yeni şifre (boşsa değişmez)" : "Şifre (boşsa hesap açılmaz)"} error={form.formState.errors.sifre?.message}>
          <TextInput type="password" autoComplete="new-password" {...form.register("sifre")} />
        </Field>
        <Button type="submit" disabled={form.formState.isSubmitting}>Kaydet</Button>
      </form>
    </Dialog>
  );
}
