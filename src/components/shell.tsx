import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWorkspace, type Profile } from "@/lib/zimmet/api";
import { ROL_AD, hataMetni } from "@/lib/zimmet/labels";
import type { YetkiAnahtar } from "@/lib/zimmet/schema";
import { ErisimForm, Giris, KurulumForm, MarkaBekleme } from "./giris";

type Need = "ozet" | YetkiAnahtar | "komutan";

const NAV = [
  { to: "/", label: "Pano", need: "ozet" },
  { to: "/zimmetim", label: "Zimmetim", need: "ozet" },
  { to: "/envanter", label: "Envanter", need: "envanter" },
  { to: "/zimmet", label: "Zimmet belgesi", need: "zimmet" },
  { to: "/personel", label: "Personel", need: "personel" },
  { to: "/okuma", label: "Belge", need: "belge" },
  { to: "/ariza", label: "Arıza", need: "envanter" },
  { to: "/rapor", label: "Rapor", need: "envanter" },
  { to: "/yetki", label: "Yetki", need: "komutan" },
] as const;

export function useWorkspaceQuery() {
  const { user, isPending: oturum } = useCurrentUserState();
  const query = useQuery({
    queryKey: ["zimmet", "workspace", user?.id],
    queryFn: () => getWorkspace(),
    enabled: !!user,
  });
  return { user, oturum, ...query };
}

export function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["zimmet"] });
}

function gorebilir(profile: Profile, need: Need) {
  if (profile.role === "beklemede" || !profile.aktif) return false;
  if (need === "ozet") return true;
  if (profile.role === "komutan") return true;
  if (need === "komutan" || profile.role !== "yetkili") return false;
  return profile.yetkiler[need];
}

export function AppShell({ children, need = "ozet" }: { children: ReactNode; need?: Need }) {
  const { user, oturum, data, isLoading, error } = useWorkspaceQuery();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [acik, setAcik] = useState(true);
  const [cekmece, setCekmece] = useState(false);

  useEffect(() => {
    const kayit = window.localStorage.getItem("yft-menu");
    if (kayit === "kapali") setAcik(false);
  }, []);

  useEffect(() => {
    setCekmece(false);
  }, [path]);

  if (oturum || (user && isLoading)) return <MarkaBekleme />;
  if (!user) return <Giris />;
  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <p className="max-w-md text-center text-signal">{hataMetni(error)}</p>
      </main>
    );
  }
  if (!data?.profile) {
    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto max-w-lg px-4 py-10">
          <p className="font-display text-4xl font-semibold tracking-wide">Envanter</p>
          {data?.komutanVar ? <ErisimForm /> : <KurulumForm kayitli />}
        </div>
      </main>
    );
  }
  const profile = data.profile;
  if (profile.role === "beklemede") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-display text-4xl font-semibold">Onay bekleniyor</p>
          <p className="mt-2 text-sm text-ink/60">Kol komutanı hesabınızı onaylayınca girebilirsiniz.</p>
          <div className="mt-6 flex justify-center"><UserButton /></div>
        </div>
      </main>
    );
  }

  const links = NAV.filter((item) => gorebilir(profile, item.need));
  const izin = gorebilir(profile, need);

  function menuAcKapa() {
    setAcik((v) => {
      const sonraki = !v;
      window.localStorage.setItem("yft-menu", sonraki ? "acik" : "kapali");
      return sonraki;
    });
  }

  const menu = (
    <>
      <div className={acik || cekmece ? "px-5 py-6" : "px-2 py-4 text-center"}>
        <p className="font-display text-4xl font-semibold leading-none tracking-wide">{acik || cekmece ? "Envanter" : "E"}</p>
        {acik || cekmece ? (
          <>
            <p className="mt-1 text-xs uppercase tracking-widest text-paper/70">Stok ve zimmet</p>
            <p className="mt-4 text-sm text-paper/80">{data.birlik}</p>
          </>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {links.map((item) => {
          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
          const kisa = item.label.slice(0, 2);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={
                active
                  ? "bg-paper px-3 py-2 text-sm font-semibold text-field"
                  : "px-3 py-2 text-sm text-paper/85 hover:bg-paper/10"
              }
            >
              {acik || cekmece ? item.label : kisa}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        className="m-2 hidden h-11 border border-paper/20 px-3 text-sm text-paper md:block"
        onClick={menuAcKapa}
      >
        {acik ? "Kapat" : "Aç"}
      </button>
    </>
  );

  return (
    <div className={acik ? "min-h-screen bg-paper md:grid md:grid-cols-[15rem_1fr]" : "min-h-screen bg-paper md:grid md:grid-cols-[4.5rem_1fr]"}>
      <aside className="no-print hidden bg-field text-paper md:flex md:min-h-screen md:flex-col">{menu}</aside>
      {cekmece ? (
        <div className="no-print fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Menüyü kapat" onClick={() => setCekmece(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-field text-paper">{menu}</aside>
        </div>
      ) : null}
      <div className="min-w-0">
        <header className="no-print flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className="h-11 px-3 text-sm font-semibold md:hidden" onClick={() => setCekmece(true)}>
              Menü
            </button>
            <button type="button" className="hidden h-11 px-3 text-sm font-semibold md:inline" onClick={menuAcKapa}>
              {acik ? "Menüyü kapat" : "Menü"}
            </button>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile.rutbe} {profile.adSoyad}</p>
              <p className="text-xs text-ink/60">{ROL_AD[profile.role]} · sicil {profile.sicil}</p>
            </div>
          </div>
          <UserButton />
        </header>
        <div className="px-4 py-5 pb-8 md:px-8 md:pb-10">
          {izin ? children : <p className="text-signal">Bu ekran için yetkiniz yok.</p>}
        </div>
      </div>
    </div>
  );
}
