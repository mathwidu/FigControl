"use client";

import type { AdminDashboard, AdminDailyMetric } from "@figcontrol/shared";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Lock,
  RefreshCcw,
  Share2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAdminDashboard, refresh, type AuthTokens } from "../lib/api";
import { loadAuth, saveAuth } from "../lib/storage";

type LoadState = "loading" | "ready" | "blocked" | "error";

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  async function loadDashboard() {
    const auth = loadAuth();
    setMessage(null);
    setState("loading");
    setAuthEmail(auth?.user.email ?? null);

    if (!auth) {
      setState("blocked");
      setMessage("Entre com uma conta autorizada para acessar o painel.");
      return;
    }

    try {
      const nextDashboard = await getAdminDashboard(auth.accessToken);
      setDashboard(nextDashboard);
      setState("ready");
    } catch (error) {
      const recovered = await tryRefreshAndLoad(auth);
      if (recovered) return;

      const errorMessage =
        error instanceof Error ? error.message : "Falha ao carregar painel.";
      setMessage(errorMessage);
      setState(
        errorMessage.includes("Admin access required") ||
          errorMessage.includes("Forbidden")
          ? "blocked"
          : "error",
      );
    }
  }

  async function tryRefreshAndLoad(auth: AuthTokens): Promise<boolean> {
    try {
      const refreshed = await refresh(auth.refreshToken);
      saveAuth(refreshed);
      setAuthEmail(refreshed.user.email);
      const nextDashboard = await getAdminDashboard(refreshed.accessToken);
      setDashboard(nextDashboard);
      setState("ready");
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (state === "loading") {
    return <div className="notice">Carregando painel...</div>;
  }

  if (state === "error") {
    return (
      <section className="admin-empty" aria-labelledby="admin-error-title">
        <RefreshCcw size={32} />
        <p className="eyebrow">Painel interno</p>
        <h1 id="admin-error-title">Não foi possível carregar</h1>
        <p>{message ?? "Tente atualizar novamente em alguns instantes."}</p>
        <button
          className="text-button primary"
          type="button"
          onClick={loadDashboard}
        >
          <RefreshCcw size={17} />
          Atualizar
        </button>
      </section>
    );
  }

  if (state === "blocked" || !dashboard) {
    return (
      <section className="admin-empty" aria-labelledby="admin-blocked-title">
        <Lock size={32} />
        <p className="eyebrow">Acesso interno</p>
        <h1 id="admin-blocked-title">Painel restrito</h1>
        <p>
          {message ??
            "Apenas emails configurados em FIGCONTROL_ADMIN_EMAILS podem acessar esta área."}
        </p>
        {authEmail ? <span>Conta atual: {authEmail}</span> : null}
      </section>
    );
  }

  return (
    <section className="admin-dashboard" aria-labelledby="admin-title">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Painel interno</p>
          <h1 id="admin-title">Como o FigControl está indo</h1>
          <p>
            Atualizado em {formatDateTime(dashboard.generatedAt)}
            {authEmail ? ` por ${authEmail}` : ""}
          </p>
        </div>
        <button className="text-button" type="button" onClick={loadDashboard}>
          <RefreshCcw size={17} />
          Atualizar
        </button>
      </div>

      <AdminMetricGrid dashboard={dashboard} />
      <AdminFunnel dashboard={dashboard} />

      <div className="admin-split">
        <DailyActivityChart daily={dashboard.daily} />
        <TopSections
          title="Seções mais abertas"
          sections={dashboard.topOpenedSections}
          emptyText="Sem eventos de abertura ainda."
        />
      </div>

      <div className="admin-split">
        <TopSections
          title="Seções mais preenchidas"
          sections={dashboard.topMarkedSections}
          emptyText="Nenhuma seção marcada ainda."
        />
        <AdminUsersTable dashboard={dashboard} />
      </div>
    </section>
  );
}

function AdminMetricGrid({ dashboard }: { dashboard: AdminDashboard }) {
  const cards = [
    {
      label: "Usuários",
      value: dashboard.overview.totalUsers,
      hint: `${dashboard.overview.verifiedUsers} verificados`,
      icon: Users,
    },
    {
      label: "Ativos 7 dias",
      value: dashboard.overview.active7Days,
      hint: `${dashboard.overview.activeToday} hoje`,
      icon: Activity,
    },
    {
      label: "Com figurinhas",
      value: dashboard.overview.usersWithStickers,
      hint: `${dashboard.overview.totalMarkedStickers} únicas marcadas`,
      icon: CheckCircle2,
    },
    {
      label: "Repetidas",
      value: dashboard.overview.duplicateStickers,
      hint: `${dashboard.overview.totalStickerQuantity} quantidades no total`,
      icon: TrendingUp,
    },
    {
      label: "Compartilhamentos",
      value: dashboard.overview.shareClicks,
      hint: "Faltantes e repetidas",
      icon: Share2,
    },
    {
      label: "Ativos 30 dias",
      value: dashboard.overview.active30Days,
      hint: "Retenção recente",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="admin-metric-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className="admin-metric" key={card.label}>
            <Icon size={20} />
            <span>{card.label}</span>
            <strong>{formatNumber(card.value)}</strong>
            <small>{card.hint}</small>
          </article>
        );
      })}
    </div>
  );
}

function AdminFunnel({ dashboard }: { dashboard: AdminDashboard }) {
  const registered = Math.max(dashboard.funnel.registered, 1);
  const steps = [
    {
      label: "Cadastro",
      value: dashboard.funnel.registered,
      percent: 100,
    },
    {
      label: "Email verificado",
      value: dashboard.funnel.verified,
      percent: Math.round((dashboard.funnel.verified / registered) * 100),
    },
    {
      label: "Primeira figurinha",
      value: dashboard.funnel.markedFirstSticker,
      percent: Math.round(
        (dashboard.funnel.markedFirstSticker / registered) * 100,
      ),
    },
  ];

  return (
    <section className="admin-panel" aria-labelledby="admin-funnel-title">
      <div className="admin-panel-heading">
        <ShieldCheck size={19} />
        <h2 id="admin-funnel-title">Funil do produto</h2>
      </div>
      <div className="admin-funnel">
        {steps.map((step) => (
          <div className="admin-funnel-step" key={step.label}>
            <div>
              <strong>{step.label}</strong>
              <span>
                {formatNumber(step.value)} · {step.percent}%
              </span>
            </div>
            <div className="admin-bar-track">
              <div
                className="admin-bar-fill"
                style={{
                  width: `${Math.max(step.percent, step.value ? 4 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyActivityChart({ daily }: { daily: AdminDailyMetric[] }) {
  const maxValue = Math.max(
    1,
    ...daily.map((entry) =>
      Math.max(entry.activeUsers, entry.stickerUpdates, entry.signups),
    ),
  );

  return (
    <section className="admin-panel" aria-labelledby="admin-daily-title">
      <div className="admin-panel-heading">
        <Activity size={19} />
        <h2 id="admin-daily-title">Atividade diária</h2>
      </div>
      <div className="admin-chart" aria-label="Atividade dos últimos 30 dias">
        {daily.map((entry) => (
          <div className="admin-chart-day" key={entry.date}>
            <div className="admin-chart-bars">
              <span
                className="admin-chart-bar active-users"
                style={{ height: `${barHeight(entry.activeUsers, maxValue)}%` }}
                title={`${formatShortDate(entry.date)}: ${entry.activeUsers} ativos`}
              />
              <span
                className="admin-chart-bar sticker-updates"
                style={{
                  height: `${barHeight(entry.stickerUpdates, maxValue)}%`,
                }}
                title={`${formatShortDate(entry.date)}: ${entry.stickerUpdates} alterações`}
              />
              <span
                className="admin-chart-bar signups"
                style={{ height: `${barHeight(entry.signups, maxValue)}%` }}
                title={`${formatShortDate(entry.date)}: ${entry.signups} cadastros`}
              />
            </div>
            <small>{entry.date.slice(8, 10)}</small>
          </div>
        ))}
      </div>
      <div className="admin-chart-legend">
        <span className="active-users">Ativos</span>
        <span className="sticker-updates">Figurinhas</span>
        <span className="signups">Cadastros</span>
      </div>
    </section>
  );
}

function TopSections({
  title,
  sections,
  emptyText,
}: {
  title: string;
  sections: AdminDashboard["topOpenedSections"];
  emptyText: string;
}) {
  const maxValue = Math.max(1, ...sections.map((section) => section.value));

  return (
    <section className="admin-panel" aria-labelledby={slugify(title)}>
      <div className="admin-panel-heading">
        <TrendingUp size={19} />
        <h2 id={slugify(title)}>{title}</h2>
      </div>
      {sections.length === 0 ? (
        <p className="admin-muted">{emptyText}</p>
      ) : (
        <div className="admin-ranking">
          {sections.map((section) => (
            <div className="admin-ranking-row" key={section.slug}>
              <div>
                <strong>{section.name}</strong>
                <span>{formatNumber(section.value)}</span>
              </div>
              <div className="admin-bar-track">
                <div
                  className="admin-bar-fill"
                  style={{
                    width: `${Math.max((section.value / maxValue) * 100, 5)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminUsersTable({ dashboard }: { dashboard: AdminDashboard }) {
  const users = useMemo(() => dashboard.users, [dashboard.users]);

  return (
    <section
      className="admin-panel admin-users-panel"
      aria-labelledby="admin-users-title"
    >
      <div className="admin-panel-heading">
        <Users size={19} />
        <h2 id="admin-users-title">Últimos usuários</h2>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Figurinhas</th>
              <th>Repetidas</th>
              <th>Último uso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>
                  <span
                    className={`admin-status ${user.emailVerified ? "ok" : "pending"}`}
                  >
                    {user.emailVerified ? "Verificado" : "Pendente"}
                  </span>
                </td>
                <td>{formatNumber(user.markedStickers)}</td>
                <td>{formatNumber(user.duplicateStickers)}</td>
                <td>
                  {user.lastSeenAt ? formatDateTime(user.lastSeenAt) : "Nunca"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function barHeight(value: number, maxValue: number): number {
  if (value <= 0) return 3;
  return Math.max(8, Math.round((value / maxValue) * 100));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
