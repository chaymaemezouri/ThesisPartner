import { composeRulesSynthesis } from './compose-synthesis';

describe('composeRulesSynthesis', () => {
  it('builds a homogeneous subject-focused text without per-item inventory', () => {
    const result = composeRulesSynthesis(
      {
        thesisTitle: 'Apprentissage profond pour la détection d’anomalies',
        studentName: 'Youssef El Amrani',
        objectives: [
          {
            id: 'o1',
            title: 'État de l’art',
            status: 'COMPLETED',
            progress: 100,
            reviewMessage: null,
            tasks: [{ id: 't1', title: 'Comparer les approches', status: 'DONE' }],
          },
          {
            id: 'o2',
            title: 'Définir la méthodologie',
            status: 'IN_PROGRESS',
            progress: 40,
            reviewMessage: null,
            tasks: [{ id: 't2', title: 'Construire le protocole', status: 'TODO' }],
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
        remarks: [
          {
            id: 'r1',
            title: 'Clarifier la méthode',
            status: 'OPEN',
            message: 'Préciser le protocole expérimental.',
            replies: [],
          },
        ],
        deliverables: [
          {
            id: 'v1',
            title: 'Chapitre 2',
            status: 'SUBMITTED',
            reviewMessage: null,
          },
        ],
      },
      'fr',
    );

    expect(result.sections).toEqual([]);
    expect(result.reportTitle.toLowerCase()).toContain('apprentissage profond');
    expect(result.overview).toContain('Youssef El Amrani');
    expect(result.overview).toContain('Guide FAIR');
    expect(result.overview.includes('Concernant l’objectif')).toBe(false);
    expect(result.overview.includes('L’objectif «')).toBe(false);
    expect(result.overview.includes('•')).toBe(false);
    expect(result.overview.split(/\n\n+/).length).toBeGreaterThanOrEqual(3);
    expect(result.overview.split(/\n\n+/).length).toBeLessThanOrEqual(8);
  });
});
