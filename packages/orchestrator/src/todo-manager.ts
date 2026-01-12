// ===========================================
// TODO Manager for Algora v2.0 Orchestrator
// ===========================================

import type {
  OrchestratorTask,
  OrchestratorTodo,
  WorkflowType,
  WorkflowState,
  OrchestratorConfig,
} from './types.js';
import { DEFAULT_ORCHESTRATOR_CONFIG } from './types.js';

/**
 * Event emitted by the TODO manager.
 */
export interface TodoEvent {
  type:
    | 'todo:created'
    | 'todo:updated'
    | 'todo:completed'
    | 'todo:blocked'
    | 'todo:resumed'
    | 'task:created'
    | 'task:started'
    | 'task:completed'
    | 'task:failed'
    | 'task:blocked';
  todoId: string;
  taskId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Listener for TODO events.
 */
export type TodoEventListener = (event: TodoEvent) => void;

/**
 * Storage interface for persisting TODOs.
 */
export interface TodoStorage {
  save(todo: OrchestratorTodo): Promise<void>;
  get(id: string): Promise<OrchestratorTodo | null>;
  getByIssueId(issueId: string): Promise<OrchestratorTodo | null>;
  getAll(): Promise<OrchestratorTodo[]>;
  getPending(): Promise<OrchestratorTodo[]>;
  getBlocked(): Promise<OrchestratorTodo[]>;
  delete(id: string): Promise<void>;
}

/**
 * In-memory implementation of TODO storage.
 */
export class InMemoryTodoStorage implements TodoStorage {
  private todos: Map<string, OrchestratorTodo> = new Map();
  private issueIndex: Map<string, string> = new Map();

  async save(todo: OrchestratorTodo): Promise<void> {
    this.todos.set(todo.id, todo);
    this.issueIndex.set(todo.issueId, todo.id);
  }

  async get(id: string): Promise<OrchestratorTodo | null> {
    return this.todos.get(id) || null;
  }

  async getByIssueId(issueId: string): Promise<OrchestratorTodo | null> {
    const todoId = this.issueIndex.get(issueId);
    if (!todoId) return null;
    return this.todos.get(todoId) || null;
  }

  async getAll(): Promise<OrchestratorTodo[]> {
    return Array.from(this.todos.values());
  }

  async getPending(): Promise<OrchestratorTodo[]> {
    return Array.from(this.todos.values()).filter(
      (todo) =>
        !todo.blockedBy &&
        todo.pendingTasks.some((task) => task.status === 'pending')
    );
  }

  async getBlocked(): Promise<OrchestratorTodo[]> {
    return Array.from(this.todos.values()).filter((todo) => !!todo.blockedBy);
  }

  async delete(id: string): Promise<void> {
    const todo = this.todos.get(id);
    if (todo) {
      this.issueIndex.delete(todo.issueId);
      this.todos.delete(id);
    }
  }
}

/**
 * Options for the TODO manager.
 */
export interface TodoManagerOptions {
  config: OrchestratorConfig;
  storage: TodoStorage;
}

/**
 * TODO Manager for the orchestrator.
 *
 * Manages the persistent TODO list to ensure no tasks are dropped.
 * Implements the "TODO Continuation Guardrail" from the spec.
 */
export class TodoManager {
  private config: OrchestratorConfig;
  private storage: TodoStorage;
  private listeners: TodoEventListener[] = [];

  constructor(options?: Partial<TodoManagerOptions>) {
    this.config = options?.config || DEFAULT_ORCHESTRATOR_CONFIG;
    this.storage = options?.storage || new InMemoryTodoStorage();
  }

  /**
   * Create a new TODO for an issue.
   */
  async createTodo(
    issueId: string,
    workflowType: WorkflowType,
    initialState: WorkflowState = 'INTAKE'
  ): Promise<OrchestratorTodo> {
    const now = new Date();
    const todo: OrchestratorTodo = {
      id: this.generateId(),
      issueId,
      workflowType,
      currentState: initialState,
      pendingTasks: [],
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.save(todo);
    this.emit({
      type: 'todo:created',
      todoId: todo.id,
      timestamp: now,
    });

    return todo;
  }

  /**
   * Get a TODO by ID.
   */
  async getTodo(id: string): Promise<OrchestratorTodo | null> {
    return this.storage.get(id);
  }

  /**
   * Get a TODO by issue ID.
   */
  async getTodoByIssueId(issueId: string): Promise<OrchestratorTodo | null> {
    return this.storage.getByIssueId(issueId);
  }

  /**
   * Add a task to a TODO.
   */
  async addTask(
    todoId: string,
    task: Omit<OrchestratorTask, 'id' | 'status' | 'retryCount' | 'createdAt'>
  ): Promise<OrchestratorTask> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    const now = new Date();
    const newTask: OrchestratorTask = {
      id: this.generateId(),
      ...task,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
    };

    todo.pendingTasks.push(newTask);
    todo.updatedAt = now;
    await this.storage.save(todo);

    this.emit({
      type: 'task:created',
      todoId,
      taskId: newTask.id,
      timestamp: now,
    });

    return newTask;
  }

  /**
   * Start a task.
   */
  async startTask(todoId: string, taskId: string): Promise<void> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    const task = todo.pendingTasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'in_progress';
    task.lastAttemptAt = new Date();
    todo.updatedAt = new Date();
    await this.storage.save(todo);

    this.emit({
      type: 'task:started',
      todoId,
      taskId,
      timestamp: new Date(),
    });
  }

  /**
   * Complete a task.
   */
  async completeTask(todoId: string, taskId: string): Promise<void> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    const taskIndex = todo.pendingTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = todo.pendingTasks[taskIndex];
    task.status = 'completed';
    task.completedAt = new Date();
    todo.updatedAt = new Date();
    await this.storage.save(todo);

    this.emit({
      type: 'task:completed',
      todoId,
      taskId,
      timestamp: new Date(),
    });

    // Check if all tasks are complete
    if (todo.pendingTasks.every((t) => t.status === 'completed')) {
      this.emit({
        type: 'todo:completed',
        todoId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Fail a task and schedule retry.
   */
  async failTask(
    todoId: string,
    taskId: string,
    error: string
  ): Promise<{ shouldRetry: boolean; nextAttempt?: Date }> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    const task = todo.pendingTasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.retryCount++;
    task.lastAttemptAt = new Date();

    const shouldRetry = task.retryCount < task.maxRetries;

    if (shouldRetry) {
      // Calculate next attempt with exponential backoff
      const delay = this.calculateBackoff(task.retryCount);
      task.nextAttemptAt = new Date(Date.now() + delay);
      task.status = 'pending';
    } else {
      task.status = 'failed';
      // Block the TODO if a task fails permanently
      todo.blockedBy = `Task ${taskId} failed after ${task.maxRetries} retries: ${error}`;
    }

    todo.updatedAt = new Date();
    await this.storage.save(todo);

    this.emit({
      type: 'task:failed',
      todoId,
      taskId,
      timestamp: new Date(),
      metadata: { error, retryCount: task.retryCount, shouldRetry },
    });

    if (!shouldRetry) {
      this.emit({
        type: 'todo:blocked',
        todoId,
        timestamp: new Date(),
        metadata: { reason: todo.blockedBy },
      });
    }

    return { shouldRetry, nextAttempt: task.nextAttemptAt };
  }

  /**
   * Block a task (requires external resolution).
   */
  async blockTask(todoId: string, taskId: string, reason: string): Promise<void> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    const task = todo.pendingTasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'blocked';
    task.blockedBy = reason;
    todo.blockedBy = `Task ${taskId} blocked: ${reason}`;
    todo.updatedAt = new Date();
    await this.storage.save(todo);

    this.emit({
      type: 'task:blocked',
      todoId,
      taskId,
      timestamp: new Date(),
      metadata: { reason },
    });

    this.emit({
      type: 'todo:blocked',
      todoId,
      timestamp: new Date(),
      metadata: { reason: todo.blockedBy },
    });
  }

  /**
   * Unblock a TODO.
   */
  async unblockTodo(todoId: string): Promise<void> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    // Reset blocked tasks to pending
    for (const task of todo.pendingTasks) {
      if (task.status === 'blocked') {
        task.status = 'pending';
        delete task.blockedBy;
      }
    }

    delete todo.blockedBy;
    todo.updatedAt = new Date();
    await this.storage.save(todo);

    this.emit({
      type: 'todo:resumed',
      todoId,
      timestamp: new Date(),
    });
  }

  /**
   * Update the workflow state for a TODO.
   */
  async updateState(todoId: string, newState: WorkflowState): Promise<void> {
    const todo = await this.storage.get(todoId);
    if (!todo) {
      throw new Error(`TODO not found: ${todoId}`);
    }

    todo.currentState = newState;
    todo.updatedAt = new Date();
    await this.storage.save(todo);

    this.emit({
      type: 'todo:updated',
      todoId,
      timestamp: new Date(),
      metadata: { newState },
    });
  }

  /**
   * Get all pending TODOs.
   */
  async getPendingTodos(): Promise<OrchestratorTodo[]> {
    return this.storage.getPending();
  }

  /**
   * Get all blocked TODOs.
   */
  async getBlockedTodos(): Promise<OrchestratorTodo[]> {
    return this.storage.getBlocked();
  }

  /**
   * Get tasks ready for execution (past their nextAttemptAt time).
   */
  async getReadyTasks(): Promise<Array<{ todo: OrchestratorTodo; task: OrchestratorTask }>> {
    const todos = await this.storage.getPending();
    const now = Date.now();
    const ready: Array<{ todo: OrchestratorTodo; task: OrchestratorTask }> = [];

    for (const todo of todos) {
      for (const task of todo.pendingTasks) {
        if (task.status === 'pending') {
          if (!task.nextAttemptAt || task.nextAttemptAt.getTime() <= now) {
            ready.push({ todo, task });
          }
        }
      }
    }

    // Sort by priority (higher first), then by creation time
    ready.sort((a, b) => {
      if (a.task.priority !== b.task.priority) {
        return b.task.priority - a.task.priority;
      }
      return a.task.createdAt.getTime() - b.task.createdAt.getTime();
    });

    return ready;
  }

  /**
   * Get queue depth (total pending tasks).
   */
  async getQueueDepth(): Promise<number> {
    const todos = await this.storage.getAll();
    return todos.reduce((count, todo) => {
      return count + todo.pendingTasks.filter((t) => t.status === 'pending').length;
    }, 0);
  }

  /**
   * Subscribe to TODO events.
   */
  subscribe(listener: TodoEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Recover TODOs on startup (resume all pending work).
   */
  async recover(): Promise<{
    pending: OrchestratorTodo[];
    blocked: OrchestratorTodo[];
  }> {
    const pending = await this.storage.getPending();
    const blocked = await this.storage.getBlocked();

    // Emit resumed events for all pending TODOs
    for (const todo of pending) {
      this.emit({
        type: 'todo:resumed',
        todoId: todo.id,
        timestamp: new Date(),
        metadata: { state: todo.currentState },
      });
    }

    return { pending, blocked };
  }

  /**
   * Calculate exponential backoff delay.
   */
  private calculateBackoff(retryCount: number): number {
    const delay =
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, retryCount - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Generate a unique ID.
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: TodoEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in TODO event listener:', error);
      }
    }
  }
}

/**
 * Create standard tasks for a workflow state.
 */
export function createStatesTasks(
  state: WorkflowState,
  metadata: Record<string, unknown> = {}
): Array<Omit<OrchestratorTask, 'id' | 'status' | 'retryCount' | 'createdAt'>> {
  const baseTasks: Record<
    WorkflowState,
    Array<Omit<OrchestratorTask, 'id' | 'status' | 'retryCount' | 'createdAt'>>
  > = {
    INTAKE: [
      {
        name: 'validate_issue',
        description: 'Validate issue data and prepare for triage',
        priority: 100,
        maxRetries: 3,
        metadata,
      },
    ],
    TRIAGE: [
      {
        name: 'calculate_priority',
        description: 'Calculate priority score for the issue',
        priority: 90,
        maxRetries: 3,
        metadata,
      },
      {
        name: 'select_workflow',
        description: 'Select appropriate workflow type',
        priority: 90,
        maxRetries: 3,
        metadata,
      },
      {
        name: 'select_agents',
        description: 'Select agents for deliberation',
        priority: 80,
        maxRetries: 3,
        metadata,
      },
    ],
    RESEARCH: [
      {
        name: 'gather_research',
        description: 'Gather research from multiple sources',
        priority: 70,
        maxRetries: 5,
        metadata,
      },
      {
        name: 'compile_brief',
        description: 'Compile research brief',
        priority: 60,
        maxRetries: 3,
        metadata,
      },
    ],
    DELIBERATION: [
      {
        name: 'collect_opinions',
        description: 'Collect agent opinions',
        priority: 70,
        maxRetries: 5,
        metadata,
      },
      {
        name: 'calculate_consensus',
        description: 'Calculate consensus score',
        priority: 60,
        maxRetries: 3,
        metadata,
      },
    ],
    DECISION_PACKET: [
      {
        name: 'draft_decision_packet',
        description: 'Draft the decision packet',
        priority: 80,
        maxRetries: 5,
        metadata,
      },
      {
        name: 'validate_packet',
        description: 'Validate decision packet completeness',
        priority: 70,
        maxRetries: 3,
        metadata,
      },
    ],
    REVIEW: [
      {
        name: 'submit_for_review',
        description: 'Submit for human review',
        priority: 90,
        maxRetries: 3,
        metadata,
      },
      {
        name: 'await_review',
        description: 'Await review decision',
        priority: 50,
        maxRetries: 10,
        metadata,
      },
    ],
    PUBLISH: [
      {
        name: 'publish_document',
        description: 'Publish to document registry',
        priority: 80,
        maxRetries: 5,
        metadata,
      },
      {
        name: 'generate_registry_id',
        description: 'Generate official registry ID',
        priority: 70,
        maxRetries: 3,
        metadata,
      },
    ],
    EXEC_LOCKED: [
      {
        name: 'await_unlock',
        description: 'Await approval to unlock execution',
        priority: 100,
        maxRetries: 10,
        metadata,
      },
    ],
    OUTCOME_PROOF: [
      {
        name: 'measure_kpis',
        description: 'Measure KPI results',
        priority: 60,
        maxRetries: 5,
        metadata,
      },
      {
        name: 'update_trust_scores',
        description: 'Update agent trust scores',
        priority: 50,
        maxRetries: 3,
        metadata,
      },
    ],
    COMPLETED: [],
    REJECTED: [
      {
        name: 'archive_rejection',
        description: 'Archive rejection details',
        priority: 30,
        maxRetries: 3,
        metadata,
      },
    ],
    ARCHIVED: [],
  };

  return baseTasks[state] || [];
}
