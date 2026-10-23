export type SynthesisLocale = 'en' | 'fr';

export type SynthesisContext = {
  thesisTitle: string;
  studentName: string | null;
  objectives: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    reviewMessage: string | null;
    tasks: Array<{ id: string; title: string; status: string }>;
  }>;
  documents: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    summary: string | null;
    reviewMessage: string | null;
  }>;
  remarks: Array<{
    id: string;
    title: string;
    status: string;
    message: string;
    replies: string[];
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    status: string;
    reviewMessage: string | null;
  }>;
};

function academicReportTitle(thesisTitle: string, locale: SynthesisLocale): string {
  const cleaned = thesisTitle.replace(/\s+/g, ' ').trim();
  if (locale === 'fr') {
    return `Lecture synthétique et mise en perspective de la recherche sur ${uncapitalizeFr(cleaned)}`;
  }
  return `A synthetic reading of current research on ${uncapitalizeEn(cleaned)}`;
}

function uncapitalizeFr(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function uncapitalizeEn(value: string): string {
  if (!value) return value;
  // Keep acronyms / short uppercase titles intact.
  if (/^[A-Z0-9][A-Z0-9\s\-–—]+$/.test(value)) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function cleanProse(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["«]\s*|\s*["»]$/g, '');
}

function sentence(value: string): string {
  const text = cleanProse(value);
  if (!text) return '';
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function uniqueSnippets(
  values: Array<string | null | undefined>,
  max: number,
  minLength = 3,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = cleanProse(value ?? '');
    if (text.length < minLength) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function averageProgress(ctx: SynthesisContext): number {
  if (ctx.objectives.length === 0) return 0;
  return Math.round(
    ctx.objectives.reduce((sum, item) => sum + item.progress, 0) / ctx.objectives.length,
  );
}

function maturityPhrase(avg: number, locale: SynthesisLocale): string {
  if (locale === 'fr') {
    if (avg >= 70) return 'un stade de maturité déjà avancé';
    if (avg >= 40) return 'une phase intermédiaire de consolidation';
    if (avg > 0) return 'une phase encore exploratoire';
    return 'un moment inaugural de cadrage';
  }
  if (avg >= 70) return 'an already advanced stage of maturity';
  if (avg >= 40) return 'an intermediate consolidation phase';
  if (avg > 0) return 'a still exploratory phase';
  return 'an initial framing stage';
}

export function composeRulesSynthesis(
  ctx: SynthesisContext,
  locale: SynthesisLocale,
): { reportTitle: string; overview: string; sections: [] } {
  const reportTitle = academicReportTitle(ctx.thesisTitle, locale);
  const avg = averageProgress(ctx);
  const completed = ctx.objectives.filter((item) => item.status === 'COMPLETED').length;
  const active = ctx.objectives.filter((item) => item.status === 'IN_PROGRESS').length;
  const totalSteps = ctx.objectives.reduce((sum, item) => sum + item.tasks.length, 0);
  const doneSteps = ctx.objectives.reduce(
    (sum, item) => sum + item.tasks.filter((task) => task.status === 'DONE').length,
    0,
  );
  const openStepTitles = uniqueSnippets(
    ctx.objectives.flatMap((objective) =>
      objective.tasks.filter((task) => task.status !== 'DONE').map((task) => task.title),
    ),
    4,
  );
  const completedObjectiveTitles = uniqueSnippets(
    ctx.objectives.filter((item) => item.status === 'COMPLETED').map((item) => item.title),
    3,
  );
  const activeObjectiveTitles = uniqueSnippets(
    ctx.objectives.filter((item) => item.status === 'IN_PROGRESS').map((item) => item.title),
    3,
  );
  const docSyntheses = uniqueSnippets(
    ctx.documents.map((doc) => doc.summary),
    4,
    12,
  );
  const docTitles = uniqueSnippets(
    ctx.documents.map((doc) => doc.title),
    3,
  );
  const remarkSnippets = uniqueSnippets(
    ctx.remarks.flatMap((remark) => [remark.message, ...remark.replies]),
    4,
    12,
  );
  const deliverableTitles = uniqueSnippets(
    ctx.deliverables.map((item) => item.title),
    4,
  );
  const reviewSnippets = uniqueSnippets(
    [
      ...ctx.objectives.map((item) => item.reviewMessage),
      ...ctx.documents.map((item) => item.reviewMessage),
      ...ctx.deliverables.map((item) => item.reviewMessage),
    ],
    3,
    12,
  );

  const paragraphs: string[] = [];

  if (locale === 'fr') {
    paragraphs.push(
      ctx.studentName
        ? `Le travail doctoral de ${ctx.studentName} s’inscrit dans le champ de recherche défini par « ${ctx.thesisTitle} ». Loin d’un inventaire fragmenté du dossier, la présente synthèse en propose une lecture homogène : elle reconstitue le mouvement intellectuel du projet à partir des objectifs poursuivis, des étapes engagées, des synthèses documentaires et des livrables produits, afin de faire apparaître la cohérence du sujet et les lignes de force de son développement.`
        : `Le présent travail s’inscrit dans le champ de recherche défini par « ${ctx.thesisTitle} ». Loin d’un inventaire fragmenté du dossier, la présente synthèse en propose une lecture homogène : elle reconstitue le mouvement intellectuel du projet à partir des objectifs poursuivis, des étapes engagées, des synthèses documentaires et des livrables produits, afin de faire apparaître la cohérence du sujet et les lignes de force de son développement.`,
    );

    let progression = `Dans l’état actuel du dossier, la recherche se trouve à ${maturityPhrase(avg, 'fr')}, avec une progression d’ensemble voisine de ${avg} %.`;
    if (ctx.objectives.length > 0) {
      progression += ` ${completed} axe${completed > 1 ? 's' : ''} ${completed > 1 ? 'apparaissent' : 'apparaît'} déjà consolidé${completed > 1 ? 's' : ''}`;
      if (completedObjectiveTitles.length > 0) {
        progression += `, notamment autour de ${completedObjectiveTitles.map((title) => `« ${title} »`).join(', ')}`;
      }
      progression += `, tandis que ${active} dynamique${active > 1 ? 's restent' : ' reste'} active${active > 1 ? 's' : ''}`;
      if (activeObjectiveTitles.length > 0) {
        progression += `, en particulier ${activeObjectiveTitles.map((title) => `« ${title} »`).join(', ')}`;
      }
      progression += '.';
    }
    if (totalSteps > 0) {
      progression += ` Sur le plan opératoire, ${doneSteps} étape${doneSteps > 1 ? 's' : ''} sur ${totalSteps} ont été menées à bien`;
      if (openStepTitles.length > 0) {
        progression += `, ce qui laisse encore ouvertes des questions de travail telles que ${openStepTitles.map((title) => `« ${title} »`).join(', ')}`;
      }
      progression += '.';
    }
    paragraphs.push(progression);

    if (docSyntheses.length > 0 || docTitles.length > 0) {
      let documentary =
        'La matière documentaire nourrit directement l’argument du sujet et en précise les contours scientifiques.';
      if (docTitles.length > 0) {
        documentary += ` Les lectures et supports mobilisés, parmi lesquels ${docTitles.map((title) => `« ${title} »`).join(', ')}, dessinent un ancrage bibliographique et méthodologique utile à la problématisation.`;
      }
      if (docSyntheses.length > 0) {
        documentary += ` Les synthèses rédigées convergent vers des éléments centraux : ${docSyntheses.map(sentence).join(' ')}`;
        documentary +=
          ' Ces reformulations ne se contentent pas de résumer des sources ; elles contribuent à densifier la compréhension du sujet et à orienter les choix ultérieurs du projet.';
      } else {
        documentary +=
          ' L’effort de synthèse reste toutefois perfectible : une appropriation plus écrite des lectures renforcerait encore l’unité conceptuelle du dossier.';
      }
      paragraphs.push(documentary);
    } else {
      paragraphs.push(
        `La dimension documentaire demeure encore peu développée. Pour un sujet comme « ${ctx.thesisTitle} », l’enrichissement des lectures et de leurs reformulations apparaîtrait comme un levier décisif afin d’affermir la problématisation et de situer plus nettement la contribution attendue.`,
      );
    }

    let production =
      'Les traces écrites et les échanges d’encadrement confirment que le sujet progresse par ajustements successifs plutôt que par accumulation mécanique de tâches.';
    if (deliverableTitles.length > 0) {
      production += ` Les livrables déjà engagés, tels que ${deliverableTitles.map((title) => `« ${title} »`).join(', ')}, montrent comment la recherche se traduit progressivement en formes communicables.`;
    }
    if (remarkSnippets.length > 0 || reviewSnippets.length > 0) {
      const feedback = [...remarkSnippets, ...reviewSnippets].slice(0, 4);
      production += ` Les retours disponibles insistent notamment sur les points suivants : ${feedback.map(sentence).join(' ')}`;
      production +=
        ' Ces indications dessinent une exigence de précision méthodologique, de clarification argumentative et de consolidation rédactionnelle au service du sujet lui-même.';
    } else if (deliverableTitles.length === 0) {
      production +=
        ' L’absence encore marquée de livrables formalisés laisse toutefois le sujet dans une phase où la conceptualisation doit bientôt se convertir en productions plus tangibles.';
    }
    paragraphs.push(production);

    paragraphs.push(
      `Au total, « ${ctx.thesisTitle} » apparaît comme un projet dont la cohérence se construit à l’intersection des objectifs, des étapes de travail, des synthèses documentaires et des livrables. La suite du parcours gagnerait à préserver cette unité de sujet : approfondir les lectures déjà amorcées, fermer les étapes encore ouvertes lorsqu’elles conditionnent la démonstration, et faire des productions écrites le lieu où se stabilise l’argument scientifique. Ainsi comprise, la synthèse du dossier ne décrit pas une juxtaposition d’items, mais le mouvement d’une recherche qui cherche à faire tenir ensemble problème, méthode, résultats et écriture.`,
    );
  } else {
    paragraphs.push(
      ctx.studentName
        ? `${ctx.studentName}’s doctoral work belongs to the research field defined by “${ctx.thesisTitle}”. Rather than offering a fragmented inventory of the dossier, this synthesis proposes a homogeneous reading of the subject: it reconstructs the intellectual movement of the project from pursued objectives, engaged steps, documentary syntheses and produced deliverables, in order to reveal the coherence of the topic and the main lines of its development.`
        : `The present work belongs to the research field defined by “${ctx.thesisTitle}”. Rather than offering a fragmented inventory of the dossier, this synthesis proposes a homogeneous reading of the subject: it reconstructs the intellectual movement of the project from pursued objectives, engaged steps, documentary syntheses and produced deliverables, in order to reveal the coherence of the topic and the main lines of its development.`,
    );

    let progression = `In the current state of the dossier, the research stands at ${maturityPhrase(avg, 'en')}, with an overall progress close to ${avg}%.`;
    if (ctx.objectives.length > 0) {
      progression += ` ${completed} ${completed === 1 ? 'axis already appears' : 'axes already appear'} consolidated`;
      if (completedObjectiveTitles.length > 0) {
        progression += `, notably around ${completedObjectiveTitles.map((title) => `“${title}”`).join(', ')}`;
      }
      progression += `, while ${active} dynamic${active === 1 ? ' remains' : 's remain'} active`;
      if (activeObjectiveTitles.length > 0) {
        progression += `, in particular ${activeObjectiveTitles.map((title) => `“${title}”`).join(', ')}`;
      }
      progression += '.';
    }
    if (totalSteps > 0) {
      progression += ` Operationally, ${doneSteps} of ${totalSteps} steps have been completed`;
      if (openStepTitles.length > 0) {
        progression += `, leaving open work questions such as ${openStepTitles.map((title) => `“${title}”`).join(', ')}`;
      }
      progression += '.';
    }
    paragraphs.push(progression);

    if (docSyntheses.length > 0 || docTitles.length > 0) {
      let documentary =
        'The documentary material directly nourishes the argument of the subject and clarifies its scientific contours.';
      if (docTitles.length > 0) {
        documentary += ` The readings and materials mobilized, including ${docTitles.map((title) => `“${title}”`).join(', ')}, provide a bibliographical and methodological grounding useful for problematization.`;
      }
      if (docSyntheses.length > 0) {
        documentary += ` The written syntheses converge on central elements: ${docSyntheses.map(sentence).join(' ')}`;
        documentary +=
          ' These reformulations do more than summarize sources; they densify the understanding of the subject and orient later choices in the project.';
      } else {
        documentary +=
          ' The synthesis effort remains improvable, however: a more written appropriation of the readings would further strengthen the conceptual unity of the dossier.';
      }
      paragraphs.push(documentary);
    } else {
      paragraphs.push(
        `The documentary dimension remains underdeveloped. For a subject such as “${ctx.thesisTitle}”, enriching the readings and their reformulations would be a decisive lever for firming up the research problem and situating the expected contribution more clearly.`,
      );
    }

    let production =
      'Written traces and supervisory exchanges confirm that the subject advances through successive adjustments rather than through a mechanical accumulation of tasks.';
    if (deliverableTitles.length > 0) {
      production += ` The deliverables already engaged, such as ${deliverableTitles.map((title) => `“${title}”`).join(', ')}, show how the research is gradually translated into communicable forms.`;
    }
    if (remarkSnippets.length > 0 || reviewSnippets.length > 0) {
      const feedback = [...remarkSnippets, ...reviewSnippets].slice(0, 4);
      production += ` Available feedback insists in particular on the following points: ${feedback.map(sentence).join(' ')}`;
      production +=
        ' These indications outline a demand for methodological precision, argumentative clarification and writing consolidation in the service of the subject itself.';
    } else if (deliverableTitles.length === 0) {
      production +=
        ' The still limited presence of formalized deliverables nevertheless leaves the subject in a phase where conceptualization must soon be converted into more tangible productions.';
    }
    paragraphs.push(production);

    paragraphs.push(
      `Overall, “${ctx.thesisTitle}” appears as a project whose coherence is built at the intersection of objectives, work steps, documentary syntheses and deliverables. The next stage of the pathway would gain from preserving this unity of subject: deepening the readings already begun, closing the steps that still condition the demonstration, and turning written productions into the place where the scientific argument stabilizes. Understood in this way, the dossier synthesis does not describe a juxtaposition of items, but the movement of a research project that seeks to hold together problem, method, results and writing.`,
    );
  }

  return {
    reportTitle,
    overview: paragraphs.join('\n\n').slice(0, 16_000),
    sections: [],
  };
}

export function contextPrompt(ctx: SynthesisContext, locale: SynthesisLocale): string {
  return JSON.stringify({ locale, ...ctx }, null, 2).slice(0, 24_000);
}
