import { ArrowRight, Repeat2, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  ProfileInsights,
  ProfileSectionInsight,
} from "../lib/profile-insights";

export function ProfileSectionInsights({
  insights,
}: {
  insights: ProfileInsights;
}) {
  return (
    <section className="profile-section-insights">
      <InsightColumn
        title="Quase completas"
        icon={<Target size={20} />}
        items={insights.nearlyComplete.slice(0, 5)}
        emptyText="Nenhuma seção está perto de completar ainda."
        value={(section) => `${section.progress.missing} faltam`}
      />
      <InsightColumn
        title="Onde falta mais"
        icon={<TrendingUp size={20} />}
        items={insights.biggestGaps.slice(0, 5)}
        emptyText="Todas as seções acompanhadas estão completas."
        value={(section) => `${section.progress.missing} faltam`}
      />
      <InsightColumn
        title="Repetidas para troca"
        icon={<Repeat2 size={20} />}
        items={insights.duplicateSections.slice(0, 5)}
        emptyText="Nenhuma seção tem repetidas ainda."
        value={(section) => `${section.progress.duplicates} repetidas`}
      />
    </section>
  );
}

function InsightColumn({
  title,
  icon,
  items,
  emptyText,
  value,
}: {
  title: string;
  icon: ReactNode;
  items: ProfileSectionInsight[];
  emptyText: string;
  value: (section: ProfileSectionInsight) => string;
}) {
  return (
    <div className="profile-card profile-insight-column">
      <div className="profile-card-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="profile-insight-empty">{emptyText}</p>
      ) : (
        <div className="profile-insight-list">
          {items.map((section) => (
            <Link
              className="profile-insight-row"
              href={`/?section=${encodeURIComponent(section.slug)}`}
              key={section.slug}
            >
              <div>
                <strong>{section.name}</strong>
                <span>
                  {section.progress.have}/{section.progress.total} figurinhas
                </span>
              </div>
              <div className="profile-insight-meta">
                <span>{value(section)}</span>
                <div className="profile-insight-progress" aria-hidden="true">
                  <i style={{ width: `${section.progress.percent}%` }} />
                </div>
              </div>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
