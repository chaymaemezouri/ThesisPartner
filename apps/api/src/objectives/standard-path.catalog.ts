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

/** Starting doctoral path. These rows are templates, never the user's objectives. */
export const STANDARD_OBJECTIVES: readonly StandardObjective[] = [
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
    description: 'Mener le travail expérimental et en conserver une trace exploitable.',
    tasks: [
      { title: 'Préparer les données/matériel' },
      { title: 'Réaliser les expérimentations' },
      { title: 'Collecter les résultats' },
      { title: 'Nettoyer/prétraiter' },
      { title: 'Analyser' },
      { title: 'Refaire les expériences si nécessaire' },
      { title: 'Documenter les résultats' },
    ],
  },
  {
    code: 'ANALYSE',
    title: 'Valider et interpréter les résultats',
    description: 'Mesurer, comparer et interpréter les résultats, puis en tirer les limites.',
    tasks: [
      { title: 'Définir les métriques' },
      { title: 'Tester les résultats' },
      { title: 'Comparer aux travaux existants' },
      { title: 'Effectuer analyses statistiques/qualitatives' },
      { title: 'Vérifier robustesse' },
      { title: 'Interpréter' },
      { title: 'Identifier limites' },
      { title: 'Formuler les conclusions' },
    ],
  },
  {
    code: 'PUBLICATION',
    title: 'Valoriser la recherche',
    description: 'Préparer, soumettre et présenter les contributions publiables.',
    tasks: [
      { title: 'Identifier les contributions publiables' },
      { title: 'Choisir revue/conférence' },
      { title: 'Préparer l’article' },
      { title: 'Validation encadrant' },
      { title: 'Soumission' },
      { title: 'Répondre aux reviewers' },
      { title: 'Corriger' },
      { title: 'Acceptation/publication' },
      { title: 'Présentation scientifique' },
    ],
  },
  {
    code: 'REDACTION',
    title: 'Rédiger la thèse',
    description: 'Rédiger le manuscrit, de l’introduction à la version finale.',
    tasks: [
      { title: 'Construire le plan' },
      { title: 'Rédiger introduction' },
      { title: 'Rédiger état de l’art' },
      { title: 'Rédiger méthodologie' },
      { title: 'Rédiger résultats' },
      { title: 'Discussion' },
      { title: 'Conclusion/perspectives' },
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
      { title: 'Vérifier les conditions administratives' },
      { title: 'Finaliser manuscrit' },
      { title: 'Dépôt de la thèse' },
      { title: 'Préparer présentation' },
      { title: 'Préparer démonstrations' },
      { title: 'Anticiper questions du jury' },
      { title: 'Soutenance blanche' },
      { title: 'Corriger présentation' },
      { title: 'Soutenance' },
      { title: 'Corrections post-soutenance' },
    ],
  },
];
