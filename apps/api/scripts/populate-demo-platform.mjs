/** Populate the two fictional demo users through the deployed application's normal API. */
import { setTimeout as delay } from 'node:timers/promises';

const origin = new URL(process.argv[2] ?? process.env.DEMO_APP_URL).origin;
const password = process.env.DEMO_PASSWORD ?? 'ThesisPartner2026!';
const emails = ['demo.doctorant@example.test', 'demo.encadrant@example.test'];
const sessions = [];
const failures = [];
let calls = [];
const reference = new Date(
  `${process.env.DEMO_REFERENCE_DATE ?? new Date().toISOString().slice(0, 10)}T12:00:00Z`,
);
const day = (offset) =>
  new Date(reference.getTime() + offset * 86400000).toISOString().slice(0, 10);
const log = (message) => process.stdout.write(`${message}\n`);
const key = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

async function api(who, endpoint, method = 'GET', body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    calls = calls.filter((time) => Date.now() - time < 61000);
    while (calls.length >= 75) {
      await delay(Math.min(10000, Math.max(100, 61050 - (Date.now() - calls[0]))));
      calls = calls.filter((time) => Date.now() - time < 61000);
    }
    const headers = { Origin: origin };
    if (sessions[who]) Object.assign(headers, sessions[who]);
    const multipart = body instanceof FormData;
    if (body && !multipart) headers['Content-Type'] = 'application/json';
    calls.push(Date.now());
    const response = await fetch(`${origin}/api/v1${endpoint}`, {
      method,
      headers,
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 429) {
      log('API rate limit: pausing before retry.');
      await delay(20000);
      continue;
    }
    const data = await response.json();
    if (!response.ok)
      throw new Error(`${method} ${endpoint}: ${response.status} ${JSON.stringify(data)}`);
    if (endpoint === '/auth/login') {
      const pairs = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
      sessions[who] = {
        Cookie: pairs.join('; '),
        'x-csrf-token': decodeURIComponent(
          pairs.find((pair) => pair.startsWith('tp_csrf='))?.slice(8) ?? '',
        ),
      };
    }
    return data;
  }
  throw new Error(`API rate limit persisted: ${endpoint}`);
}

async function optional(label, task) {
  try {
    return await task();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    log(`INCOMPLETE ${label}: ${error.message}`);
  }
}

// One-page downloadable research fixture. Results are explicitly synthetic.
function pdf(title, paragraphs, author = 'Youssef El Amrani | Encadrante : Nora Bernard') {
  const lines = [
    'THESISPARTNER - DEMONSTRATION CLIENT',
    title,
    author,
    '',
    'Document fictif : les chiffres et resultats illustrent uniquement la demonstration.',
    '',
    ...paragraphs,
  ];
  const wrapped = lines.flatMap((line) => {
    const words = line
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\x20-\x7e]/g, ' ')
      .split(/\s+/);
    const rows = [];
    let row = '';
    for (const word of words) {
      if ((row + ' ' + word).length > 88) {
        rows.push(row);
        row = word;
      } else row += (row ? ' ' : '') + word;
    }
    rows.push(row);
    return rows;
  });
  const escaped = (line) => line.replace(/[\\()]/g, '\\$&');
  const stream = `BT /F1 10 Tf 48 790 Td 15 TL\n${wrapped.map((line, i) => `${i ? 'T* ' : ''}(${escaped(line)}) Tj`).join('\n')}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output));
    output += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([output], { type: 'application/pdf' });
}

async function main() {
  for (const [who, email] of emails.entries())
    await api(who, '/auth/login', 'POST', { email, password });
  for (let who = 0; who < emails.length; who++)
    await optional(`demo CV ${who}`, async () => {
      const profile = await api(who, '/profile');
      if (!profile.cvUrl) {
        const name = who === 0 ? 'Youssef El Amrani' : 'Nora Bernard';
        const form = new FormData();
        form.append(
          'file',
          pdf(
            `CV fictif de demonstration - ${name}`,
            [
              'IDENTITE DE DEMONSTRATION - ce CV ne represente pas une personne reelle.',
              who === 0
                ? 'Doctorant en informatique - intelligence artificielle et series temporelles.'
                : 'Encadrante fictive - apprentissage automatique et methodologie experimentale.',
              'Institution du scenario : Universite Mohammed V de Rabat ; laboratoire LRIT.',
              'THEMES : detection d anomalies, reseaux electriques intelligents, reproductibilite.',
              'COMPETENCES : Python, analyse de donnees, experimentation et redaction scientifique.',
              who === 0
                ? 'PROJET : comparaison de detecteurs et analyse des faux positifs.'
                : 'ENCADREMENT : suivi du dossier fictif de Youssef El Amrani.',
              'Document genere pour tester le depot et le telechargement de CV dans ThesisPartner.',
            ],
            name,
          ),
          `cv-demo-${who === 0 ? 'youssef' : 'nora'}.pdf`,
        );
        await api(who, '/profile/cv', 'POST', form);
      }
      if (who === 0 && !profile.avatarUrl) {
        const portrait = await fetch(`${origin}/tmp-avatars/youssef-el-amrani.jpg`);
        if (portrait.ok && portrait.headers.get('content-type')?.startsWith('image/')) {
          const form = new FormData();
          form.append('file', await portrait.blob(), 'youssef-demo.jpg');
          await api(who, '/profile/avatar', 'POST', form);
        }
      }
    });
  const { theses } = await api(0, '/theses');
  const thesis = theses.find((item) => item.role === 'DOCTORAL_STUDENT');
  if (!thesis) throw new Error('The demo doctoral thesis must exist first.');
  const base = `/theses/${thesis.id}`;
  const { objectives } = await api(0, `${base}/objectives`);
  const fragments = [
    'problematique',
    'etat de',
    'methodologie',
    'produire',
    'interpreter',
    'valoriser',
    'rediger',
    'soutenance',
  ];
  const ordered = fragments.map((fragment) =>
    objectives.find((objective) => key(objective.title).includes(fragment)),
  );
  if (ordered.some((objective) => !objective))
    throw new Error('Expected eight standard objectives.');
  log(`Populating demo thesis on ${origin}`);

  for (const [index, objective] of ordered.entries()) {
    if (objective.status === 'COMPLETED' || objective.completionReview?.status === 'APPROVED')
      continue;
    const path = `${base}/objectives/${objective.id}`;
    await api(1, path, 'PATCH', {
      startDate: day(-600 + index * 70),
      dueDate: day([-380, -250, -160, -25, 18, 60, 190, 270][index]),
      priority: index === 4 ? 'HIGH' : 'MEDIUM',
      ...(index === 4 ? { status: 'IN_PROGRESS' } : {}),
    });
    const { tasks } = await api(0, `${path}/tasks`);
    for (const [i, task] of tasks.entries()) {
      const desired =
        index < 4 || (index === 4 && i === 0)
          ? 'DONE'
          : index === 4 && i === 1
            ? 'IN_PROGRESS'
            : 'TODO';
      if (task.status !== desired && task.status !== 'DONE')
        await api(0, `${path}/tasks/${task.id}`, 'PATCH', { status: desired });
    }
    if (index < 4) {
      const current = await api(0, path);
      if (current.completionReview?.status !== 'PENDING')
        await api(0, `${path}/request-completion`, 'POST', {});
      await api(1, `${path}/approve-completion`, 'POST', {});
    }
    log(`Objective ${index + 1}/8: ${objective.title}`);
  }

  const deliverableFixtures = [
    {
      title: 'Note de cadrage et hypothèses de recherche',
      type: 'REPORT',
      objective: 0,
      target: 'VALIDATED',
      offset: -380,
      summary:
        'Problématique validée : détecter les anomalies rares sur des séries de consommation électrique sans fuite entre entraînement et test.',
      sections: [
        '1. QUESTION DE RECHERCHE',
        'Comment détecter les anomalies des réseaux électriques avec peu de données étiquetées ?',
        '2. HYPOTHESES',
        'Un autoencodeur temporel peut modéliser le comportement normal. Un seuil adaptatif limite les fausses alertes.',
        '3. PERIMETRE',
        'Séries multivariées, validation chronologique et comparaison avec Isolation Forest. Aucune donnée personnelle réelle.',
        '4. CRITERES DE REUSSITE',
        'Comparer précision, rappel, F1 et nombre de fausses alertes par jour. Documenter les limites.',
      ],
    },
    {
      title: 'Revue bibliographique et matrice de comparaison',
      type: 'THESIS_CHAPTER',
      objective: 1,
      target: 'VALIDATED',
      offset: -250,
      summary:
        'Synthèse de démonstration : approches statistiques, Isolation Forest, autoencodeurs et modèles temporels ; protocole de recherche et grille comparative.',
      sections: [
        '1. STRATEGIE DOCUMENTAIRE',
        'Mots-clés : time-series anomaly detection, smart grids, autoencoder, concept drift.',
        '2. GRILLE DE COMPARAISON',
        'Comparer supervision, coût de calcul, explicabilité et sensibilité au déséquilibre.',
        '3. SYNTHESE',
        'Les méthodes statistiques servent de référence. Les modèles temporels exploitent les dépendances entre capteurs.',
        '4. LACUNE CIBLEE',
        'Concilier détection des événements rares, dérive de distribution et coût des fausses alarmes.',
      ],
    },
    {
      title: 'Protocole expérimental reproductible',
      type: 'REPORT',
      objective: 2,
      target: 'CHANGES_REQUESTED',
      offset: 7,
      summary:
        'Partition chronologique 60/20/20, normalisation apprise uniquement sur l’entraînement et comparaison des méthodes sur les mêmes fenêtres.',
      sections: [
        '1. DONNEES',
        'Jeu de données synthétique de démonstration : capteurs, puissance, tension et température.',
        '2. PRETRAITEMENT',
        'Contrôler les valeurs manquantes, conserver les dates et éviter toute fuite de données.',
        '3. EXPERIENCE',
        'Partition chronologique 60/20/20, trois graines aléatoires et seuil choisi sur validation.',
        '4. A COMPLETER',
        'Ajouter les intervalles de confiance, le budget de calcul et une analyse de sensibilité du seuil.',
      ],
    },
    {
      title: 'Résultats préliminaires et analyse comparative',
      type: 'REPORT',
      objective: 4,
      target: 'SUBMITTED',
      offset: 14,
      summary:
        'Résultats fictifs pour tester la revue : comparaison du rappel et du F1, ablation de la fenêtre temporelle, premiers cas de faux positifs.',
      sections: [
        '1. RESULTATS SYNTHETIQUES - NON SCIENTIFIQUES',
        'Isolation Forest : précision 0.82, rappel 0.76, F1 0.79.',
        'Autoencodeur dense : précision 0.87, rappel 0.83, F1 0.85.',
        'Autoencodeur temporel : précision 0.91, rappel 0.88, F1 0.89.',
        '2. INTERPRETATION',
        'Ces valeurs fictives illustrent les tableaux de la plateforme. Elles ne constituent pas un résultat de recherche.',
        '3. PROCHAINES ETAPES',
        'Calculer les intervalles de confiance et étudier la robustesse aux capteurs manquants.',
      ],
    },
    {
      title: 'Article de démonstration — détection temporelle des anomalies',
      type: 'ARTICLE',
      objective: 5,
      target: 'DRAFT',
      offset: 45,
      summary:
        'Brouillon fictif avec plan détaillé : introduction, travaux connexes, méthode, protocole, résultats, limites et reproductibilité.',
      sections: [
        'BROUILLON FICTIF - NON SOUMIS A UNE REVUE',
        '1. CONTRIBUTION ENVISAGEE',
        'Combiner reconstruction temporelle et seuil adaptatif sur séries multivariées.',
        '2. STRUCTURE',
        'Introduction ; état de l’art ; méthode ; protocole ; résultats ; discussion ; limites.',
        '3. TRAVAUX RESTANTS',
        'Compléter les tests statistiques, documenter le code et harmoniser les références.',
      ],
    },
    {
      title: 'Plan détaillé du manuscrit de thèse',
      type: 'THESIS_CHAPTER',
      objective: 6,
      target: 'CHANGES_REQUESTED',
      offset: 30,
      summary:
        'Plan des six chapitres et répartition des contributions ; retour de l’encadrante sur la discussion et les limites.',
      sections: [
        'PLAN DE MANUSCRIT - DEMONSTRATION',
        'Chapitre 1 : Contexte, problématique et contributions.',
        'Chapitre 2 : Détection d’anomalies et réseaux électriques intelligents.',
        'Chapitre 3 : Données et protocole reproductible.',
        'Chapitre 4 : Modélisation temporelle et seuil adaptatif.',
        'Chapitre 5 : Résultats, ablations et robustesse.',
        'Chapitre 6 : Discussion, limites et perspectives.',
        'A REVOIR : distinguer les contributions des simples choix d’implémentation.',
      ],
    },
  ];
  const existing = (await api(0, `${base}/deliverables`)).deliverables;
  const deliverables = [];
  for (const [index, fixture] of deliverableFixtures.entries()) {
    await optional(`deliverable ${index + 1}`, async () => {
      let item = existing.find((row) => row.title === fixture.title);
      if (!item)
        item = await api(0, `${base}/deliverables`, 'POST', {
          title: fixture.title,
          type: fixture.type,
          description: `${fixture.summary}\n\nDonnées fictives réservées à la démonstration client.`,
          objectiveId: ordered[fixture.objective].id,
          dueDate: day(fixture.offset),
        });
      const path = `${base}/deliverables/${item.id}`;
      const { versions } = await api(0, `${path}/versions`);
      if (!versions.length) {
        const version = await api(0, `${path}/versions`, 'POST', {
          title: `${fixture.title} — v1`,
          changeSummary: fixture.summary.slice(0, 1000),
        });
        const form = new FormData();
        form.append('file', pdf(fixture.title, fixture.sections), `demo-livrable-${index + 1}.pdf`);
        await optional(`PDF ${index + 1}`, () =>
          api(0, `${path}/versions/${version.id}/file`, 'POST', form),
        );
      }
      if (item.status === 'DRAFT' && fixture.target !== 'DRAFT')
        item = await api(0, `${path}/submit`, 'POST', {});
      if (item.status === 'SUBMITTED' && fixture.target === 'VALIDATED')
        item = await api(1, `${path}/approve`, 'POST', {});
      if (item.status === 'SUBMITTED' && fixture.target === 'CHANGES_REQUESTED')
        item = await api(1, `${path}/request-changes`, 'POST', {
          message:
            index === 2
              ? 'Ajouter les intervalles de confiance et préciser la procédure de sélection du seuil. Le protocole doit être reproductible sans fuite de données.'
              : 'Renforcer la discussion des limites et distinguer clairement les contributions scientifiques des choix techniques.',
        });
      deliverables[index] = item;
      log(`Deliverable ${index + 1}/6: ${item.status}`);
    });
  }

  const remarks = [
    [
      'Préciser les hypothèses et le périmètre',
      'La question de recherche est claire. Ajouter une hypothèse testable sur le compromis rappel / fausses alertes.',
      0,
      'MEDIUM',
      'CLOSED',
    ],
    [
      'Compléter la grille comparative',
      'Comparer les modèles avec les mêmes métriques et indiquer la supervision requise pour chaque méthode.',
      1,
      'MEDIUM',
      'CLOSED',
    ],
    [
      'Justifier le découpage chronologique',
      'Expliquer pourquoi une séparation aléatoire provoquerait une fuite de données sur les séries temporelles.',
      2,
      'HIGH',
      'RESOLVED',
    ],
    [
      'Ajouter des intervalles de confiance',
      'Rapporter la dispersion sur trois graines et joindre une analyse de sensibilité du seuil de détection.',
      2,
      'HIGH',
      'OPEN',
    ],
    [
      'Analyser les faux positifs',
      'Présenter au moins trois familles de fausses alertes et discuter leur coût pour un opérateur.',
      3,
      'HIGH',
      'OPEN',
    ],
    [
      'Harmoniser les références du manuscrit',
      'Utiliser un style bibliographique unique et vérifier les doublons avant la prochaine relecture.',
      5,
      'LOW',
      'OPEN',
    ],
    [
      'Séparer contributions et perspectives',
      'La conclusion doit distinguer ce qui est démontré, ce qui reste une limite et les pistes de prolongement.',
      5,
      'MEDIUM',
      'RESOLVED',
    ],
  ];
  const oldRemarks = (await api(0, `${base}/remarks`)).remarks;
  for (const [title, message, target, priority, status] of remarks)
    await optional(`remark ${title}`, async () => {
      let remark = oldRemarks.find((row) => row.title === title);
      if (remark) return;
      remark = await api(1, `${base}/remarks`, 'POST', {
        title,
        message,
        priority,
        ...(deliverables[target] ? { deliverableId: deliverables[target].id } : {}),
        location: 'Dossier de démonstration — revue scientifique',
      });
      await api(0, `${base}/remarks/${remark.id}/replies`, 'POST', {
        message:
          status === 'OPEN'
            ? 'Merci pour ce retour. Je prépare la correction et les éléments justificatifs pour notre prochaine réunion.'
            : 'La correction est intégrée dans le dossier de démonstration et la justification est ajoutée au document.',
      });
      if (status !== 'OPEN') await api(0, `${base}/remarks/${remark.id}/resolve`, 'POST', {});
      if (status === 'CLOSED') await api(1, `${base}/remarks/${remark.id}/close`, 'POST', {});
    });
  log('Scientific feedback and student replies populated.');

  const oldMeetings = await api(0, `${base}/meetings`);
  const meetingRows = Object.values(oldMeetings)
    .flat()
    .filter((item) => item && typeof item === 'object');
  const meetings = [
    [
      'Cadrage scientifique et validation des hypothèses',
      -35,
      'HELD',
      'Valider le périmètre, les hypothèses et le calendrier du premier cycle expérimental.',
    ],
    [
      'Bilan expérimental et stratégie de publication',
      -10,
      'HELD',
      'Examiner les premiers résultats et choisir les analyses complémentaires.',
    ],
    [
      'Revue des résultats et des intervalles de confiance',
      5,
      'PLANNED',
      'Comparer les modèles, examiner les faux positifs et valider les intervalles de confiance.',
    ],
    [
      'Préparation du comité de suivi doctoral',
      19,
      'PLANNED',
      'Relire le rapport, préparer une présentation de dix minutes et vérifier les livrables attendus.',
    ],
    [
      'Point méthodologique sur la dérive des données',
      0,
      'REQUESTED',
      'Demande de Youssef : discuter un protocole complémentaire pour la dérive temporelle.',
    ],
  ];
  for (const [title, offset, status, agenda] of meetings)
    await optional(`meeting ${title}`, async () => {
      if (meetingRows.some((row) => row.title === title)) return;
      if (status === 'REQUESTED') {
        await api(0, `${base}/meetings/requests`, 'POST', { title, agenda });
        return;
      }
      const meeting = await api(1, `${base}/meetings`, 'POST', {
        title,
        agenda,
        scheduledOn: day(offset),
        mode: 'IN_PERSON',
        location: 'LRIT — salle de réunion, Rabat (démonstration)',
      });
      if (status === 'HELD')
        await api(1, `${base}/meetings/${meeting.id}/hold`, 'POST', {
          minutes:
            'Bilan : protocole et comparaison des méthodes examinés. Décisions : conserver la partition chronologique, documenter les graines et ajouter les intervalles de confiance. Youssef prépare les corrections ; Nora relit le rapport lors du prochain point. Compte rendu fictif de démonstration.',
        });
    });
  log('Meeting history, upcoming appointments and a pending request populated.');

  const portfolio = await api(0, '/portfolio');
  for (const [title, venue, kind] of [
    [
      'Démonstration — Temporal autoencoders for smart-grid anomaly detection',
      'Article fictif de démonstration — aucune publication réelle',
      'ARTICLE',
    ],
    [
      'Démonstration — Reproductibilité des expériences sur séries temporelles',
      'Séminaire doctoral fictif du LRIT',
      'CONFERENCE',
    ],
  ])
    await optional(`publication ${title}`, async () => {
      if (!portfolio.publications.some((row) => row.title === title))
        await api(0, '/portfolio/publications', 'POST', {
          title,
          venue,
          year: reference.getUTCFullYear(),
          kind,
        });
    });
  for (const [title, summary] of [
    [
      'SmartGrid Anomaly Lab',
      'Prototype fictif : ingestion de séries multivariées, fenêtres temporelles et visualisation des anomalies.',
    ],
    [
      'Benchmark reproductible des détecteurs',
      'Comparaison de démonstration avec partition chronologique, métriques communes et graines documentées.',
    ],
    [
      'Tableau de bord des faux positifs',
      'Exploration des alertes par capteur et analyse de leur coût opérationnel ; projet de démonstration.',
    ],
  ])
    if (!portfolio.projects.some((row) => row.title === title))
      await api(0, '/portfolio/projects', 'POST', { title, summary });
  for (const label of [
    'Python',
    'PyTorch',
    'Analyse de séries temporelles',
    'Détection d’anomalies',
    'Méthodologie expérimentale',
    'Rédaction scientifique',
  ])
    if (!portfolio.skills.some((row) => row.label === label))
      await api(0, '/portfolio/skills', 'POST', { label });

  const library = await api(1, '/resources');
  for (const [title, kind, summary] of [
    [
      'Guide de démonstration — revue bibliographique structurée',
      'DOCUMENT',
      'Définir les mots-clés, sélectionner les bases, dédoublonner les références et tenir une matrice comparative.',
    ],
    [
      'Fiche méthode — éviter les fuites de données',
      'DOCUMENT',
      'Séparer les périodes avant tout prétraitement et apprendre les paramètres uniquement sur l’entraînement.',
    ],
    [
      'Atelier de démonstration — expériences reproductibles',
      'COURSE',
      'Documenter les versions, les graines, les configurations et les métriques ; conserver les sorties de chaque essai.',
    ],
    [
      'Lecture guidée — évaluer un détecteur d’anomalies',
      'ARTICLE',
      'Distinguer précision, rappel, F1 et coût des fausses alertes. Fiche pédagogique fictive.',
    ],
  ])
    if (!library.resources.some((row) => row.title === title))
      await api(1, '/resources', 'POST', {
        title,
        kind,
        summary,
        source: 'Bibliothèque de démonstration ThesisPartner',
      });

  await optional('periodic evaluations', async () => {
    const desk = await api(1, '/supervision/desk');
    for (const [offset, score, comment] of [
      [
        -30,
        3,
        'Évaluation fictive de démonstration : cadrage solide et bibliographie structurée. Renforcer la traçabilité du protocole et la justification des métriques.',
      ],
      [
        -2,
        4,
        'Évaluation fictive de démonstration : bonne autonomie et progression régulière. Priorités : intervalles de confiance, analyse des faux positifs et préparation du comité.',
      ],
    ])
      if (!JSON.stringify(desk.evaluations).includes(comment))
        await api(1, `/supervision/desk/theses/${thesis.id}/evaluations`, 'POST', {
          evaluatedOn: day(offset),
          quality: score,
          autonomy: 4,
          methodology: score,
          advancement: score,
          comment,
        });
  });

  await optional('fictional demonstration conversation', async () => {
    const mailbox = await api(0, '/messages/conversations');
    const conversation = mailbox.conversations.find(
      (row) => row.thesisId === thesis.id || row.kind === 'DIRECT',
    );
    if (!conversation) throw new Error('No direct demonstration conversation');
    const thread = await api(0, `/messages/conversations/${conversation.id}`);
    for (const [who, body] of [
      [
        1,
        'Bonjour Youssef, bienvenue dans notre dossier de démonstration. Les quatre premières étapes sont validées ; concentrons-nous maintenant sur l’analyse des résultats.',
      ],
      [
        0,
        'Bonjour Professeure, les résultats préliminaires sont déposés. J’ai conservé la partition chronologique et documenté les paramètres des expériences.',
      ],
      [
        1,
        'Merci. Pensez à ajouter les intervalles de confiance et à distinguer les différentes familles de faux positifs avant notre réunion.',
      ],
      [
        0,
        'C’est prévu. Le rapport comparatif est soumis à votre lecture et le protocole révisé sera prêt pour le prochain point.',
      ],
      [
        1,
        'Très bien. Le prochain rendez-vous permettra aussi de préparer le comité de suivi et le plan du manuscrit. Échange fictif réservé à la démonstration client.',
      ],
    ])
      if (!thread.messages.some((row) => row.body === body))
        await api(who, `/messages/conversations/${conversation.id}/messages`, 'POST', { body });
  });

  const dashboard = await api(0, '/dashboard');
  const dossier = await api(1, `/supervision/theses/${thesis.id}`);
  const finalDeliverables = (await api(0, `${base}/deliverables`)).deliverables;
  const finalRemarks = (await api(0, `${base}/remarks`)).remarks;
  log(
    JSON.stringify(
      {
        origin,
        workProgress: dashboard.workProgress,
        objectives: dashboard.objectives,
        profileCompletion: dashboard.profileCompletion,
        supervisorDossierAvailable: !!dossier,
        deliverables: finalDeliverables.map(({ title, status, versionCount }) => ({
          title,
          status,
          versionCount,
        })),
        remarks: finalRemarks.map(({ title, status }) => ({ title, status })),
        incomplete: failures,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  for (let who = 0; who < sessions.length; who++)
    if (sessions[who])
      await api(who, '/auth/logout', 'POST').catch((error) => log(`Logout: ${error.message}`));
}
