import { BarChart3, CheckCircle2, Repeat2, Trophy } from "lucide-react";
import type { ProfileInsights } from "../lib/profile-insights";

export function ProfileStatsPanel({ insights }: { insights: ProfileInsights }) {
  const stats = [
    {
      label: "Tenho",
      value: `${insights.overview.have}/${insights.overview.total}`,
      icon: CheckCircle2,
    },
    {
      label: "Faltam",
      value: insights.overview.missing,
      icon: BarChart3,
    },
    {
      label: "Repetidas",
      value: insights.overview.duplicates,
      icon: Repeat2,
    },
    {
      label: "Seções completas",
      value: `${insights.overview.completedSections}/${insights.overview.sections}`,
      icon: Trophy,
    },
  ];

  return (
    <section className="profile-stats-panel" aria-label="Resumo do álbum">
      <div className="profile-progress-card">
        <p className="eyebrow">Seu álbum</p>
        <h2>{insights.overview.percent}% completo</h2>
        <div className="progress-track" aria-hidden="true">
          <div
            className="progress-fill"
            style={{ width: `${insights.overview.percent}%` }}
          />
        </div>
        <p>
          Você já marcou {insights.overview.have} figurinhas e ainda faltam{" "}
          {insights.overview.missing}.
        </p>
      </div>
      <div className="profile-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="profile-stat-card" key={stat.label}>
              <Icon size={19} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
