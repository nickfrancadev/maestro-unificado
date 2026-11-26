import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Settings,
  UserCircle2,
  Building2,
  Globe,
  Bell,
  Users,
  Plug,
  Sparkles,
  Tag,
  Receipt,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

// Espelha a navegação de Configurações do produto real
// (maestro_frontend/src/app/admin/pages/settings/settings.component.html),
// com a entrada nova "MCP".
export const SETTINGS_NAV = [
  { to: 'meu-perfil', label: 'Meu Perfil', icon: UserCircle2 },
  { to: 'perfil-do-time', label: 'Perfil do time', icon: Building2 },
  { to: 'dominio', label: 'Configurar Domínio', icon: Globe },
  { to: 'notificacoes', label: 'Notificações', icon: Bell },
  { to: 'usuarios', label: 'Usuários', icon: Users },
  { to: 'integracoes', label: 'Integrações', icon: Plug },
  { to: 'mcp', label: 'MCP', icon: Sparkles, isNew: true },
  { to: 'tags', label: 'Gestão de tags', icon: Tag },
  { to: 'assinatura', label: 'Gerenciar Assinatura', icon: Receipt },
] as const;

export function SettingsLayout() {
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);

  // O scroll mora no container do AppLayout; ao trocar de seção, volta ao topo.
  useEffect(() => {
    rootRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div ref={rootRef} className="min-h-full px-8 py-7">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2.5 text-[26px] font-semibold text-[#212A46]">
            <Settings className="h-6 w-6 text-[#FF5F39]" strokeWidth={2} />
            Configurações
          </h1>
          <button
            type="button"
            onClick={() => toast('No produto, encerra a sessão.')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#212A46] hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </header>

        <div className="flex items-start gap-6">
          <nav
            aria-label="Configurações"
            className="sticky top-7 w-[244px] shrink-0 rounded-2xl border border-slate-200/70 bg-white p-3"
          >
            <div className="mb-2 flex items-center gap-3 border-b border-slate-100 px-2 pb-4 pt-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#212A46]">
                <svg width="18" height="18" viewBox="2 6 46 49" fill="none" aria-hidden>
                  <path
                    d="M48 6L48 38C48 43 44 47 39 47C34 47 30 43 30 38C30 33 34 29 39 29C41 29 43 30 44.5 31.5V13L20 19V46C20 51 16 55 11 55C6 55 2 51 2 46C2 41 6 37 11 37C13 37 15 38 16.5 39.5V6L48 6Z"
                    fill="#FF5F39"
                  />
                </svg>
              </span>
              <span className="text-sm font-semibold text-[#212A46]">Maestro ABM</span>
            </div>
            <ul className="space-y-0.5">
              {SETTINGS_NAV.map(({ to, label, icon: Icon, ...rest }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                        isActive
                          ? 'bg-[#FF5F39]/[0.08] font-semibold text-[#212A46] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#FF5F39]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-[#212A46]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#FF5F39]' : 'text-slate-400'}`} />
                        <span className="flex-1">{label}</span>
                        {'isNew' in rest && rest.isNew && (
                          <span className="rounded-full bg-[#FF5F39] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-white">
                            Novo
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <main className="@container min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white px-8 py-16 text-center">
      <h2 className="text-xl font-semibold text-[#212A46]">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">Esta tela segue igual à do produto e não faz parte deste protótipo.</p>
    </section>
  );
}
