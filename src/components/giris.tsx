import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { foundUnit, requestAccess } from "@/lib/zimmet/api";
import { hataMetni } from "@/lib/zimmet/labels";
import { erisimSchema, girisEpostasi, girisSchema, kullaniciEpostasi, kurulumSchema, type KurulumInput } from "@/lib/zimmet/schema";
import { Button, Field, TextInput } from "./ui";

export function MarkaBekleme() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 text-ink">
      <div>
        <p className="font-display text-5xl font-semibold tracking-wide">Envanter</p>
        <p className="mt-2 text-sm text-ink/60">Açılıyor</p>
      </div>
    </main>
  );
}

export function Giris() {
  return (
    <main className="grid min-h-screen md:grid-cols-[18rem_1fr]">
      <aside className="bg-field px-6 py-10 text-paper">
        <p className="font-display text-5xl font-semibold tracking-wide">Envanter</p>
        <h1 className="mt-3 font-display text-3xl leading-none tracking-wide">Malzeme ve zimmet</h1>
        <p className="mt-4 max-w-xs text-sm text-paper/80">
          Kol envanteri, zimmet ve el senedi. Personel yalnız kendi üzerindeki malzemeyi görür.
        </p>
      </aside>
      <section className="flex items-center px-6 py-10">
        <div className="w-full max-w-md">
          <h2 className="mb-6 font-display text-3xl font-semibold tracking-wide">Giriş</h2>
          <GirisForm />
          <p className="mt-6 text-sm text-ink/60">
            Kullanıcı adı sicil numarasıdır. Hesabı kol komutanı açar. Herkes kendi birliğini kuramaz.
          </p>
        </div>
      </section>
    </main>
  );
}

function GirisForm() {
  const form = useForm({ resolver: zodResolver(girisSchema), defaultValues: { kullanici: "", sifre: "" } });
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const { error } = await authClient.signIn.email({
          email: girisEpostasi(values.kullanici),
          password: values.sifre,
        });
        if (error) toast.error(error.message || "Giriş yapılamadı.");
      })}
    >
      <Field label="Kullanıcı adı veya sicil" error={form.formState.errors.kullanici?.message}>
        <TextInput autoComplete="username" {...form.register("kullanici")} />
      </Field>
      <Field label="Şifre" error={form.formState.errors.sifre?.message}>
        <TextInput type="password" autoComplete="current-password" {...form.register("sifre")} />
      </Field>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        Giriş yap
      </Button>
    </form>
  );
}

export function KurulumForm({ kayitli }: { kayitli: boolean }) {
  const qc = useQueryClient();
  const form = useForm<KurulumInput>({
    resolver: zodResolver(kurulumSchema),
    defaultValues: { birlik: "1'inci Lojistik Destek Kolu", adSoyad: "", rutbe: "Yüzbaşı", sicil: "", sifre: "" },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          if (!kayitli) {
            if (!values.sifre || values.sifre.length < 8) {
              form.setError("sifre", { message: "Şifre en az 8 karakter." });
              return;
            }
            const { error } = await authClient.signUp.email({
              email: kullaniciEpostasi(values.sicil),
              password: values.sifre,
              name: values.adSoyad,
            });
            if (error) {
              toast.error(error.message || "Hesap açılamadı.");
              return;
            }
          }
          await foundUnit({ data: values });
          await qc.invalidateQueries({ queryKey: ["zimmet"] });
          toast.success("Birlik kuruldu.");
        } catch (error) {
          toast.error(hataMetni(error));
        }
      })}
    >
      <Field label="Birlik" error={form.formState.errors.birlik?.message}>
        <TextInput {...form.register("birlik")} />
      </Field>
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
      {kayitli ? null : (
        <Field label="Şifre" error={form.formState.errors.sifre?.message}>
          <TextInput type="password" autoComplete="new-password" {...form.register("sifre")} />
        </Field>
      )}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        Kolu kur
      </Button>
    </form>
  );
}

export function ErisimForm() {
  const qc = useQueryClient();
  const form = useForm({
    resolver: zodResolver(erisimSchema),
    defaultValues: { adSoyad: "", rutbe: "", sicil: "" },
  });
  return (
    <form
      className="mx-auto max-w-md space-y-4 px-4 py-10"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await requestAccess({ data: values });
          await qc.invalidateQueries({ queryKey: ["zimmet"] });
        } catch (error) {
          toast.error(hataMetni(error));
        }
      })}
    >
      <h1 className="font-display text-4xl font-semibold tracking-wide">Erişim iste</h1>
      <p className="text-sm text-ink/60">Kol komutanı kaydınızı onaylayınca deftere girersiniz.</p>
      <Field label="Ad soyad" error={form.formState.errors.adSoyad?.message}>
        <TextInput {...form.register("adSoyad")} />
      </Field>
      <Field label="Rütbe" error={form.formState.errors.rutbe?.message}>
        <TextInput {...form.register("rutbe")} />
      </Field>
      <Field label="Sicil" error={form.formState.errors.sicil?.message}>
        <TextInput {...form.register("sicil")} />
      </Field>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        İstek gönder
      </Button>
    </form>
  );
}
