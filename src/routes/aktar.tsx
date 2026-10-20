import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui";
import { disariAktar, iceAktar } from "@/offline/transfer";

export const Route = createFileRoute("/aktar")({ component: Page });

type Cihaz = { ad: string; adres: string };

type Bt = {
  gonder(opts: { veri: string }): Promise<void>;
  tara(): Promise<{ cihazlar: Cihaz[] }>;
  al(opts: { adres: string }): Promise<{ veri: string }>;
};

function eklenti(): Bt {
  const cap = window.Capacitor;
  if (!cap?.registerPlugin) throw new Error("Bluetooth sadece kurulu Android uygulamasında var.");
  return cap.registerPlugin("EnvanterBt") as Bt;
}

function Page() {
  return (
    <AppShell need="ozet">
      <Aktar />
    </AppShell>
  );
}

function Aktar() {
  const [durum, setDurum] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [cihazlar, setCihazlar] = useState<Cihaz[]>([]);

  async function gonder() {
    setMesgul(true);
    setDurum("Kayıt hazırlanıyor. Telefonda çıkan izni onayla. Sonra diğer telefonda Al de.");
    try {
      const veri = await disariAktar();
      await eklenti().gonder({ veri });
      setDurum("Gönderildi. Diğer telefon kaydı aldı.");
    } catch (error) {
      setDurum(error instanceof Error ? error.message : "Gönderilemedi");
    } finally {
      setMesgul(false);
    }
  }

  async function bul() {
    setMesgul(true);
    setCihazlar([]);
    setDurum("Yakındaki telefon aranıyor. Gönderen telefonda Gönder açık kalsın. Konum da açık olsun.");
    try {
      const sonuc = await eklenti().tara();
      setCihazlar(sonuc.cihazlar);
      setDurum(sonuc.cihazlar.length ? "Telefonu seç." : "Telefon bulunamadı. İkisinde de Bluetooth açık olsun.");
    } catch (error) {
      setDurum(error instanceof Error ? error.message : "Arama yapılamadı");
    } finally {
      setMesgul(false);
    }
  }

  async function al(adres: string) {
    setMesgul(true);
    setDurum("Kayıt alınıyor. Bu telefondaki eski kayıt silinir.");
    try {
      const sonuc = await eklenti().al({ adres });
      await iceAktar(sonuc.veri);
      setDurum("Kayıt geldi. Açılıyor.");
      window.location.assign("/");
    } catch (error) {
      setDurum(error instanceof Error ? error.message : "Alınamadı");
      setMesgul(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-wide">Veri aktar</h1>
        <p className="mt-2 text-sm text-ink/70">
          Bir telefondaki güncel kayıt, Bluetooth ile diğer telefona geçer. Alan telefondaki eski kayıt silinir.
        </p>
      </div>
      <section className="space-y-3 border border-ink/10 p-4">
        <h2 className="font-semibold">Bu telefondan gönder</h2>
        <Button type="button" disabled={mesgul} onClick={() => void gonder()}>
          Gönder
        </Button>
      </section>
      <section className="space-y-3 border border-ink/10 p-4">
        <h2 className="font-semibold">Diğer telefondan al</h2>
        <Button type="button" disabled={mesgul} onClick={() => void bul()}>
          Telefon ara
        </Button>
        <div className="space-y-2">
          {cihazlar.map((cihaz) => (
            <button
              key={cihaz.adres}
              type="button"
              disabled={mesgul}
              className="block w-full border border-ink/15 px-3 py-3 text-left"
              onClick={() => void al(cihaz.adres)}
            >
              <span className="block font-semibold">{cihaz.ad || "Adsız telefon"}</span>
              <span className="text-xs text-ink/60">{cihaz.adres}</span>
            </button>
          ))}
        </div>
      </section>
      {durum ? <p className="text-sm">{durum}</p> : null}
    </div>
  );
}
