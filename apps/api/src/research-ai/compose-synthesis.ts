export type SynthesisLocale = 'en' | 'fr';

export type SynthesisSectionKind = 'PROBLEM' | 'SUBJECT_SUMMARY' | 'STATE_OF_ART';

export type SynthesisSection = {
  id: string;
  kind: SynthesisSectionKind;
  title: string;
  summary: string;
  status: null;
};

export type SynthesisContext = {
  thesisTitle: string;
  studentName: string | null;
  objectives: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    description: string | null;
    templateCode: string | null;
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

function academicReportTitle(thesisTitle: string): string {
  return thesisTitle.replace(/\s+/g, ' ').trim();
}

function topicNoun(thesisTitle: string): string {
  const cleaned = academicReportTitle(thesisTitle);
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
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

function namedSection(
  id: string,
  kind: SynthesisSectionKind,
  title: string,
  paragraphs: string[],
): SynthesisSection {
  return {
    id,
    kind,
    title,
    summary: paragraphs.filter(Boolean).join('\n\n').slice(0, 4000),
    status: null,
  };
}

function composeProblem(ctx: SynthesisContext, locale: SynthesisLocale): SynthesisSection {
  const topic = topicNoun(ctx.thesisTitle);
  const paragraphs =
    locale === 'fr'
      ? [
          `La problématique scientifique de ${topic} tient à l’écart entre un phénomène observé et les outils disponibles pour le concevoir, le mesurer et le traiter. Il ne s’agit pas seulement de nommer un objet, mais de formuler un problème de connaissance : quels mécanismes sont en jeu, dans quelles conditions se manifestent-ils, et selon quels critères une explication devient-elle recevable.`,
          `La question de recherche en découle. Elle consiste à déterminer comment ${topic} peut être abordé de manière cumulative, en précisant le périmètre de l’objet, les hypothèses susceptibles d’être mises à l’épreuve et la contribution attendue au débat scientifique. Ainsi posée, la problématique oriente l’enquête plutôt qu’elle ne la résume.`,
        ]
      : [
          `The scientific problem of ${topic} lies in the gap between an observed phenomenon and the tools available to conceptualize, measure and address it. The task is not merely to name an object, but to formulate a problem of knowledge: which mechanisms are at stake, under what conditions they appear, and by which criteria an explanation becomes admissible.`,
          `The research question follows from this framing. It asks how ${topic} can be investigated cumulatively, by specifying the scope of the object, the hypotheses that can be tested, and the contribution expected in the scientific debate. Stated in this way, the problem orients the inquiry rather than merely summarizing it.`,
        ];
  return namedSection(
    'problem',
    'PROBLEM',
    locale === 'fr' ? 'Problématique' : 'Research problem',
    paragraphs,
  );
}

function composeSubject(ctx: SynthesisContext, locale: SynthesisLocale): SynthesisSection {
  const topic = topicNoun(ctx.thesisTitle);
  const paragraphs =
    locale === 'fr'
      ? [
          `Le présent article porte sur ${topic}. Il en propose une lecture d’ensemble, dans le registre d’une contribution de recherche : cadrage de l’objet, formulation du problème et mise en perspective des travaux existants.`,
          `L’argument vise à faire apparaître la cohérence interne du sujet. Plutôt qu’un suivi de parcours doctoral, il articule une question scientifique, un terrain d’analyse et une ambition de résultat, afin de situer ce que la recherche cherche à établir, à discuter et à rendre discutable.`,
        ]
      : [
          `This article addresses ${topic}. It offers an overall reading in the register of a research contribution: framing of the object, formulation of the problem, and contextualization within existing work.`,
          `The argument aims to bring out the internal coherence of the subject. Rather than a record of doctoral progress, it articulates a scientific question, a field of analysis and an intended result, in order to situate what the research seeks to establish, to discuss and to make open to debate.`,
        ];
  return namedSection(
    'subject',
    'SUBJECT_SUMMARY',
    locale === 'fr' ? 'Résumé du sujet' : 'Subject summary',
    paragraphs,
  );
}

function composeStateOfArt(ctx: SynthesisContext, locale: SynthesisLocale): SynthesisSection {
  const topic = topicNoun(ctx.thesisTitle);
  const literature = uniqueSnippets(
    ctx.documents.map((doc) => doc.summary),
    4,
    12,
  );
  const paragraphs: string[] = [];
  if (locale === 'fr') {
    paragraphs.push(
      `L’état de l’art relatif à ${topic} vise à reconstituer le paysage scientifique du sujet : concepts fondateurs, approches concurrentes et limites récurrentes. Cette revue n’est pas un inventaire de sources ; elle prépare l’argument en faisant apparaître les tensions que la recherche se propose de traiter.`,
    );
    if (literature.length > 0) {
      paragraphs.push(
        `Les travaux examinés convergent notamment vers les points suivants. ${literature.map(sentence).join(' ')} Ces éléments permettent de situer la contribution visée, non comme une juxtaposition de références, mais comme un déplacement par rapport aux angles encore insuffisamment traités.`,
      );
    } else {
      paragraphs.push(
        `Dans ce champ, la littérature distingue généralement les approches descriptives, les cadres théoriques établis et les tentatives plus récentes d’opérationnalisation empirique. La revue consiste dès lors à identifier ce que ces courants expliquent déjà, et ce qu’ils laissent ouvert pour une investigation nouvelle.`,
      );
    }
  } else {
    paragraphs.push(
      `The state of the art on ${topic} aims to reconstruct the scientific landscape of the subject: founding concepts, competing approaches and recurring limitations. This review is not an inventory of sources; it prepares the argument by making visible the tensions that the research intends to address.`,
    );
    if (literature.length > 0) {
      paragraphs.push(
        `The works examined converge in particular on the following points. ${literature.map(sentence).join(' ')} These elements make it possible to situate the intended contribution, not as a juxtaposition of references, but as a shift relative to angles that remain insufficiently treated.`,
      );
    } else {
      paragraphs.push(
        `In this field, the literature generally distinguishes descriptive approaches, established theoretical frames and more recent attempts at empirical operationalization. The review therefore consists in identifying what these currents already explain, and what they leave open for further investigation.`,
      );
    }
  }
  return namedSection(
    'state-of-art',
    'STATE_OF_ART',
    locale === 'fr' ? 'État de l’art' : 'State of the art',
    paragraphs,
  );
}

export function composeRulesSynthesis(
  ctx: SynthesisContext,
  locale: SynthesisLocale,
): { reportTitle: string; overview: string; sections: SynthesisSection[] } {
  const sections = [
    composeProblem(ctx, locale),
    composeSubject(ctx, locale),
    composeStateOfArt(ctx, locale),
  ];
  return {
    reportTitle: academicReportTitle(ctx.thesisTitle),
    overview: sections
      .map((item) => item.summary)
      .join('\n\n')
      .slice(0, 16_000),
    sections,
  };
}

export function contextPrompt(ctx: SynthesisContext, locale: SynthesisLocale): string {
  const { studentName: _studentName, ...rest } = ctx;
  return JSON.stringify({ locale, ...rest }, null, 2).slice(0, 24_000);
}
