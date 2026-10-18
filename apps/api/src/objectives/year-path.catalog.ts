export const DOCTORAL_YEARS = [1, 2, 3, 4] as const;

export type DoctoralYear = (typeof DOCTORAL_YEARS)[number];

export type YearObjective = {
  code: string;
  year: DoctoralYear;
  title: string;
  description: string;
  /** Existing template codes that already cover this suggestion. */
  aliases?: readonly string[];
};

/** Optional recommendations for a doctorate in Morocco. Never applied unless asked. */
export const YEAR_OBJECTIVES: readonly YearObjective[] = [
  {
    code: 'Y1_PROBLEMATIQUE',
    year: 1,
    title: 'Problématique',
    description: 'Poser le sujet, la question de recherche et les hypothèses.',
    aliases: ['PROBLEMATIQUE'],
  },
  {
    code: 'Y1_ETAT_ART',
    year: 1,
    title: 'État de l’art',
    description: 'Recenser et comparer les travaux qui encadrent la recherche.',
    aliases: ['ETAT_ART'],
  },
  {
    code: 'Y1_BIBLIO',
    year: 1,
    title: 'Revue bibliographique',
    description: 'Constituer et organiser la bibliographie de la première année.',
  },
  {
    code: 'Y1_METHODOLOGIE',
    year: 1,
    title: 'Méthodologie',
    description: 'Choisir l’approche, les données et le protocole.',
    aliases: ['METHODOLOGIE'],
  },
  {
    code: 'Y1_PLAN',
    year: 1,
    title: 'Plan de recherche',
    description: 'Ordonner les étapes prévues pour la thèse.',
  },
  {
    code: 'Y1_FORMATIONS',
    year: 1,
    title: 'Formations doctorales',
    description: 'Suivre les formations demandées par l’école doctorale.',
  },
  {
    code: 'Y1_RAPPORT',
    year: 1,
    title: 'Rapport annuel',
    description: 'Rédiger le rapport de la première année.',
  },
  {
    code: 'Y2_CONCEPTION',
    year: 2,
    title: 'Conception',
    description: 'Définir la solution ou le cadre qui sera expérimenté.',
  },
  {
    code: 'Y2_DEVELOPPEMENT',
    year: 2,
    title: 'Développement',
    description: 'Réaliser le prototype, le corpus ou le dispositif de recherche.',
  },
  {
    code: 'Y2_EXPERIMENTATIONS',
    year: 2,
    title: 'Expérimentations',
    description: 'Mener les expériences et en conserver la trace.',
    aliases: ['EXPERIMENTATION'],
  },
  {
    code: 'Y2_ANALYSE',
    year: 2,
    title: 'Analyse des résultats',
    description: 'Mesurer et interpréter les premiers résultats.',
    aliases: ['ANALYSE'],
  },
  {
    code: 'Y2_PUBLICATION',
    year: 2,
    title: 'Communication et publication scientifique',
    description: 'Préparer une communication ou une publication.',
    aliases: ['PUBLICATION'],
  },
  {
    code: 'Y2_RAPPORT',
    year: 2,
    title: 'Rapport annuel',
    description: 'Rédiger le rapport de la deuxième année.',
  },
  {
    code: 'Y3_VALIDATION',
    year: 3,
    title: 'Validation des résultats',
    description: 'Confirmer les résultats et leurs limites.',
  },
  {
    code: 'Y3_PUBLICATIONS',
    year: 3,
    title: 'Publications',
    description: 'Poursuivre les articles et communications de la thèse.',
  },
  {
    code: 'Y3_MANUSCRIT',
    year: 3,
    title: 'Rédaction du manuscrit',
    description: 'Rédiger le manuscrit de thèse.',
    aliases: ['REDACTION'],
  },
  {
    code: 'Y3_CORRECTIONS',
    year: 3,
    title: 'Corrections',
    description: 'Intégrer les corrections de l’encadrant.',
  },
  {
    code: 'Y3_SOUTENANCE',
    year: 3,
    title: 'Préparation de la soutenance',
    description: 'Préparer le dépôt, la présentation et la soutenance.',
    aliases: ['SOUTENANCE'],
  },
  {
    code: 'Y4_FINALISATION',
    year: 4,
    title: 'Finalisation des travaux',
    description: 'Achever les travaux restés ouverts pendant la prolongation.',
  },
  {
    code: 'Y4_PUBLICATIONS',
    year: 4,
    title: 'Publications restantes',
    description: 'Déposer les publications encore en cours.',
  },
  {
    code: 'Y4_MANUSCRIT',
    year: 4,
    title: 'Manuscrit final',
    description: 'Stabiliser la version finale du manuscrit.',
  },
  {
    code: 'Y4_SOUTENANCE',
    year: 4,
    title: 'Soutenance',
    description: 'Mener la soutenance et les corrections qui suivent.',
  },
];

export type ExistingObjectiveRef = {
  templateCode: string | null;
  title: string;
  doctoralYear: number;
};

export function isDoctoralYear(value: number): value is DoctoralYear {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function yearObjectives(year: DoctoralYear): readonly YearObjective[] {
  return YEAR_OBJECTIVES.filter((item) => item.year === year);
}

/** Year used when an older template is copied. Unknown codes stay on year 1. */
export function legacyDoctoralYear(templateCode: string): DoctoralYear {
  if (
    templateCode === 'EXPERIMENTATION' ||
    templateCode === 'ANALYSE' ||
    templateCode === 'PUBLICATION'
  ) {
    return 2;
  }
  if (templateCode === 'REDACTION' || templateCode === 'SOUTENANCE') return 3;
  return 1;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ');
}

/** Suggestions not already present by code, alias, or same title in that year. */
export function missingYearObjectives(
  year: DoctoralYear,
  existing: readonly ExistingObjectiveRef[],
): YearObjective[] {
  const codes = new Set(existing.flatMap((row) => (row.templateCode ? [row.templateCode] : [])));
  const titles = new Set(
    existing.filter((row) => row.doctoralYear === year).map((row) => normalizeTitle(row.title)),
  );
  return yearObjectives(year).filter((item) => {
    if (codes.has(item.code)) return false;
    if (item.aliases?.some((code) => codes.has(code))) return false;
    return !titles.has(normalizeTitle(item.title));
  });
}
