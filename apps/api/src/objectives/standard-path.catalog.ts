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
