import { composeRulesSynthesis } from './compose-synthesis';

describe('composeRulesSynthesis', () => {
  it('separates problématique, subject summary and state of the art', () => {
    const result = composeRulesSynthesis(
      {
        thesisTitle: 'Apprentissage profond pour la détection d’anomalies',
        studentName: 'Youssef El Amrani',
        objectives: [
          {
            id: 'o1',
            title: 'Définir la problématique de recherche',
            status: 'COMPLETED',
            progress: 100,
            description: 'Poser le sujet, la question de recherche et les hypothèses.',
            templateCode: 'PROBLEMATIQUE',
            reviewMessage: null,
            tasks: [
              { id: 't1', title: 'Formuler la question de recherche', status: 'DONE' },
              { id: 't2', title: 'Définir les hypothèses', status: 'DONE' },
            ],
          },
          {
            id: 'o2',
            title: 'Construire l’état de l’art',
            status: 'COMPLETED',
            progress: 100,
            description: 'Recenser, comparer et synthétiser les publications utiles.',
            templateCode: 'ETAT_ART',
            reviewMessage: null,
            tasks: [{ id: 't3', title: 'Comparer les approches', status: 'DONE' }],
          },
        ],
        documents: [
          {
            id: 'd1',
            title: 'Guide FAIR',
            kind: 'ARTICLE',
            status: 'SUBMITTED',
            summary: 'Les principes FAIR aident à organiser les données de thèse.',
            reviewMessage: null,
          },
        ],
        remarks: [],
        deliverables: [],
      },
      'fr',
    );

    expect(result.sections.map((item) => item.kind)).toEqual([
      'PROBLEM',
      'SUBJECT_SUMMARY',
      'STATE_OF_ART',
    ]);
    expect(result.sections[0]?.title).toBe('Problématique');
    expect(result.sections[1]?.title).toBe('Résumé du sujet');
    expect(result.sections[2]?.title).toBe('État de l’art');
    expect(result.sections[0]?.summary.toLowerCase()).toContain('problématique');
    expect(result.sections[1]?.summary).toContain('article');
    expect(result.sections[1]?.summary).not.toContain('Youssef');
    expect(result.sections[1]?.summary).not.toMatch(/%/);
    expect(result.sections[1]?.summary.toLowerCase()).not.toContain('dossier');
    expect(result.sections[2]?.summary).toContain('FAIR');
    expect(result.overview.includes('•')).toBe(false);
  });
});
