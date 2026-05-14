import {
  summarizeSectionProgress,
  type ProgressBucket,
  type WebCollection,
  type WebSection,
} from "./collection";

export type ProfileAchievementId =
  | "first-sticker"
  | "hundred-stickers"
  | "quarter-album"
  | "half-album"
  | "three-quarter-album"
  | "complete-album"
  | "first-section-complete"
  | "five-sections-complete"
  | "ten-sections-complete"
  | "brazil-complete"
  | "duplicate-trader";

export interface ProfileSectionInsight {
  slug: string;
  name: string;
  kind: string;
  progress: ProgressBucket;
}

export interface ProfileOverview extends ProgressBucket {
  sections: number;
  completedSections: number;
}

export interface ProfileAchievement {
  id: ProfileAchievementId;
  progress: number;
  target: number;
  unlocked: boolean;
}

export interface ProfileInsights {
  overview: ProfileOverview;
  completedSections: ProfileSectionInsight[];
  nearlyComplete: ProfileSectionInsight[];
  biggestGaps: ProfileSectionInsight[];
  duplicateSections: ProfileSectionInsight[];
  achievements: ProfileAchievement[];
}

export function deriveProfileInsights(
  collection: WebCollection,
): ProfileInsights {
  const sectionInsights = collection.sections.map(toSectionInsight);
  const overviewProgress = summarizeCollectionProgress(sectionInsights);
  const completedSections = sectionInsights.filter(
    (section) => section.progress.total > 0 && section.progress.missing === 0,
  );

  return {
    overview: {
      ...overviewProgress,
      sections: sectionInsights.length,
      completedSections: completedSections.length,
    },
    completedSections,
    nearlyComplete: sectionInsights
      .filter((section) => {
        const missing = section.progress.missing;
        return missing >= 1 && missing <= 3;
      })
      .sort(
        (left, right) =>
          left.progress.missing - right.progress.missing ||
          right.progress.percent - left.progress.percent,
      ),
    biggestGaps: sectionInsights
      .filter((section) => section.progress.missing > 0)
      .sort(
        (left, right) =>
          right.progress.missing - left.progress.missing ||
          right.progress.total - left.progress.total,
      ),
    duplicateSections: sectionInsights
      .filter((section) => section.progress.duplicates > 0)
      .sort(
        (left, right) =>
          right.progress.duplicates - left.progress.duplicates ||
          right.progress.percent - left.progress.percent,
      ),
    achievements: buildAchievements(
      overviewProgress,
      completedSections.length,
      getBrazilProgress(sectionInsights),
    ),
  };
}

function toSectionInsight(section: WebSection): ProfileSectionInsight {
  return {
    slug: section.slug,
    name: section.name,
    kind: section.kind,
    progress: summarizeSectionProgress(section),
  };
}

function summarizeCollectionProgress(
  sections: ProfileSectionInsight[],
): ProgressBucket {
  const total = sections.reduce(
    (sum, section) => sum + section.progress.total,
    0,
  );
  const have = sections.reduce(
    (sum, section) => sum + section.progress.have,
    0,
  );
  const missing = total - have;
  const duplicates = sections.reduce(
    (sum, section) => sum + section.progress.duplicates,
    0,
  );
  const percent = total === 0 ? 0 : Math.round((have / total) * 100);

  return { total, have, missing, duplicates, percent };
}

function buildAchievements(
  overview: ProgressBucket,
  completedSections: number,
  brazilProgress: number,
): ProfileAchievement[] {
  return [
    makeAchievement("first-sticker", overview.have, 1),
    makeAchievement("hundred-stickers", overview.have, 100),
    makeAchievement("quarter-album", overview.percent, 25),
    makeAchievement("half-album", overview.percent, 50),
    makeAchievement("three-quarter-album", overview.percent, 75),
    makeAchievement("complete-album", overview.percent, 100),
    makeAchievement("first-section-complete", completedSections, 1),
    makeAchievement("five-sections-complete", completedSections, 5),
    makeAchievement("ten-sections-complete", completedSections, 10),
    makeAchievement("brazil-complete", brazilProgress, 1),
    makeAchievement("duplicate-trader", overview.duplicates, 10),
  ];
}

function makeAchievement(
  id: ProfileAchievementId,
  progress: number,
  target: number,
): ProfileAchievement {
  return {
    id,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
  };
}

function getBrazilProgress(sections: ProfileSectionInsight[]): number {
  const brazil = sections.find((section) => {
    const slug = normalize(section.slug);
    const name = normalize(section.name);

    return slug === "brazil" || slug === "brasil" || name === "brasil";
  });

  return brazil && brazil.progress.total > 0 && brazil.progress.missing === 0
    ? 1
    : 0;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
