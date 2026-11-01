export type StandardTask = {
  title: string;
  description?: string;
};

export type StandardObjective = {
  code: string;
  title: string;
  description: string;
  tasks: readonly StandardTask[];
};

export type StandardPathLocale = 'en' | 'fr';

const STANDARD_OBJECTIVES_EN: readonly StandardObjective[] = [
  {
    code: 'PROBLEMATIQUE',
    title: 'Define the research problem',
    description: 'Frame the topic, research question and hypotheses, then validate them.',
    tasks: [
      { title: 'Choose the topic' },
      { title: 'Define the scope' },
      { title: 'Identify the scientific problem' },
      { title: 'Formulate the research question' },
      { title: 'Define the hypotheses' },
      { title: 'Define specific objectives' },
      { title: 'Validate with the supervisor' },
    ],
  },
  {
    code: 'ETAT_ART',
    title: 'Build the state of the art',
    description: 'Find, compare and synthesize publications relevant to the research.',
    tasks: [
      { title: 'Define keywords' },
      { title: 'Choose scientific databases' },
      { title: 'Search for publications' },
      { title: 'Filter sources' },
      { title: 'Read and annotate' },
      { title: 'Classify related work' },
      { title: 'Compare approaches' },
      { title: 'Identify research gaps' },
      { title: 'Write the literature review' },
    ],
  },
  {
    code: 'METHODOLOGIE',
    title: 'Define the methodology',
    description: 'Choose the approach, data and protocol, then get them validated.',
    tasks: [
      { title: 'Choose the research approach' },
      { title: 'Define data / population' },
      { title: 'Choose methods' },
      { title: 'Define tools' },
      { title: 'Build the protocol' },
      { title: 'Define evaluation criteria' },
      { title: 'Check feasibility and ethics' },
      { title: 'Supervisor validation' },
    ],
  },
  {
    code: 'EXPERIMENTATION',
    title: 'Produce scientific results',
    description: 'Carry out the experimental work and keep a usable record of it.',
    tasks: [
      { title: 'Prepare data / materials' },
      { title: 'Run experiments' },
      { title: 'Collect results' },
      { title: 'Clean / preprocess' },
      { title: 'Analyze' },
      { title: 'Repeat experiments if needed' },
      { title: 'Document results' },
    ],
  },
  {
    code: 'ANALYSE',
    title: 'Validate and interpret results',
    description: 'Measure, compare and interpret results, then state their limits.',
    tasks: [
      { title: 'Define metrics' },
      { title: 'Test results' },
      { title: 'Compare with existing work' },
      { title: 'Run statistical / qualitative analyses' },
      { title: 'Check robustness' },
      { title: 'Interpret findings' },
      { title: 'Identify limitations' },
      { title: 'Formulate conclusions' },
    ],
  },
  {
    code: 'PUBLICATION',
    title: 'Valorize the research',
    description: 'Prepare, submit and present publishable contributions.',
    tasks: [
      { title: 'Identify publishable contributions' },
      { title: 'Choose journal / conference' },
      { title: 'Prepare the article' },
      { title: 'Supervisor validation' },
      { title: 'Submission' },
      { title: 'Respond to reviewers' },
      { title: 'Revise' },
      { title: 'Acceptance / publication' },
      { title: 'Scientific presentation' },
    ],
  },
  {
    code: 'REDACTION',
    title: 'Write the thesis',
    description: 'Write the manuscript, from the introduction to the final version.',
    tasks: [
      { title: 'Build the outline' },
      { title: 'Write the introduction' },
      { title: 'Write the state of the art' },
      { title: 'Write the methodology' },
      { title: 'Write the results' },
      { title: 'Discussion' },
      { title: 'Conclusion / perspectives' },
      { title: 'Bibliography' },
      { title: 'Proofreading' },
      { title: 'Supervisor corrections' },
      { title: 'Final version' },
    ],
  },
  {
    code: 'SOUTENANCE',
    title: 'Prepare the defense',
    description: 'Submit the manuscript, prepare the presentation and the defense.',
    tasks: [
      { title: 'Check administrative requirements' },
      { title: 'Finalize the manuscript' },
      { title: 'Deposit the thesis' },
      { title: 'Prepare the presentation' },
      { title: 'Prepare demonstrations' },
      { title: 'Anticipate jury questions' },
      { title: 'Mock defense' },
      { title: 'Revise the presentation' },
      { title: 'Defense' },
      { title: 'Post-defense corrections' },
    ],
  },
];

const STANDARD_OBJECTIVES_FR: readonly StandardObjective[] = [
  {
    code: 'PROBLEMATIQUE',
    title: 'Définir la problématique de recherche',
    description: 'Poser le sujet, la question de recherche et les hypothèses, puis les valider.',
    tasks: [
      { title: 'Choisir le sujet' },
      { title: 'Délimiter le périmètre' },
      { title: 'Identifier le problème scientifique' },
      { title: 'Formuler la question de recherche' },
      { title: 'Définir les hypothèses' },
      { title: 'Définir les objectifs spécifiques' },
      { title: 'Validation avec l’encadrant' },
    ],
  },
  {
    code: 'ETAT_ART',
    title: 'Construire l’état de l’art',
    description: 'Recenser, comparer et synthétiser les publications utiles à la recherche.',
    tasks: [
      { title: 'Définir les mots-clés' },
      { title: 'Choisir les bases scientifiques' },
      { title: 'Rechercher les publications' },
      { title: 'Filtrer les sources' },
      { title: 'Lire et annoter' },
      { title: 'Classer les travaux' },
      { title: 'Comparer les approches' },
      { title: 'Identifier les gaps' },
      { title: 'Rédiger la revue de littérature' },
    ],
  },
  {
    code: 'METHODOLOGIE',
    title: 'Définir la méthodologie',
    description: 'Choisir l’approche, les données et le protocole, puis les faire valider.',
    tasks: [
      { title: 'Choisir l’approche de recherche' },
      { title: 'Définir les données/population' },
      { title: 'Choisir les méthodes' },
      { title: 'Définir les outils' },
      { title: 'Construire le protocole' },
      { title: 'Définir les critères d’évaluation' },
      { title: 'Vérifier faisabilité/éthique' },
      { title: 'Validation encadrant' },
    ],
  },
  {
    code: 'EXPERIMENTATION',
    title: 'Produire les résultats scientifiques',
    description: 'Réaliser le travail expérimental et en conserver une trace exploitable.',
    tasks: [
      { title: 'Préparer les données/matériel' },
      { title: 'Exécuter les expériences' },
      { title: 'Collecter les résultats' },
      { title: 'Nettoyer / prétraiter' },
      { title: 'Analyser' },
      { title: 'Répéter si besoin' },
      { title: 'Documenter les résultats' },
    ],
  },
  {
    code: 'ANALYSE',
    title: 'Valider et interpréter les résultats',
    description: 'Mesurer, comparer et interpréter les résultats, puis en préciser les limites.',
    tasks: [
      { title: 'Définir les métriques' },
      { title: 'Tester les résultats' },
      { title: 'Comparer aux travaux existants' },
      { title: 'Analyses statistiques / qualitatives' },
      { title: 'Vérifier la robustesse' },
      { title: 'Interpréter les findings' },
      { title: 'Identifier les limites' },
      { title: 'Formuler les conclusions' },
    ],
  },
  {
    code: 'PUBLICATION',
    title: 'Valoriser la recherche',
    description: 'Préparer, soumettre et présenter des contributions publiables.',
    tasks: [
      { title: 'Identifier les contributions publiables' },
      { title: 'Choisir revue / conférence' },
      { title: 'Préparer l’article' },
      { title: 'Validation encadrant' },
      { title: 'Soumission' },
      { title: 'Répondre aux reviewers' },
      { title: 'Réviser' },
      { title: 'Acceptation / publication' },
      { title: 'Présentation scientifique' },
    ],
  },
  {
    code: 'REDACTION',
    title: 'Rédiger la thèse',
    description: 'Rédiger le manuscrit, de l’introduction à la version finale.',
    tasks: [
      { title: 'Construire le plan' },
      { title: 'Rédiger l’introduction' },
      { title: 'Rédiger l’état de l’art' },
      { title: 'Rédiger la méthodologie' },
      { title: 'Rédiger les résultats' },
      { title: 'Discussion' },
      { title: 'Conclusion / perspectives' },
      { title: 'Bibliographie' },
      { title: 'Relecture' },
      { title: 'Corrections encadrant' },
      { title: 'Version finale' },
    ],
  },
  {
    code: 'SOUTENANCE',
    title: 'Préparer la soutenance',
    description: 'Déposer le manuscrit, préparer la présentation et la soutenance.',
    tasks: [
      { title: 'Vérifier les exigences administratives' },
      { title: 'Finaliser le manuscrit' },
      { title: 'Déposer la thèse' },
      { title: 'Préparer la présentation' },
      { title: 'Préparer les démonstrations' },
      { title: 'Anticiper les questions du jury' },
      { title: 'Soutenance blanche' },
      { title: 'Réviser la présentation' },
      { title: 'Soutenance' },
      { title: 'Corrections post-soutenance' },
    ],
  },
];

/** Canonical English templates (DB + ranking). */
export const STANDARD_OBJECTIVES = STANDARD_OBJECTIVES_EN;

export function standardObjectivesFor(
  locale: StandardPathLocale = 'en',
): readonly StandardObjective[] {
  return locale === 'fr' ? STANDARD_OBJECTIVES_FR : STANDARD_OBJECTIVES_EN;
}

export function parseStandardPathLocale(value: string | undefined | null): StandardPathLocale {
  return value === 'fr' ? 'fr' : 'en';
}
