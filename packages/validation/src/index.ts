import { MEMBERSHIP_ROLES } from '@thesispartner/types';
import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const membershipRoleSchema = z.enum(MEMBERSHIP_ROLES);

export const boundedTextSchema = (max: number) => z.string().trim().min(1).max(max);

export const apiFieldErrorSchema = z
  .object({
    field: z.string().max(120),
    message: z.string().max(200),
  })
  .strict();

export const apiErrorBodySchema = z
  .object({
    statusCode: z.number().int().min(400).max(599),
    code: z.string().min(1).max(64),
    message: z.string().min(1).max(300),
    errors: z.array(apiFieldErrorSchema).max(20),
    requestId: z.string().min(1).max(64),
  })
  .strict();

export const healthResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    checks: z
      .object({
        api: z.literal('ok'),
        database: z.enum(['ok', 'error']),
        redis: z.enum(['ok', 'error']),
      })
      .strict(),
  })
  .strict();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .email('Adresse e-mail invalide');

export const passwordSchema = z
  .string()
  .min(12, '12 caractères minimum')
  .max(128, '128 caractères maximum');

export const personNameSchema = z.string().trim().min(1, 'Champ requis').max(80);

export const registerBodySchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    givenName: personNameSchema,
    familyName: personNameSchema,
    institution: z.string().trim().max(200).optional(),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const emailVerificationBodySchema = z
  .object({
    token: z.string().trim().min(20).max(200),
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const passwordResetSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: passwordSchema,
  })
  .strict();

export const ackSchema = z
  .object({
    status: z.literal('ok'),
  })
  .strict();

export const currentUserSchema = z
  .object({
    id: uuidSchema,
    email: z.string().email(),
    emailVerified: z.boolean(),
    givenName: boundedTextSchema(80),
    familyName: boundedTextSchema(80),
    displayName: boundedTextSchema(160),
  })
  .strict();

export const currentUserResponseSchema = z
  .object({
    user: currentUserSchema,
  })
  .strict();

export const thesisStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ABANDONED']);

export const thesisSummarySchema = z
  .object({
    id: uuidSchema,
    title: boundedTextSchema(300),
    status: thesisStatusSchema,
    role: membershipRoleSchema,
  })
  .strict();

export const thesisListSchema = z
  .object({
    theses: z.array(thesisSummarySchema).max(50),
  })
  .strict();

const nullableText = (max: number) => z.string().max(max).nullable();

export const thesisMemberSchema = z
  .object({
    id: uuidSchema,
    userId: uuidSchema,
    displayName: boundedTextSchema(160),
    email: z.string().email(),
    role: membershipRoleSchema,
    academicTitle: nullableText(80),
    institution: nullableText(200),
    laboratory: nullableText(200),
    doctoralSchool: nullableText(200),
    specialty: nullableText(160),
    avatarUrl: nullableText(500),
  })
  .strict();

export const thesisDetailSchema = thesisSummarySchema
  .extend({
    discipline: z.string().max(160).nullable(),
    institution: z.string().max(200).nullable(),
    startedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    expectedDefenseOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    members: z.array(thesisMemberSchema).max(50),
  })
  .strict();

export const createThesisSchema = z
  .object({
    title: z.string().trim().min(3, '3 caractères minimum').max(300),
  })
  .strict();

export const inviteMemberSchema = z
  .object({
    email: emailSchema,
    role: membershipRoleSchema,
  })
  .strict();

export const inviteResponseSchema = z
  .object({
    id: uuidSchema,
    role: membershipRoleSchema,
  })
  .strict();

const clearable = (max: number) => z.union([z.string().trim().min(1).max(max), z.literal('')]);

export const orcidSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'ORCID invalide');

export const httpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .url('URL invalide')
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), 'URL invalide');

export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide');

export const updateProfileSchema = z
  .object({
    givenName: personNameSchema.optional(),
    familyName: personNameSchema.optional(),
    academicTitle: clearable(80).optional(),
    institution: clearable(200).optional(),
    laboratory: clearable(200).optional(),
    doctoralSchool: clearable(200).optional(),
    specialty: clearable(160).optional(),
    city: clearable(80).optional(),
    country: clearable(80).optional(),
    orcid: z.union([orcidSchema, z.literal('')]).optional(),
    avatarUrl: z.union([httpUrlSchema, z.literal('')]).optional(),
    cvUrl: z.union([httpUrlSchema, z.literal('')]).optional(),
    googleScholarUrl: z.union([httpUrlSchema, z.literal('')]).optional(),
    linkedinUrl: z.union([httpUrlSchema, z.literal('')]).optional(),
  })
  .strict();

export const academicProfileSchema = z
  .object({
    givenName: boundedTextSchema(80),
    familyName: boundedTextSchema(80),
    displayName: boundedTextSchema(160),
    academicTitle: nullableText(80),
    institution: nullableText(200),
    laboratory: nullableText(200),
    doctoralSchool: nullableText(200),
    specialty: nullableText(160),
    city: nullableText(80),
    country: nullableText(80),
    orcid: nullableText(19),
    avatarUrl: nullableText(500),
    cvUrl: nullableText(500),
    googleScholarUrl: nullableText(500),
    linkedinUrl: nullableText(500),
  })
  .strict();

export const profileCompletionSchema = z
  .object({
    percentage: z.number().int().min(0).max(100),
    missingFields: z.array(z.string().max(40)).max(20),
  })
  .strict();

export const progressStatusSchema = z.enum(['NOT_STARTED', 'ON_TRACK', 'ATTENTION', 'AT_RISK']);

export const updateThesisSchema = z
  .object({
    title: z.string().trim().min(3, '3 caractères minimum').max(300).optional(),
    discipline: clearable(160).optional(),
    institution: clearable(200).optional(),
    startedOn: z.union([daySchema, z.literal('')]).optional(),
    expectedDefenseOn: z.union([daySchema, z.literal('')]).optional(),
  })
  .strict();

export const dashboardThesisSchema = z
  .object({
    id: uuidSchema,
    title: boundedTextSchema(300),
    status: thesisStatusSchema,
    discipline: nullableText(160),
    institution: nullableText(200),
    startedOn: daySchema.nullable(),
    expectedDefenseOn: daySchema.nullable(),
    supervisors: z.array(z.object({ displayName: boundedTextSchema(160) }).strict()).max(20),
  })
  .strict();

export const dashboardSchema = z
  .object({
    profile: academicProfileSchema,
    thesis: dashboardThesisSchema.nullable(),
    progress: z
      .object({
        percentage: z.number().int().min(0).max(100),
        status: progressStatusSchema,
      })
      .strict(),
    profileCompletion: profileCompletionSchema,
    kpis: z
      .array(
        z
          .object({
            id: z.enum(['progress', 'profile', 'members', 'tenure']),
            value: z.string().max(20),
          })
          .strict(),
      )
      .max(8),
    objectives: z
      .object({
        total: z.number().int().min(0),
        planned: z.number().int().min(0),
        inProgress: z.number().int().min(0),
        completed: z.number().int().min(0),
        overdue: z.number().int().min(0),
      })
      .strict(),
    deliverables: z
      .object({
        total: z.number().int().min(0),
        draft: z.number().int().min(0),
        submitted: z.number().int().min(0),
        changesRequested: z.number().int().min(0),
        validated: z.number().int().min(0),
        overdue: z.number().int().min(0),
      })
      .strict(),
    upcomingDeadlines: z
      .array(
        z
          .object({
            id: z.string().max(80),
            kind: z.enum(['EXPECTED_DEFENSE', 'OBJECTIVE', 'TASK', 'DELIVERABLE']),
            title: boundedTextSchema(300),
            occursOn: daySchema,
          })
          .strict(),
      )
      .max(20),
    workProgress: z
      .object({
        percentage: z.number().int().min(0).max(100),
      })
      .strict(),
    recentActivity: z
      .array(
        z
          .object({
            type: z.enum([
              'THESIS_CREATED',
              'MEMBER_ADDED',
              'PROFILE_UPDATED',
              'THESIS_UPDATED',
              'OBJECTIVE_CREATED',
              'OBJECTIVE_UPDATED',
              'OBJECTIVE_COMPLETED',
              'TASK_CREATED',
              'TASK_STARTED',
              'TASK_COMPLETED',
              'TASK_CANCELLED',
              'OBJECTIVE_COMPLETION_REQUESTED',
              'OBJECTIVE_COMPLETION_APPROVED',
              'OBJECTIVE_CHANGES_REQUESTED',
              'DELIVERABLE_CREATED',
              'DELIVERABLE_UPDATED',
              'DELIVERABLE_CANCELLED',
              'DELIVERABLE_OBJECTIVE_LINKED',
              'DELIVERABLE_VERSION_CREATED',
              'DELIVERABLE_FILE_UPLOADED',
              'DELIVERABLE_SUBMITTED',
              'DELIVERABLE_CHANGES_REQUESTED',
              'DELIVERABLE_VALIDATED',
              'REMARK_CREATED',
              'REMARK_REPLIED',
              'REMARK_RESOLVED',
              'REMARK_REOPENED',
              'REMARK_CLOSED',
            ]),
            occurredAt: z.string().datetime(),
            message: z.string().min(1).max(400).optional(),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export const objectiveStatusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const objectivePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']);
export const progressModeSchema = z.enum(['MANUAL', 'TASK_BASED']);
export const objectiveReviewStatusSchema = z.enum([
  'NOT_REQUESTED',
  'PENDING',
  'CHANGES_REQUESTED',
  'APPROVED',
]);
export const contributionOriginSchema = z.enum([
  'STANDARD_TEMPLATE',
  'DOCTORAL_STUDENT',
  'SUPERVISOR',
]);

const optionalDay = z.union([daySchema, z.null()]).optional();

function datesInOrder(
  value: { startDate?: string | null; dueDate?: string | null },
  ctx: z.RefinementCtx,
) {
  if (value.startDate && value.dueDate && value.dueDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dueDate'],
      message: 'L’échéance doit être postérieure ou égale au début',
    });
  }
}

export const createObjectiveSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    description: z.string().trim().max(4000).optional(),
    status: objectiveStatusSchema.optional(),
    priority: objectivePrioritySchema.optional(),
    startDate: optionalDay,
    dueDate: optionalDay,
    responsibleUserId: z.union([uuidSchema, z.null()]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .superRefine(datesInOrder);

export const updateObjectiveSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200).optional(),
    description: z.union([z.string().trim().max(4000), z.literal('')]).optional(),
    status: objectiveStatusSchema.optional(),
    priority: objectivePrioritySchema.optional(),
    startDate: optionalDay,
    dueDate: optionalDay,
    responsibleUserId: z.union([uuidSchema, z.null()]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .superRefine(datesInOrder);

export const objectiveListQuerySchema = z
  .object({
    status: objectiveStatusSchema.optional(),
    priority: objectivePrioritySchema.optional(),
    search: z.string().trim().max(200).optional(),
    overdue: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const objectiveResponsibleSchema = z
  .object({
    id: uuidSchema,
    givenName: boundedTextSchema(80),
    familyName: boundedTextSchema(80),
    displayName: boundedTextSchema(160),
  })
  .strict();

export const taskSummarySchema = z
  .object({
    total: z.number().int().min(0),
    todo: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    done: z.number().int().min(0),
    cancelled: z.number().int().min(0),
  })
  .strict();

export const completionReviewSchema = z
  .object({
    status: objectiveReviewStatusSchema,
    requestedAt: z.string().datetime().nullable(),
    validatedAt: z.string().datetime().nullable(),
    message: z.string().max(500).nullable(),
    validatedByName: z.string().max(160).nullable(),
  })
  .strict();

export const objectiveSchema = z
  .object({
    id: uuidSchema,
    thesisId: uuidSchema,
    title: boundedTextSchema(200),
    description: z.string().max(4000).nullable(),
    status: objectiveStatusSchema,
    priority: objectivePrioritySchema,
    startDate: daySchema.nullable(),
    dueDate: daySchema.nullable(),
    completedAt: z.string().datetime().nullable(),
    progress: z.number().int().min(0).max(100),
    progressMode: progressModeSchema,
    taskSummary: taskSummarySchema,
    completionReview: completionReviewSchema,
    isOverdue: z.boolean(),
    responsible: objectiveResponsibleSchema.nullable(),
    origin: contributionOriginSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    description: z.string().trim().max(4000).optional(),
    dueDate: optionalDay,
    status: taskStatusSchema.optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200).optional(),
    description: z.union([z.string().trim().max(4000), z.literal('')]).optional(),
    dueDate: optionalDay,
    status: taskStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ['body'],
    message: 'Aucune modification',
  });

export const reorderTasksSchema = z
  .object({
    tasks: z
      .array(
        z
          .object({
            taskId: uuidSchema,
            position: z.number().int().min(1).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export const taskSchema = z
  .object({
    id: uuidSchema,
    objectiveId: uuidSchema,
    title: boundedTextSchema(200),
    description: z.string().max(4000).nullable(),
    status: taskStatusSchema,
    dueDate: daySchema.nullable(),
    position: z.number().int().min(1),
    origin: contributionOriginSchema,
    completedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const taskListSchema = z
  .object({
    tasks: z.array(taskSchema).max(200),
  })
  .strict();

export const standardPathStateSchema = z.object({ applied: z.boolean() }).strict();

export const standardPathResultSchema = z
  .object({
    applied: z.boolean(),
    created: z.number().int().min(0),
  })
  .strict();

export const emptyBodySchema = z.object({}).strict();

export const requestChangesSchema = z
  .object({
    message: z.string().trim().max(500).optional(),
  })
  .strict();

export const objectiveListSchema = z
  .object({
    objectives: z.array(objectiveSchema).max(500),
  })
  .strict();

const supervisedStudentSchema = z
  .object({
    id: uuidSchema,
    givenName: boundedTextSchema(80),
    familyName: boundedTextSchema(80),
    avatarUrl: z.string().max(500).nullable(),
    institution: z.string().max(200).nullable(),
    specialty: z.string().max(160).nullable(),
  })
  .strict();

export const supervisedThesisSchema = z
  .object({
    thesisId: uuidSchema,
    title: boundedTextSchema(300),
    status: thesisStatusSchema,
    discipline: z.string().max(160).nullable(),
    institution: z.string().max(200).nullable(),
    startedOn: daySchema.nullable(),
    expectedDefenseOn: daySchema.nullable(),
    durationYears: z.number().int().min(0).max(20).nullable(),
    progressPercentage: z.number().int().min(0).max(100),
    deliverableCount: z.number().int().min(0),
    pendingValidationCount: z.number().int().min(0),
    pendingDeliverables: z
      .array(z.object({ id: uuidSchema, title: boundedTextSchema(200) }).strict())
      .max(20),
    supervisors: z.array(z.object({ displayName: boundedTextSchema(160) }).strict()).max(20),
    meetings: z
      .array(
        z
          .object({
            id: uuidSchema,
            title: boundedTextSchema(200),
            scheduledOn: daySchema,
          })
          .strict(),
      )
      .max(8),
    doctoralStudent: supervisedStudentSchema.nullable(),
    doctoralStudents: z.array(supervisedStudentSchema).max(20),
    objectiveSummary: z
      .object({
        total: z.number().int().min(0),
        inProgress: z.number().int().min(0),
        completed: z.number().int().min(0),
        overdue: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();

export const supervisedThesisListSchema = z
  .object({
    theses: z.array(supervisedThesisSchema).max(50),
  })
  .strict();

export const supervisedSpaceSchema = z
  .object({
    profile: academicProfileSchema,
    thesis: dashboardThesisSchema,
    progress: z
      .object({
        percentage: z.number().int().min(0).max(100),
        status: progressStatusSchema,
      })
      .strict(),
    objectives: z
      .object({
        total: z.number().int().min(0),
        planned: z.number().int().min(0),
        inProgress: z.number().int().min(0),
        completed: z.number().int().min(0),
        overdue: z.number().int().min(0),
      })
      .strict(),
    deliverables: z
      .object({
        total: z.number().int().min(0),
        draft: z.number().int().min(0),
        submitted: z.number().int().min(0),
        changesRequested: z.number().int().min(0),
        validated: z.number().int().min(0),
        overdue: z.number().int().min(0),
      })
      .strict(),
    workProgress: z.object({ percentage: z.number().int().min(0).max(100) }).strict(),
    upcomingDeadlines: dashboardSchema.shape.upcomingDeadlines,
    recentActivity: dashboardSchema.shape.recentActivity,
  })
  .strict();

export const deliverableTypeSchema = z.enum([
  'ARTICLE',
  'THESIS_CHAPTER',
  'REPORT',
  'CODE',
  'DATASET',
  'PRESENTATION',
  'POSTER',
  'COMMUNICATION',
  'OTHER',
]);

export const deliverableStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'VALIDATED',
  'CANCELLED',
]);

export const createDeliverableSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    description: z.string().trim().max(4000).optional(),
    type: deliverableTypeSchema,
    objectiveId: z.union([uuidSchema, z.null()]).optional(),
    taskId: z.union([uuidSchema, z.null()]).optional(),
    dueDate: optionalDay,
  })
  .strict();

export const updateDeliverableSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200).optional(),
    description: z.union([z.string().trim().max(4000), z.literal('')]).optional(),
    type: deliverableTypeSchema.optional(),
    objectiveId: z.union([uuidSchema, z.null()]).optional(),
    dueDate: optionalDay,
    status: z.literal('CANCELLED').optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ['body'],
    message: 'Aucune modification',
  });

export const createDeliverableVersionSchema = z
  .object({
    changeSummary: z.string().trim().max(1000).optional(),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export const deliverableListQuerySchema = z
  .object({
    status: deliverableStatusSchema.optional(),
    type: deliverableTypeSchema.optional(),
    objectiveId: uuidSchema.optional(),
    search: z.string().trim().max(200).optional(),
    sort: z.enum(['due', 'updated']).optional(),
  })
  .strict();

const deliverableAuthorSchema = z
  .object({
    id: uuidSchema,
    givenName: boundedTextSchema(80),
    familyName: boundedTextSchema(80),
  })
  .strict();

const deliverableObjectiveSchema = z
  .object({
    id: uuidSchema,
    title: boundedTextSchema(200),
  })
  .strict();

export const deliverableListItemSchema = z
  .object({
    id: uuidSchema,
    thesisId: uuidSchema,
    title: boundedTextSchema(200),
    type: deliverableTypeSchema,
    status: deliverableStatusSchema,
    dueDate: daySchema.nullable(),
    isOverdue: z.boolean(),
    objective: deliverableObjectiveSchema.nullable(),
    taskId: uuidSchema.nullable(),
    createdBy: deliverableAuthorSchema,
    versionCount: z.number().int().min(0),
    latestVersionNumber: z.number().int().min(1).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const versionsSummarySchema = z
  .object({
    count: z.number().int().min(0),
    latestVersionNumber: z.number().int().min(1).nullable(),
    latestVersionCreatedAt: z.string().datetime().nullable(),
  })
  .strict();

export const deliverableSchema = deliverableListItemSchema
  .extend({
    description: z.string().max(4000).nullable(),
    versionsSummary: versionsSummarySchema,
    reviewMessage: z.string().max(500).nullable(),
    submittedAt: z.string().datetime().nullable(),
    reviewedAt: z.string().datetime().nullable(),
    reviewedBy: deliverableAuthorSchema.nullable(),
  })
  .strict();

export const storedFileSchema = z
  .object({
    id: uuidSchema,
    originalName: z.string().min(1).max(180),
    mimeType: z.string().min(1).max(160),
    sizeBytes: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    uploadedBy: deliverableAuthorSchema,
  })
  .strict();

export const fileDownloadSchema = z
  .object({
    url: z.string().url(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export const deliverableVersionSchema = z
  .object({
    id: uuidSchema,
    versionNumber: z.number().int().min(1),
    title: z.string().max(200).nullable(),
    changeSummary: z.string().max(1000).nullable(),
    createdBy: deliverableAuthorSchema,
    createdAt: z.string().datetime(),
    file: storedFileSchema.nullable(),
  })
  .strict();

export const deliverableVersionListSchema = z
  .object({
    versions: z.array(deliverableVersionSchema).max(100),
  })
  .strict();

export const deliverableListSchema = z
  .object({
    deliverables: z.array(deliverableListItemSchema).max(200),
  })
  .strict();

export const remarkStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export const remarkPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createRemarkSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    message: z.string().trim().min(1, 'Champ requis').max(4000),
    priority: remarkPrioritySchema.optional(),
    objectiveId: z.union([uuidSchema, z.null()]).optional(),
    taskId: z.union([uuidSchema, z.null()]).optional(),
    deliverableId: z.union([uuidSchema, z.null()]).optional(),
    deliverableVersionId: z.union([uuidSchema, z.null()]).optional(),
    location: z.string().trim().max(300).optional(),
  })
  .strict();

export const createRemarkReplySchema = z
  .object({
    message: z.string().trim().min(1, 'Champ requis').max(4000),
  })
  .strict();

export const resolveRemarkSchema = z
  .object({
    correctionVersionId: z.union([uuidSchema, z.null()]).optional(),
  })
  .strict();

export const remarkListQuerySchema = z
  .object({
    status: remarkStatusSchema.optional(),
    priority: remarkPrioritySchema.optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict();

const remarkAuthorSchema = z
  .object({
    id: uuidSchema,
    givenName: boundedTextSchema(80),
    familyName: boundedTextSchema(80),
  })
  .strict();

const remarkTargetSchema = z
  .object({
    kind: z.enum(['OBJECTIVE', 'TASK', 'DELIVERABLE', 'DELIVERABLE_VERSION', 'THESIS']),
    id: uuidSchema.nullable(),
    label: boundedTextSchema(300),
  })
  .strict();

export const remarkReplySchema = z
  .object({
    id: uuidSchema,
    message: z.string().min(1).max(4000),
    author: remarkAuthorSchema,
    createdAt: z.string().datetime(),
  })
  .strict();

const remarkCorrectionSchema = z
  .object({
    id: uuidSchema,
    versionNumber: z.number().int().min(1),
    deliverableId: uuidSchema,
    deliverableTitle: boundedTextSchema(200),
  })
  .strict();

export const remarkListItemSchema = z
  .object({
    id: uuidSchema,
    thesisId: uuidSchema,
    title: boundedTextSchema(200),
    status: remarkStatusSchema,
    priority: remarkPrioritySchema,
    target: remarkTargetSchema,
    location: z.string().max(300).nullable(),
    author: remarkAuthorSchema,
    replyCount: z.number().int().min(0),
    lastActivityAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const remarkSchema = remarkListItemSchema
  .extend({
    message: z.string().min(1).max(4000),
    objectiveId: uuidSchema.nullable(),
    taskId: uuidSchema.nullable(),
    deliverableId: uuidSchema.nullable(),
    deliverableVersionId: uuidSchema.nullable(),
    correctionVersion: remarkCorrectionSchema.nullable(),
    resolvedAt: z.string().datetime().nullable(),
    closedAt: z.string().datetime().nullable(),
    replies: z.array(remarkReplySchema).max(500),
  })
  .strict();

export const remarkListSchema = z
  .object({
    remarks: z.array(remarkListItemSchema).max(500),
  })
  .strict();

export const meetingModeSchema = z.enum(['ONLINE', 'IN_PERSON']);
export const meetingStatusSchema = z.enum(['REQUESTED', 'PLANNED', 'HELD', 'CANCELLED']);

function refineMeetingPlace(
  data: { mode: 'ONLINE' | 'IN_PERSON'; location?: string; meetingUrl?: string },
  ctx: z.RefinementCtx,
) {
  if (data.mode === 'ONLINE') {
    const url = data.meetingUrl?.trim() ?? '';
    if (url && !z.string().url().safeParse(url).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meetingUrl'], message: 'Lien invalide' });
    }
    if (data.location?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'Pas de lieu pour une réunion en ligne',
      });
    }
    return;
  }
  if (!data.location?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location'], message: 'Champ requis' });
  }
  if (data.meetingUrl?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['meetingUrl'],
      message: 'Pas de lien pour une réunion en présentiel',
    });
  }
}

export const createMeetingSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    scheduledOn: daySchema,
    mode: meetingModeSchema,
    location: z.string().trim().max(300).optional(),
    meetingUrl: z.string().trim().max(500).optional(),
    agenda: z.string().trim().max(4000).optional(),
  })
  .strict()
  .superRefine(refineMeetingPlace);

export const requestMeetingSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    agenda: z.string().trim().max(4000).optional(),
  })
  .strict();

export const holdMeetingSchema = z
  .object({
    minutes: z.string().trim().min(1, 'Champ requis').max(4000),
  })
  .strict();

export const cancelMeetingSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const meetingSchema = z
  .object({
    id: uuidSchema,
    thesisId: uuidSchema,
    title: boundedTextSchema(200),
    scheduledOn: daySchema.nullable(),
    mode: meetingModeSchema.nullable(),
    status: meetingStatusSchema,
    location: z.string().max(300).nullable(),
    meetingUrl: z.string().max(500).nullable(),
    agenda: z.string().max(4000).nullable(),
    minutes: z.string().max(4000).nullable(),
    cancelReason: z.string().max(500).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const meetingListSchema = z
  .object({
    upcoming: z.array(meetingSchema).max(200),
    history: z.array(meetingSchema).max(500),
  })
  .strict();

export const publicationKindSchema = z.enum(['ARTICLE', 'CONFERENCE']);
export const publicationStatusSchema = z.enum([
  'IN_PREPARATION',
  'SUBMITTED',
  'ACCEPTED',
  'PUBLISHED',
]);

export const publicationInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(300),
    venue: z.string().trim().min(1, 'Champ requis').max(200),
    year: z.number().int().min(1950).max(2100),
    kind: publicationKindSchema,
  })
  .strict();

export const portfolioProjectInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    summary: z.string().trim().max(1000).optional(),
  })
  .strict();

export const portfolioSkillInputSchema = z
  .object({
    label: z.string().trim().min(1, 'Champ requis').max(80),
  })
  .strict();

export const publicationSchema = z
  .object({
    id: uuidSchema,
    title: boundedTextSchema(300),
    venue: boundedTextSchema(200),
    year: z.number().int(),
    kind: publicationKindSchema,
    status: publicationStatusSchema.default('PUBLISHED'),
  })
  .strict();

export const portfolioProjectSchema = z
  .object({
    id: uuidSchema,
    title: boundedTextSchema(200),
    summary: z.string().max(1000).nullable(),
  })
  .strict();

export const portfolioSkillSchema = z
  .object({
    id: uuidSchema,
    label: boundedTextSchema(80),
  })
  .strict();

export const portfolioSchema = z
  .object({
    profile: z
      .object({
        displayName: boundedTextSchema(160),
        specialty: z.string().max(160).nullable(),
        academicTitle: z.string().max(80).nullable(),
        avatarUrl: z.string().max(500).nullable(),
      })
      .strict(),
    counts: z
      .object({
        publications: z.number().int().nonnegative(),
        conferences: z.number().int().nonnegative(),
        projects: z.number().int().nonnegative(),
      })
      .strict(),
    publications: z.array(publicationSchema).max(200),
    projects: z.array(portfolioProjectSchema).max(100),
    skills: z.array(portfolioSkillSchema).max(80),
  })
  .strict();

export const conversationKindSchema = z.enum(['DIRECT', 'GROUP']);

export const createMessageGroupSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(120),
    studentIds: z.array(z.string().uuid()).min(1).max(30),
  })
  .strict();

export const createMessageSchema = z
  .object({
    body: z.string().trim().min(1, 'Champ requis').max(4000),
  })
  .strict();

export const messageParticipantSchema = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string().max(160),
  })
  .strict();

export const messagePreviewSchema = z
  .object({
    id: z.string().uuid(),
    body: z.string().max(4000),
    authorId: z.string().uuid(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const conversationSummarySchema = z
  .object({
    id: z.string().uuid(),
    kind: conversationKindSchema,
    title: z.string().max(120).nullable(),
    thesisId: z.string().uuid().nullable(),
    thesisTitle: z.string().max(300).nullable(),
    participants: z.array(messageParticipantSchema).max(40),
    lastMessage: messagePreviewSchema.nullable(),
    unread: z.boolean(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const messageStudentSchema = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string().max(160),
  })
  .strict();

export const conversationListSchema = z
  .object({
    conversations: z.array(conversationSummarySchema).max(200),
    students: z.array(messageStudentSchema).max(100),
  })
  .strict();

export const conversationMessageSchema = z
  .object({
    id: z.string().uuid(),
    authorId: z.string().uuid(),
    authorName: z.string().max(160),
    body: z.string().max(4000),
    createdAt: z.string().datetime(),
  })
  .strict();

export const conversationDetailSchema = z
  .object({
    id: z.string().uuid(),
    kind: conversationKindSchema,
    title: z.string().max(120).nullable(),
    thesisId: z.string().uuid().nullable(),
    thesisTitle: z.string().max(300).nullable(),
    createdById: z.string().uuid(),
    participants: z.array(messageParticipantSchema).max(40),
    messages: z.array(conversationMessageSchema).max(500),
  })
  .strict();

export const sharedResourceKindSchema = z.enum(['COURSE', 'ARTICLE', 'DOCUMENT']);

export const sharedResourceInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Champ requis').max(200),
    kind: sharedResourceKindSchema,
    source: z.union([z.string().trim().max(200), z.literal('')]).optional(),
    summary: z.union([z.string().trim().max(2000), z.literal('')]).optional(),
    url: z.union([httpUrlSchema, z.literal('')]).optional(),
  })
  .strict();

export const sharedResourceSchema = z
  .object({
    id: uuidSchema,
    title: z.string().max(200),
    kind: sharedResourceKindSchema,
    source: z.string().max(200).nullable(),
    summary: z.string().max(2000).nullable(),
    url: z.string().max(500).nullable(),
    authorName: z.string().max(160),
    createdAt: z.string().datetime(),
  })
  .strict();

export const resourceLibrarySchema = z
  .object({
    canShare: z.boolean(),
    resources: z.array(sharedResourceSchema).max(200),
  })
  .strict();

const scoreSchema = z.number().int().min(1).max(5);

export const evaluationInputSchema = z
  .object({
    evaluatedOn: daySchema,
    quality: scoreSchema,
    autonomy: scoreSchema,
    methodology: scoreSchema,
    advancement: scoreSchema,
    comment: z.string().trim().max(2000).optional(),
  })
  .strict();

export const publicationStatusInputSchema = z
  .object({
    status: publicationStatusSchema,
  })
  .strict();

const deskStudent = boundedTextSchema(160);

export const supervisorDeskSchema = z
  .object({
    notifications: z
      .array(
        z
          .object({
            id: z.string().max(80),
            kind: z.enum(['DELIVERABLE', 'OVERDUE', 'MEETING', 'REMARK']),
            thesisId: uuidSchema,
            studentName: deskStudent,
            title: boundedTextSchema(200),
            date: daySchema.nullable(),
          })
          .strict(),
      )
      .max(80),
    schedule: z
      .array(
        z
          .object({
            id: z.string().max(80),
            kind: z.enum(['DEFENSE', 'OBJECTIVE', 'DELIVERABLE', 'MEETING']),
            thesisId: uuidSchema,
            studentName: deskStudent,
            title: boundedTextSchema(300),
            date: daySchema,
          })
          .strict(),
      )
      .max(300),
    publications: z
      .array(
        z
          .object({
            id: uuidSchema,
            thesisId: uuidSchema,
            studentName: deskStudent,
            title: boundedTextSchema(300),
            venue: boundedTextSchema(200),
            year: z.number().int(),
            kind: publicationKindSchema,
            status: publicationStatusSchema,
          })
          .strict(),
      )
      .max(200),
    decisions: z
      .array(
        z
          .object({
            id: uuidSchema,
            thesisId: uuidSchema,
            studentName: deskStudent,
            action: z.string().max(120),
            createdAt: z.string().datetime(),
          })
          .strict(),
      )
      .max(100),
    plans: z
      .array(
        z
          .object({
            thesisId: uuidSchema,
            studentName: deskStudent,
            progressPercentage: z.number().int().min(0).max(100),
            phases: z
              .array(
                z
                  .object({
                    id: uuidSchema,
                    title: boundedTextSchema(200),
                    startDate: daySchema.nullable(),
                    dueDate: daySchema.nullable(),
                    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
                    progress: z.number().int().min(0).max(100),
                  })
                  .strict(),
              )
              .max(40),
          })
          .strict(),
      )
      .max(50),
    evaluations: z
      .array(
        z
          .object({
            id: uuidSchema,
            thesisId: uuidSchema,
            studentName: deskStudent,
            evaluatedOn: daySchema,
            quality: scoreSchema,
            autonomy: scoreSchema,
            methodology: scoreSchema,
            advancement: scoreSchema,
            comment: z.string().max(2000).nullable(),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();
