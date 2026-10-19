import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell";
import { Sened } from "@/components/sened";
import { Button, Field, Select } from "@/components/ui";
import { getSened, listPersonnel } from "@/lib/zimmet/api";
import { hataMetni } from "@/lib/zimmet/labels";

export const Route = createFileRoute("/zimmet")({ component: Page });

function Page() {
  return (
    <AppShell need="zimmet">
      <Belge />
    </AppShell>
  );
}

function Belge() {
  const personel = useQuery({ queryKey: ["zimmet", "personel"], queryFn: () => listPersonnel() });
  const [belgeKisi, setBelgeKisi] = useState("");
  const [sened, setSened] = useState<Awaited<ReturnType<typeof getSened>> | null>(null);
  const kisiler = (personel.data?.personeller ?? []).filter((p) => p.aktif);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-wide">Zimmet belgesi</h1>
      <p className="mt-1 text-sm text-ink/60">Kişiyi seçin. Üzerindeki malzemeler senette çıkar.</p>
      <section className="mt-6 max-w-lg space-y-3">
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
      {sened ? (
        <Sened birlik={sened.birlik} kisi={sened.kisi} zimmetler={sened.zimmetler} gun={sened.tarih} veren={sened.veren} onClose={() => setSened(null)} />
      ) : null}
    </div>
  );
}
