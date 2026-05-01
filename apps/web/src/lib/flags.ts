const SECTION_FLAG_CODES: Record<string, string> = {
  algeria: "dz",
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  "bosnia-and-herzegovina": "ba",
  brazil: "br",
  canada: "ca",
  "cape-verde": "cv",
  colombia: "co",
  "congo-dr": "cd",
  "costa-rica": "cr",
  croatia: "hr",
  curacao: "cw",
  czechia: "cz",
  ecuador: "ec",
  egypt: "eg",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  ghana: "gh",
  haiti: "ht",
  iran: "ir",
  iraq: "iq",
  "ivory-coast": "ci",
  japan: "jp",
  jordan: "jo",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  "new-zealand": "nz",
  norway: "no",
  panama: "pa",
  paraguay: "py",
  portugal: "pt",
  qatar: "qa",
  "saudi-arabia": "sa",
  scotland: "gb-sct",
  senegal: "sn",
  "south-africa": "za",
  "south-korea": "kr",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  tunisia: "tn",
  turkiye: "tr",
  uruguay: "uy",
  usa: "us",
  uzbekistan: "uz",
};

export interface SectionFlag {
  src: string;
  alt: string;
}

export function getSectionFlag(section: {
  slug: string;
  name: string;
}): SectionFlag | null {
  const code = SECTION_FLAG_CODES[section.slug];

  if (!code) return null;

  return {
    src: `/flags/${code}.svg`,
    alt: `Bandeira de ${section.name}`,
  };
}
