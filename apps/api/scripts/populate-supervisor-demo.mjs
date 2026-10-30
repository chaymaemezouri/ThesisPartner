/** Seven-person fictional Moroccan doctoral cohort, provisioned through the normal API. */
import { api, pdf, day, key, log, closeSessions, origin } from './populate-demo-platform.mjs';

const password = process.env.DEMO_PASSWORD ?? 'ThesisPartner2026!';
const supervisorEmail = 'demo.encadrant@example.test';
const students = [
  {
    email: 'amina.benjelloun@example.test',
    givenName: 'Amina',
    familyName: 'Benjelloun',
    city: 'Rabat',
    institution: 'Université Mohammed V de Rabat',
    laboratory: 'LRIT',
    specialty: 'Intelligence artificielle médicale',
    title: 'Apprentissage profond pour le dépistage précoce du diabète au Maroc',
    progress: [100, 100, 100, 80, 40],
    goals: [
      'Revue des modèles de dépistage',
      'Protocole éthique et données synthétiques',
      'Entraînement du modèle multimodal',
      'Validation comparative et explicabilité',
      'Rédaction du manuscrit médical',
    ],
    report: 'Rapport de validation du modèle de dépistage',
    article: 'Article fictif — interprétabilité du dépistage multimodal',
    startedOn: '2022-10-01',
    defense: '2027-03-15',
    risk: false,
  },
  {
    email: 'yassine.elfassi@example.test',
    givenName: 'Yassine',
    familyName: 'El Fassi',
    city: 'Fès',
    institution: 'Université Sidi Mohamed Ben Abdellah',
    laboratory: 'Laboratoire des systèmes intelligents et énergie',
    specialty: 'Prévision énergétique',
    title: 'Prévision de la production solaire des toitures de la médina de Fès',
    progress: [100, 70, 30, 0, 0],
    goals: [
      'Cartographie des toitures et sources météo',
      'Collecte et contrôle des séries solaires',
      'Modèle de prévision horaire',
      'Comparaison des méthodes et robustesse',
      'Rédaction et valorisation énergétique',
    ],
    report: 'Rapport de contrôle des séries solaires',
    article: 'Article fictif — prévision solaire urbaine à Fès',
    startedOn: '2023-10-01',
    defense: '2027-09-30',
    risk: true,
  },
  {
    email: 'salma.cherkaoui@example.test',
    givenName: 'Salma',
    familyName: 'Cherkaoui',
    city: 'Casablanca',
    institution: 'Université Hassan II de Casablanca',
    laboratory: 'Laboratoire informatique et traitement des langues',
    specialty: 'Traitement automatique de la darija',
    title: 'Modèles de langue pour la darija dans les services publics marocains',
    progress: [100, 100, 100, 70, 30],
    goals: [
      'Constitution du corpus darija fictif',
      'État de l’art des modèles multilingues',
      'Adaptation et entraînement du modèle',
      'Évaluation des intentions administratives',
      'Article et manuscrit sur les usages publics',
    ],
    report: 'Rapport d’évaluation linguistique de la darija',
    article: 'Article fictif — compréhension des démarches en darija',
    startedOn: '2022-11-01',
    defense: '2027-02-28',
    risk: false,
  },
  {
    email: 'omar.idrissi@example.test',
    givenName: 'Omar',
    familyName: 'Idrissi',
    city: 'Marrakech',
    institution: 'Université Cadi Ayyad',
    laboratory: 'Laboratoire informatique et systèmes',
    specialty: 'Vision par ordinateur et patrimoine',
    title: 'Reconnaissance des motifs du patrimoine architectural de Marrakech',
    progress: [100, 50, 20, 0, 0],
    goals: [
      'Cadrage et autorisations de collecte',
      'Protocole de numérisation des motifs',
      'Constitution du corpus d’images fictives',
      'Modèle de reconnaissance et validation',
      'Valorisation du patrimoine et manuscrit',
    ],
    report: 'Note de protocole de numérisation patrimoniale',
    article: 'Article fictif — reconnaissance des motifs architecturaux',
    startedOn: '2024-10-01',
    defense: '2028-06-30',
    risk: false,
  },
  {
    email: 'imane.berrada@example.test',
    givenName: 'Imane',
    familyName: 'Berrada',
    city: 'Agadir',
    institution: 'Université Ibn Zohr',
    laboratory: 'Laboratoire systèmes intelligents et environnement',
    specialty: 'Gestion intelligente de l’eau',
    title: 'Détection des fuites et optimisation de l’eau dans les réseaux urbains d’Agadir',
    progress: [100, 100, 80, 30, 0],
    goals: [
      'Analyse des réseaux et indicateurs hydriques',
      'Jeu de données et protocole des capteurs',
      'Détection temporelle des fuites',
      'Optimisation et scénarios de robustesse',
      'Article et synthèse environnementale',
    ],
    report: 'Rapport d’expérimentation sur les capteurs hydriques',
    article: 'Article fictif — anomalies des réseaux d’eau urbains',
    startedOn: '2023-01-15',
    defense: '2027-07-15',
    risk: true,
  },
  {
    email: 'hamza.tazi@example.test',
    givenName: 'Hamza',
    familyName: 'Tazi',
    city: 'Tanger',
    institution: 'Université Abdelmalek Essaâdi',
    laboratory: 'Laboratoire informatique et cybersécurité',
    specialty: 'Cybersécurité des objets connectés',
    title: 'Détection d’intrusions dans les objets connectés des infrastructures portuaires',
    progress: [100, 40, 0, 0, 0],
    goals: [
      'État de l’art des attaques IoT',
      'Modélisation des menaces portuaires',
      'Banc de simulation des flux fictifs',
      'Détection distribuée et comparaison',
      'Rédaction et recommandations de sécurité',
    ],
    report: 'Rapport de modélisation des menaces IoT',
    article: 'Article fictif — intrusion et détection distribuée',
    startedOn: '2025-01-15',
    defense: '2028-10-30',
    risk: false,
  },
];

async function ensurePortfolio(who, publications, projects, skills) {
  const existing = await api(who, '/portfolio');
  for (const item of publications)
    if (!existing.publications.some((row) => row.title === item.title))
      await api(who, '/portfolio/publications', 'POST', item);
  for (const item of projects)
    if (!existing.projects.some((row) => row.title === item.title))
      await api(who, '/portfolio/projects', 'POST', item);
  for (const label of skills)
    if (!existing.skills.some((row) => row.label === label))
      await api(who, '/portfolio/skills', 'POST', { label });
}

async function ensureCv(who, name, specialty) {
  const profile = await api(who, '/profile');
  if (profile.cvUrl && who !== 1) return;
  const form = new FormData();
  form.append(
    'file',
    pdf(
      `CV fictif de demonstration - ${name}`,
      [
        'Identite fictive creee pour la demonstration client Thesis Flow.',
        `Domaine du scenario : ${specialty}.`,
        'Cadre : recherche doctorale, suivi scientifique, livrables et experimentation reproductible.',
        'Encadrement du scenario : Pr. Karim El Mansouri, Maroc.',
        'Competences : analyse de donnees, methodologie experimentale et redaction scientifique.',
        'Ce document ne revendique aucun diplome ni aucune publication reelle.',
      ],
      name,
    ),
    `cv-demo-${key(name).replace(/[^a-z0-9]+/g, '-')}.pdf`,
  );
  await api(who, '/profile/cv', 'POST', form);
}

async function main() {
  await api(1, '/auth/login', 'POST', { email: supervisorEmail, password });
  await api(0, '/auth/login', 'POST', { email: 'demo.doctorant@example.test', password });
  await api(0, '/profile', 'PATCH', { avatarUrl: `${origin}/tmp-avatars/youssef-el-amrani.jpg` });
  await api(1, '/profile', 'PATCH', {
    givenName: 'Karim',
    familyName: 'El Mansouri',
    academicTitle: 'Professeur',
    institution: 'Université Mohammed V de Rabat',
    laboratory: 'LRIT — systèmes intelligents',
    doctoralSchool: 'Sciences et Techniques',
    specialty: 'Intelligence artificielle et systèmes intelligents',
    city: 'Rabat',
    country: 'Maroc',
    avatarUrl: `${origin}/tmp-avatars/anas-el-ouazzani.jpg`,
  });
  await ensureCv(1, 'Pr. Karim El Mansouri', 'Intelligence artificielle et encadrement doctoral');
  log('Supervisor renamed: Pr. Karim El Mansouri; login email preserved.');
  await ensurePortfolio(
    1,
    [
      {
        title: 'Démonstration — méthodes fiables pour les systèmes intelligents',
        venue: 'Revue fictive de démonstration en IA',
        year: 2026,
        kind: 'ARTICLE',
      },
      {
        title: 'Démonstration — encadrement doctoral et recherche reproductible',
        venue: 'Séminaire scientifique fictif au Maroc',
        year: 2026,
        kind: 'CONFERENCE',
      },
      {
        title: 'Démonstration — apprentissage temporel et capteurs urbains',
        venue: 'Actes fictifs du laboratoire',
        year: 2025,
        kind: 'ARTICLE',
      },
    ],
    [
      {
        title: 'Programme fictif — IA pour les territoires marocains',
        summary:
          'Coordination pédagogique de sept dossiers de démonstration : énergie, eau, santé, langues, patrimoine et cybersécurité.',
      },
      {
        title: 'Atelier fictif — reproductibilité doctorale',
        summary:
          'Grilles de lecture, protocoles expérimentaux, évaluations périodiques et suivi des publications.',
      },
    ],
    [
      'Encadrement doctoral',
      'Apprentissage automatique',
      'Systèmes intelligents',
      'Analyse de séries temporelles',
      'Évaluation scientifique',
      'Reproductibilité',
      'Rédaction académique',
    ],
  );

  const summary = [];
  for (const [index, student] of students.entries()) {
    const who = index + 2;
    log(`Preparing ${index + 1}/6: ${student.givenName} ${student.familyName}`);
    await api(who, '/auth/login', 'POST', { email: student.email, password }).catch(
      async (error) => {
        if (!error.message.includes(': 401 ')) throw error;
        await api(who, '/auth/register', 'POST', {
          email: student.email,
          password,
          givenName: student.givenName,
          familyName: student.familyName,
          institution: student.institution,
        });
      },
    );
    await api(who, '/profile', 'PATCH', {
      academicTitle: ['Amina', 'Salma', 'Imane'].includes(student.givenName)
        ? 'Doctorante'
        : 'Doctorant',
      institution: student.institution,
      laboratory: student.laboratory,
      doctoralSchool: 'Sciences et Techniques',
      specialty: student.specialty,
      city: student.city,
      country: 'Maroc',
    });
    await ensureCv(who, `${student.givenName} ${student.familyName}`, student.specialty);
    const visible = (await api(who, '/theses')).theses;
    let thesis = visible.find(
      (row) => row.role === 'DOCTORAL_STUDENT' && row.title === student.title,
    );
    if (!thesis) {
      thesis = await api(who, '/theses', 'POST', { title: student.title });
    }
    const base = `/theses/${thesis.id}`;
    // Replace only untouched generated templates in these named fictional cohort dossiers.
    const generated = (await api(who, `${base}/objectives`)).objectives;
    for (const row of generated)
      if (
        ['PLANNED', 'IN_PROGRESS'].includes(row.status) &&
        row.progress === 0 &&
        row.origin === 'STANDARD_TEMPLATE' &&
        row.taskSummary?.done === 0 &&
        row.taskSummary?.inProgress === 0
      )
        await api(who, `${base}/objectives/${row.id}`, 'DELETE', {});
    const detail = await api(who, base);
    if (!detail.members.some((row) => row.email === supervisorEmail && row.role === 'SUPERVISOR'))
      await api(who, `${base}/members`, 'POST', { email: supervisorEmail, role: 'SUPERVISOR' });
    await api(who, base, 'PATCH', {
      discipline: 'Informatique',
      institution: student.institution,
      startedOn: student.startedOn,
      expectedDefenseOn: student.defense,
    });

    const oldGoals = (await api(who, `${base}/objectives`)).objectives;
    const goals = [];
    for (const [position, title] of student.goals.entries()) {
      let goal = oldGoals.find((row) => row.title === title);
      const progress = student.progress[position];
      if (!goal)
        goal = await api(1, `${base}/objectives`, 'POST', {
          title,
          description: `Objectif du dossier fictif de ${student.givenName} : ${student.specialty}. Justifications, protocole et résultats à présenter dans les livrables associés.`,
          status: progress > 0 ? 'IN_PROGRESS' : 'PLANNED',
          progress,
          priority: student.risk && progress > 0 && progress < 100 ? 'HIGH' : 'MEDIUM',
          startDate: student.startedOn,
          dueDate: day(
            progress === 100
              ? -60 - position * 15
              : student.risk && position === 1
                ? -12
                : 15 + position * 25,
          ),
          responsibleUserId: detail.members.find((row) => row.role === 'DOCTORAL_STUDENT').userId,
        });
      if (progress === 100 && goal.status !== 'COMPLETED') {
        if (goal.completionReview?.status !== 'PENDING')
          await api(who, `${base}/objectives/${goal.id}/request-completion`, 'POST', {});
        goal = await api(1, `${base}/objectives/${goal.id}/approve-completion`, 'POST', {});
      }
      goals.push(goal);
    }
    const active = goals.find((row) => row.status === 'IN_PROGRESS' && row.progress < 100);
    if (active && !(await api(who, `${base}/objectives/${active.id}/tasks`)).tasks.length) {
      for (const [position, title] of [
        'Documenter le protocole et les hypothèses',
        'Vérifier les métriques et les résultats',
        'Préparer la synthèse pour l’encadrant',
      ].entries())
        await api(who, `${base}/objectives/${active.id}/tasks`, 'POST', {
          title,
          status: position === 0 ? 'DONE' : position === 1 ? 'IN_PROGRESS' : 'TODO',
          dueDate: day(position * 5 + 5),
        });
    }

    const deliverableFixtures = [
      { title: student.report, type: 'REPORT', target: 'VALIDATED', goal: goals[0] },
      {
        title: student.article,
        type: 'ARTICLE',
        target: index % 2 ? 'CHANGES_REQUESTED' : 'SUBMITTED',
        goal: active ?? goals[1],
      },
      {
        title: `Présentation de suivi — ${student.givenName} ${student.familyName}`,
        type: 'PRESENTATION',
        target: 'DRAFT',
        goal: goals[4],
      },
    ];
    const previousDeliverables = (await api(who, `${base}/deliverables`)).deliverables;
    const deliverables = [];
    for (const [position, fixture] of deliverableFixtures.entries()) {
      let item = previousDeliverables.find((row) => row.title === fixture.title);
      if (!item)
        item = await api(who, `${base}/deliverables`, 'POST', {
          title: fixture.title,
          type: fixture.type,
          objectiveId: fixture.goal.id,
          description: `Démonstration fictive — ${student.title}. Contenu : question de recherche, protocole, grille de comparaison, résultats illustratifs et prochaines étapes. Encadrement : Pr. Karim El Mansouri.`,
          dueDate: day(
            position === 0 ? -20 : student.risk && position === 1 ? -5 : 10 + position * 10,
          ),
        });
      const path = `${base}/deliverables/${item.id}`;
      const versions = (await api(who, `${path}/versions`)).versions;
      if (!versions.length) {
        const version = await api(who, `${path}/versions`, 'POST', {
          title: `${fixture.title} — v1`,
          changeSummary:
            'Version fictive de démonstration : contexte, protocole reproductible, comparaison et limites.',
        });
        const form = new FormData();
        form.append(
          'file',
          pdf(
            fixture.title,
            [
              `Sujet : ${student.title}.`,
              `Specialite : ${student.specialty}.`,
              '1. CONTEXTE ET QUESTION DE RECHERCHE',
              'Etudier une application de systemes intelligents dans le contexte marocain, avec des donnees exclusivement fictives.',
              '2. PROTOCOLE',
              'Definir les sources, separer les donnees, documenter les parametres et conserver les versions des experiences.',
              '3. COMPARAISON ET RESULTATS',
              'Comparer une methode de reference a une approche avancee. Rapporter precision, rappel, cout et limites. Aucun resultat scientifique reel n est revendique.',
              '4. PROCHAINES ETAPES',
              'Completer les tests de robustesse, documenter les cas difficiles et discuter les conclusions avec l encadrant.',
            ],
            `${student.givenName} ${student.familyName} | Encadrant : Pr. Karim El Mansouri`,
          ),
          `demo-${index + 1}-${position + 1}.pdf`,
        );
        await api(who, `${path}/versions/${version.id}/file`, 'POST', form);
      }
      if (item.status === 'DRAFT' && fixture.target !== 'DRAFT')
        item = await api(who, `${path}/submit`, 'POST', {});
      if (item.status === 'SUBMITTED' && fixture.target === 'VALIDATED')
        item = await api(1, `${path}/approve`, 'POST', {});
      if (item.status === 'SUBMITTED' && fixture.target === 'CHANGES_REQUESTED')
        item = await api(1, `${path}/request-changes`, 'POST', {
          message:
            'Préciser le protocole, compléter les métriques et distinguer les résultats illustratifs des conclusions scientifiques. Ajouter une discussion des limites.',
        });
      deliverables.push(item);
    }

    const oldRemarks = (await api(who, `${base}/remarks`)).remarks;
    for (const [position, title] of [
      'Renforcer la justification méthodologique',
      'Préparer la prochaine synthèse scientifique',
    ].entries())
      if (!oldRemarks.some((row) => row.title === title)) {
        const remark = await api(1, `${base}/remarks`, 'POST', {
          title,
          message:
            position === 0
              ? `Pour le sujet « ${student.title} », préciser les choix de données et ajouter une comparaison reproductible avec la référence.`
              : 'Préparer une synthèse courte : acquis, difficultés, calendrier et besoins d’arbitrage. Identifier une limite à traiter avant la prochaine réunion.',
          priority: student.risk ? 'HIGH' : 'MEDIUM',
          deliverableId: deliverables[position].id,
        });
        await api(who, `${base}/remarks/${remark.id}/replies`, 'POST', {
          message:
            'Merci Professeur. Le dossier fictif est mis à jour et les éléments complémentaires seront présentés lors du prochain point.',
        });
        if (position === 0 && !student.risk) {
          await api(who, `${base}/remarks/${remark.id}/resolve`, 'POST', {});
          await api(1, `${base}/remarks/${remark.id}/close`, 'POST', {});
        }
      }

    const oldMeetings = Object.values(await api(who, `${base}/meetings`)).flat();
    for (const [position, title] of [
      `Bilan scientifique — ${student.givenName}`,
      `Point de suivi — ${student.givenName}`,
    ].entries())
      if (!oldMeetings.some((row) => row.title === title)) {
        const meeting = await api(1, `${base}/meetings`, 'POST', {
          title,
          scheduledOn: day(position === 0 ? -8 - index : index + 2),
          mode: 'IN_PERSON',
          location: `${student.laboratory}, ${student.city} — démonstration`,
          agenda: `Examiner l’avancement de ${student.givenName}, relire le livrable et fixer les priorités de la prochaine période.`,
        });
        if (position === 0)
          await api(1, `${base}/meetings/${meeting.id}/hold`, 'POST', {
            minutes: `Compte rendu fictif : acquis et difficultés examinés. Décisions : documenter les tests, compléter les métriques et préparer le rapport. ${student.givenName} prépare les corrections ; Pr. Karim El Mansouri relit la synthèse.`,
          });
      }

    await ensurePortfolio(
      who,
      [
        {
          title: student.article,
          venue: 'Dossier scientifique fictif de démonstration',
          year: 2026,
          kind: 'ARTICLE',
        },
        {
          title: `Communication fictive — ${student.specialty}`,
          venue: 'Séminaire doctoral fictif au Maroc',
          year: 2026,
          kind: 'CONFERENCE',
        },
      ],
      [
        {
          title: `Prototype de démonstration — ${student.givenName}`,
          summary: `Prototype fictif : ${student.specialty}. Données synthétiques, protocole reproductible et analyse des limites.`,
        },
      ],
      ['Python', 'Méthodologie expérimentale', student.specialty],
    );
    const publications = (await api(who, '/portfolio')).publications;
    const article = publications.find((row) => row.title === student.article);
    const targetStatus = [
      'ACCEPTED',
      'SUBMITTED',
      'PUBLISHED',
      'IN_PREPARATION',
      'SUBMITTED',
      'IN_PREPARATION',
    ][index];
    if (article && article.status !== targetStatus)
      await api(1, `/supervision/desk/publications/${article.id}/status`, 'POST', {
        status: targetStatus,
      });

    const evaluationComment = `Évaluation fictive de ${student.givenName} ${student.familyName} : ${student.risk ? 'priorité au rattrapage du calendrier et à la complétude des données' : 'progression régulière, consolider la comparaison et la discussion des limites'}. Prochaine étape : synthèse et protocole reproductible.`;
    const desk = await api(1, '/supervision/desk');
    if (
      !desk.evaluations.some(
        (row) => row.thesisId === thesis.id && row.comment === evaluationComment,
      )
    )
      await api(1, `/supervision/desk/theses/${thesis.id}/evaluations`, 'POST', {
        evaluatedOn: day(-index - 1),
        quality: student.risk ? 3 : 4,
        autonomy: 4,
        methodology: 3,
        advancement: student.risk ? 2 : 4,
        comment: evaluationComment,
      });

    const mailbox = await api(who, '/messages/conversations');
    const conversation = mailbox.conversations.find((row) => row.kind === 'DIRECT');
    const thread = await api(who, `/messages/conversations/${conversation.id}`);
    for (const [author, body] of [
      [
        1,
        `Bonjour ${student.givenName}, le dossier de démonstration est prêt. Merci de préparer le prochain point sur ${student.specialty.toLowerCase()}. — Pr. Karim El Mansouri`,
      ],
      [
        who,
        'Bonjour Professeur, le rapport et le projet d’article sont déposés. Je prépare une synthèse des résultats, des limites et du calendrier.',
      ],
      [
        1,
        'Merci. Les retours et la prochaine réunion sont dans votre espace. Cet échange est fictif et réservé à la démonstration client.',
      ],
    ])
      if (!thread.messages.some((row) => row.body === body))
        await api(author, `/messages/conversations/${conversation.id}/messages`, 'POST', { body });
    const dashboard = await api(who, '/dashboard');
    summary.push({
      name: `${student.givenName} ${student.familyName}`,
      email: student.email,
      thesisId: thesis.id,
      progress: dashboard.workProgress.percentage,
      objectives: dashboard.objectives.total,
      deliverables: dashboard.deliverables.total,
    });
    log(
      `Ready: ${student.givenName}, ${dashboard.workProgress.percentage}% progress, 3 deliverables.`,
    );
  }

  const groupTitle = 'Atelier doctoral — systèmes intelligents au Maroc';
  const mailbox = await api(1, '/messages/conversations');
  let group = mailbox.conversations.find((row) => row.title === groupTitle);
  if (!group) {
    const studentIds = mailbox.students.map((row) => row.userId ?? row.id).filter(Boolean);
    if (studentIds.length)
      group = await api(1, '/messages/conversations/groups', 'POST', {
        title: groupTitle,
        studentIds,
      });
  }
  if (group) {
    const thread = await api(1, `/messages/conversations/${group.id}`);
    const body =
      'Bienvenue dans notre atelier doctoral de démonstration. Chaque doctorant prépare une synthèse de ses acquis, difficultés et prochaines étapes. Les supports sont disponibles dans la bibliothèque. — Pr. Karim El Mansouri';
    if (!thread.messages.some((row) => row.body === body))
      await api(1, `/messages/conversations/${group.id}/messages`, 'POST', { body });
  }
  const resourceTitles = [
    [
      'Grille de suivi du comité doctoral',
      'DOCUMENT',
      'Grille fictive : acquis, risques, calendrier, livrables et décisions. Préparer une synthèse avant chaque comité.',
    ],
    [
      'Atelier transversal — rédaction et reproductibilité',
      'COURSE',
      'Formation fictive du groupe : structurer une contribution, documenter les expériences et présenter les limites.',
    ],
    [
      'Fiche de lecture — comparer une méthode à une référence',
      'ARTICLE',
      'Support pédagogique fictif : définir les critères, conserver les paramètres et analyser les cas difficiles.',
    ],
  ];
  const library = await api(1, '/resources');
  for (const [title, kind, description] of resourceTitles)
    if (!library.resources.some((row) => row.title === title))
      await api(1, '/resources', 'POST', {
        title,
        kind,
        summary: description,
        source: 'Pr. Karim El Mansouri — démonstration',
      });
  const supervised = await api(1, '/supervision/theses');
  const desk = await api(1, '/supervision/desk');
  log(
    JSON.stringify(
      {
        supervisor: await api(1, '/profile'),
        supervisedTheses: supervised.theses.length,
        students: summary,
        components: Object.fromEntries(
          Object.entries(desk).map(([name, rows]) => [
            name,
            Array.isArray(rows) ? rows.length : typeof rows,
          ]),
        ),
      },
      null,
      2,
    ),
  );
  if (supervised.theses.length !== 7)
    throw new Error(`Expected 7 supervised theses; found ${supervised.theses.length}.`);
  for (const name of [
    'notifications',
    'schedule',
    'evaluations',
    'publications',
    'decisions',
    'plans',
  ])
    if (!desk[name]?.length) throw new Error(`Empty supervisor component: ${name}`);
  // The Reports screen generates reports from plans, schedule and evaluations.
  if (!desk.plans.some((plan) => plan.phases.length) || !desk.evaluations.length)
    throw new Error('Report source data is missing.');
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  await closeSessions();
}
