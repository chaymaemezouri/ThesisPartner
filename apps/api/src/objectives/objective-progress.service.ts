import { Injectable } from '@nestjs/common';
import { normalizeObjective, type ObjectiveDraft, type ObjectivePriority } from './objective-rules';
import {
  measureObjectiveProgress,
  resolveTaskCompletedAt,
  type ProgressMeasurement,
  type TaskStatus,
} from './task-progress';

/**
 * Single progress engine for an objective.
 *
 * ObjectiveStatus stays the work state (planned, in progress, completed, cancelled).
 * The validation workflow is ObjectiveReviewStatus, stored beside it, so a finished
 * task list never becomes COMPLETED by itself. COMPLETED means a supervisor approved it.
 *
 * When at least one task is not cancelled, progress is calculated here.
 * Otherwise the supervisor-entered manual progress from Phase 3.1 is kept.
 */
@Injectable()
export class ObjectiveProgressService {
  resolve(draft: ObjectiveDraft, now: Date): ObjectiveDraft {
    return normalizeObjective(draft, now);
  }

  measure(manualProgress: number, tasks: readonly { status: TaskStatus }[]): ProgressMeasurement {
    return measureObjectiveProgress(manualProgress, tasks);
  }

  taskCompletedAt(
    nextStatus: TaskStatus,
    now: Date,
    previous?: { status: TaskStatus; completedAt: Date | null },
  ): Date | null {
    return resolveTaskCompletedAt(nextStatus, now, previous);
  }

  defaultPriority(): ObjectivePriority {
    return 'MEDIUM';
  }
}
