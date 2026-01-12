// ===========================================
// Workflow State Machine for Algora v2.0
// ===========================================

import type {
  WorkflowState,
  WorkflowContext,
  StateTransitionRecord,
  AcceptanceCriteria,
} from './types.js';
import { STATE_TRANSITIONS, STATE_ACCEPTANCE } from './types.js';

/**
 * Error thrown when a state transition is invalid.
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly fromState: WorkflowState,
    public readonly toState: WorkflowState,
    public readonly reason: string
  ) {
    super(`Invalid transition from ${fromState} to ${toState}: ${reason}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Error thrown when acceptance criteria are not met.
 */
export class AcceptanceCriteriaError extends Error {
  constructor(
    public readonly state: WorkflowState,
    public readonly missingFields: string[]
  ) {
    super(
      `Acceptance criteria not met for state ${state}: missing ${missingFields.join(', ')}`
    );
    this.name = 'AcceptanceCriteriaError';
  }
}

/**
 * Event emitted during state machine operations.
 */
export interface StateMachineEvent {
  type: 'transition' | 'validation_failed' | 'transition_blocked';
  context: WorkflowContext;
  fromState?: WorkflowState;
  toState?: WorkflowState;
  reason?: string;
  timestamp: Date;
}

/**
 * Listener for state machine events.
 */
export type StateMachineEventListener = (event: StateMachineEvent) => void;

/**
 * Options for the state machine.
 */
export interface StateMachineOptions {
  /**
   * Whether to validate acceptance criteria before transitions.
   */
  validateAcceptance: boolean;

  /**
   * Whether to allow skipping states (for recovery scenarios).
   */
  allowSkip: boolean;

  /**
   * Custom acceptance criteria (overrides defaults).
   */
  customAcceptance?: Partial<Record<WorkflowState, AcceptanceCriteria>>;
}

/**
 * Default state machine options.
 */
export const DEFAULT_STATE_MACHINE_OPTIONS: StateMachineOptions = {
  validateAcceptance: true,
  allowSkip: false,
};

/**
 * Workflow State Machine implementation.
 *
 * Manages state transitions for governance workflows with validation
 * and acceptance criteria enforcement.
 */
export class WorkflowStateMachine {
  private context: WorkflowContext;
  private options: StateMachineOptions;
  private listeners: StateMachineEventListener[] = [];
  private acceptanceCriteria: Record<WorkflowState, AcceptanceCriteria>;

  constructor(context: WorkflowContext, options?: Partial<StateMachineOptions>) {
    this.context = context;
    this.options = { ...DEFAULT_STATE_MACHINE_OPTIONS, ...options };
    this.acceptanceCriteria = {
      ...STATE_ACCEPTANCE,
      ...options?.customAcceptance,
    };
  }

  /**
   * Get the current state.
   */
  getCurrentState(): WorkflowState {
    return this.context.currentState;
  }

  /**
   * Get the full workflow context.
   */
  getContext(): WorkflowContext {
    return { ...this.context };
  }

  /**
   * Get available transitions from the current state.
   */
  getAvailableTransitions(): WorkflowState[] {
    return STATE_TRANSITIONS[this.context.currentState] || [];
  }

  /**
   * Check if a transition to the target state is valid.
   */
  canTransitionTo(targetState: WorkflowState): boolean {
    const available = this.getAvailableTransitions();
    return available.includes(targetState);
  }

  /**
   * Validate acceptance criteria for the current state.
   */
  validateCurrentState(): { valid: boolean; missingFields: string[] } {
    return this.validateAcceptanceCriteria(this.context.currentState);
  }

  /**
   * Validate acceptance criteria for a specific state.
   */
  validateAcceptanceCriteria(state: WorkflowState): {
    valid: boolean;
    missingFields: string[];
  } {
    const criteria = this.acceptanceCriteria[state];
    if (!criteria) {
      return { valid: true, missingFields: [] };
    }

    const missingFields: string[] = [];

    // Check required fields
    for (const field of criteria.required) {
      const value = this.getNestedValue(this.context, field);
      if (value === undefined || value === null) {
        missingFields.push(field);
      }
    }

    // Run custom validation
    const customValid = criteria.validation(this.context);

    return {
      valid: missingFields.length === 0 && customValid,
      missingFields,
    };
  }

  /**
   * Transition to a new state.
   *
   * @param targetState - The state to transition to
   * @param reason - Reason for the transition
   * @param triggeredBy - Who/what triggered the transition
   * @throws InvalidTransitionError if transition is not allowed
   * @throws AcceptanceCriteriaError if acceptance criteria not met
   */
  transition(
    targetState: WorkflowState,
    reason: string,
    triggeredBy: string
  ): WorkflowContext {
    const fromState = this.context.currentState;

    // Check if transition is valid
    if (!this.canTransitionTo(targetState) && !this.options.allowSkip) {
      const error = new InvalidTransitionError(
        fromState,
        targetState,
        `Transition not in allowed list: ${this.getAvailableTransitions().join(', ')}`
      );
      this.emit({
        type: 'transition_blocked',
        context: this.context,
        fromState,
        toState: targetState,
        reason: error.message,
        timestamp: new Date(),
      });
      throw error;
    }

    // Validate acceptance criteria for current state before leaving
    if (this.options.validateAcceptance) {
      const validation = this.validateCurrentState();
      if (!validation.valid) {
        const error = new AcceptanceCriteriaError(fromState, validation.missingFields);
        this.emit({
          type: 'validation_failed',
          context: this.context,
          fromState,
          toState: targetState,
          reason: error.message,
          timestamp: new Date(),
        });
        throw error;
      }
    }

    // Record transition
    const record: StateTransitionRecord = {
      fromState,
      toState: targetState,
      timestamp: new Date(),
      reason,
      triggeredBy,
    };

    // Update context
    this.context = {
      ...this.context,
      currentState: targetState,
      stateHistory: [...this.context.stateHistory, record],
      updatedAt: new Date(),
    };

    // Emit transition event
    this.emit({
      type: 'transition',
      context: this.context,
      fromState,
      toState: targetState,
      reason,
      timestamp: new Date(),
    });

    return this.context;
  }

  /**
   * Force a transition without validation (for recovery scenarios).
   * Use with caution - this bypasses all safety checks.
   */
  forceTransition(
    targetState: WorkflowState,
    reason: string,
    triggeredBy: string
  ): WorkflowContext {
    const fromState = this.context.currentState;

    const record: StateTransitionRecord = {
      fromState,
      toState: targetState,
      timestamp: new Date(),
      reason: `[FORCED] ${reason}`,
      triggeredBy,
    };

    this.context = {
      ...this.context,
      currentState: targetState,
      stateHistory: [...this.context.stateHistory, record],
      updatedAt: new Date(),
    };

    this.emit({
      type: 'transition',
      context: this.context,
      fromState,
      toState: targetState,
      reason: `[FORCED] ${reason}`,
      timestamp: new Date(),
    });

    return this.context;
  }

  /**
   * Update context data without changing state.
   */
  updateContext(updates: Partial<WorkflowContext>): WorkflowContext {
    this.context = {
      ...this.context,
      ...updates,
      // Preserve immutable fields
      issueId: this.context.issueId,
      issue: this.context.issue,
      workflowType: this.context.workflowType,
      stateHistory: this.context.stateHistory,
      currentState: this.context.currentState,
      createdAt: this.context.createdAt,
      updatedAt: new Date(),
    };
    return this.context;
  }

  /**
   * Check if the workflow is in a terminal state.
   */
  isTerminal(): boolean {
    const terminalStates: WorkflowState[] = ['COMPLETED', 'REJECTED', 'ARCHIVED'];
    return terminalStates.includes(this.context.currentState);
  }

  /**
   * Check if the workflow is blocked (requires human intervention).
   */
  isBlocked(): boolean {
    return this.context.currentState === 'EXEC_LOCKED';
  }

  /**
   * Get the next recommended state based on context.
   */
  getNextRecommendedState(): WorkflowState | null {
    const available = this.getAvailableTransitions();
    if (available.length === 0) return null;

    // Logic to determine the best next state
    const currentState = this.context.currentState;

    switch (currentState) {
      case 'INTAKE':
        return 'TRIAGE';

      case 'TRIAGE':
        // Go to research if we need more info, otherwise deliberation
        return this.context.priorityScore?.total ?? 0 > 100 ? 'DELIBERATION' : 'RESEARCH';

      case 'RESEARCH':
        return 'DELIBERATION';

      case 'DELIBERATION':
        // Reject if consensus is too low
        return (this.context.consensusScore ?? 0) >= 60 ? 'DECISION_PACKET' : 'REJECTED';

      case 'DECISION_PACKET':
        // Check if review is required
        return this.context.decisionPacket ? 'REVIEW' : 'DECISION_PACKET';

      case 'REVIEW':
        if (this.context.reviewStatus === 'approved') return 'PUBLISH';
        if (this.context.reviewStatus === 'rejected') return 'REJECTED';
        return 'DECISION_PACKET'; // changes_requested

      case 'PUBLISH':
        // Check if execution is locked
        return this.context.requiredApprovals?.length ? 'EXEC_LOCKED' : 'COMPLETED';

      case 'EXEC_LOCKED':
        return 'OUTCOME_PROOF';

      case 'OUTCOME_PROOF':
        return 'COMPLETED';

      case 'COMPLETED':
      case 'REJECTED':
        return 'ARCHIVED';

      default:
        return available[0] || null;
    }
  }

  /**
   * Subscribe to state machine events.
   */
  subscribe(listener: StateMachineEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get transition history.
   */
  getHistory(): StateTransitionRecord[] {
    return [...this.context.stateHistory];
  }

  /**
   * Get time spent in current state.
   */
  getTimeInCurrentState(): number {
    const lastTransition = this.context.stateHistory[this.context.stateHistory.length - 1];
    if (!lastTransition) {
      return Date.now() - this.context.createdAt.getTime();
    }
    return Date.now() - lastTransition.timestamp.getTime();
  }

  /**
   * Serialize the state machine for persistence.
   */
  serialize(): string {
    return JSON.stringify({
      context: this.context,
      options: this.options,
    });
  }

  /**
   * Deserialize a state machine from stored data.
   */
  static deserialize(data: string): WorkflowStateMachine {
    const parsed = JSON.parse(data);

    // Restore Date objects
    const context: WorkflowContext = {
      ...parsed.context,
      createdAt: new Date(parsed.context.createdAt),
      updatedAt: new Date(parsed.context.updatedAt),
      issue: {
        ...parsed.context.issue,
        createdAt: new Date(parsed.context.issue.createdAt),
        updatedAt: new Date(parsed.context.issue.updatedAt),
      },
      stateHistory: parsed.context.stateHistory.map(
        (record: StateTransitionRecord) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        })
      ),
    };

    return new WorkflowStateMachine(context, parsed.options);
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: StateMachineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in state machine event listener:', error);
      }
    }
  }

  /**
   * Get a nested value from an object using dot notation.
   */
  private getNestedValue(obj: object, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }
}

/**
 * Create a new workflow context for an issue.
 */
export function createWorkflowContext(
  issueId: string,
  issue: WorkflowContext['issue'],
  workflowType: WorkflowContext['workflowType']
): WorkflowContext {
  const now = new Date();
  return {
    issueId,
    issue,
    workflowType,
    currentState: 'INTAKE',
    stateHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate a complete workflow path.
 */
export function validateWorkflowPath(states: WorkflowState[]): boolean {
  if (states.length === 0) return true;

  for (let i = 0; i < states.length - 1; i++) {
    const current = states[i];
    const next = states[i + 1];
    const validTransitions = STATE_TRANSITIONS[current];
    if (!validTransitions?.includes(next)) {
      return false;
    }
  }

  return true;
}

/**
 * Get all possible paths from a state to a terminal state.
 */
export function getPossiblePaths(
  fromState: WorkflowState,
  maxDepth: number = 20
): WorkflowState[][] {
  const paths: WorkflowState[][] = [];
  const terminalStates: WorkflowState[] = ['COMPLETED', 'REJECTED', 'ARCHIVED'];

  function explore(currentState: WorkflowState, path: WorkflowState[], depth: number): void {
    if (depth > maxDepth) return;

    if (terminalStates.includes(currentState)) {
      paths.push([...path]);
      return;
    }

    const transitions = STATE_TRANSITIONS[currentState] || [];
    for (const nextState of transitions) {
      // Avoid cycles
      if (!path.includes(nextState)) {
        explore(nextState, [...path, nextState], depth + 1);
      }
    }
  }

  explore(fromState, [fromState], 0);
  return paths;
}
