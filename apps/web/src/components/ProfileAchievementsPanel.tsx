import { Lock, Sparkles, Trophy } from "lucide-react";
import type {
  ProfileAchievement,
  ProfileAchievementId,
} from "../lib/profile-insights";

const achievementCopy: Record<
  ProfileAchievementId,
  { title: string; description: string }
> = {
  "first-sticker": {
    title: "Primeira figurinha",
    description: "Marque sua primeira figurinha no álbum.",
  },
  "hundred-stickers": {
    title: "100 figurinhas",
    description: "Chegue às primeiras 100 figurinhas marcadas.",
  },
  "quarter-album": {
    title: "25% do álbum",
    description: "Complete um quarto da coleção acompanhada.",
  },
  "half-album": {
    title: "Metade do caminho",
    description: "Alcance 50% de progresso no álbum.",
  },
  "three-quarter-album": {
    title: "Reta final",
    description: "Passe de 75% da coleção.",
  },
  "complete-album": {
    title: "Álbum completo",
    description: "Complete todas as figurinhas acompanhadas.",
  },
  "first-section-complete": {
    title: "Primeira seção",
    description: "Complete sua primeira seção do álbum.",
  },
  "five-sections-complete": {
    title: "5 seções completas",
    description: "Feche cinco seções diferentes.",
  },
  "ten-sections-complete": {
    title: "10 seções completas",
    description: "Feche dez seções diferentes.",
  },
  "brazil-complete": {
    title: "Brasil completo",
    description: "Complete todos os cromos do Brasil.",
  },
  "duplicate-trader": {
    title: "Pronto para trocar",
    description: "Junte 10 repetidas para futuras trocas.",
  },
};

export function ProfileAchievementsPanel({
  achievements,
}: {
  achievements: ProfileAchievement[];
}) {
  return (
    <section className="profile-card profile-achievements">
      <div className="profile-card-heading">
        <Trophy size={20} />
        <h2>Troféus do álbum</h2>
      </div>
      <div className="achievement-grid">
        {achievements.map((achievement) => {
          const copy = achievementCopy[achievement.id];
          const Icon = achievement.unlocked ? Sparkles : Lock;
          return (
            <article
              className={`achievement-card ${
                achievement.unlocked ? "unlocked" : "locked"
              }`}
              key={achievement.id}
            >
              <Icon size={19} />
              <div>
                <strong>{copy.title}</strong>
                <p>{copy.description}</p>
              </div>
              <span>
                {achievement.progress}/{achievement.target}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
