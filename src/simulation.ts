import type { Game, Input, LoggedInput, RunExport } from './sim';

export interface Motion {
  dx: number;
  dy: number;
}
export interface SimulationSnapshot {
  game: Game;
  previous: { people: { x: number; y: number }[]; player: Game['player'] };
}
export interface Commands {
  reset: { seed: number; replay?: LoggedInput[] };
  advance: { ticks: number; inputs: Input[]; held: Motion };
  export: Record<string, never>;
  replayCheck: Record<string, never>;
}
export interface Results {
  reset: SimulationSnapshot;
  advance: SimulationSnapshot;
  export: RunExport;
  replayCheck: string;
}
export type Request = {
  [K in keyof Commands]: { id: number; kind: K; payload: Commands[K] };
}[keyof Commands];
export type Reply =
  | { id: number; ok: true; value: Results[keyof Results] }
  | { id: number; ok: false; error: string };

/** One queue fences exports and resets behind all previously submitted simulation work. */
export class Simulation {
  private worker = new Worker(new URL('./sim-worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private waiting = new Map<
    number,
    { resolve: (value: Results[keyof Results]) => void; reject: (error: Error) => void }
  >();
  private failed: Error | undefined;
  private queued = 0;
  private latencyMs = 0;
  private maxLatencyMs = 0;
  private samples: number[] = [];
  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const pending = this.waiting.get(data.id);
      if (!pending) return;
      this.waiting.delete(data.id);
      if (data.ok) pending.resolve(data.value);
      else pending.reject(new Error(data.error));
    };
    this.worker.onerror = (event) => {
      this.failed = new Error(event.message || 'The simulation worker stopped.');
      for (const pending of this.waiting.values()) pending.reject(this.failed);
      this.waiting.clear();
    };
  }
  request<K extends keyof Commands>(kind: K, payload: Commands[K]): Promise<Results[K]> {
    this.queued++;
    const operation = this.tail
      .then(async () => {
        if (this.failed) throw this.failed;
        const started = performance.now();
        const value = await new Promise<Results[keyof Results]>((resolve, reject) => {
          const id = ++this.sequence;
          this.waiting.set(id, { resolve, reject });
          try {
            this.worker.postMessage({ id, kind, payload });
          } catch (error) {
            this.waiting.delete(id);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
        this.latencyMs = performance.now() - started;
        this.maxLatencyMs = Math.max(this.maxLatencyMs, this.latencyMs);
        this.samples.push(this.latencyMs);
        if (this.samples.length > 240) this.samples.shift();
        return value as Results[K];
      })
      .finally(() => {
        this.queued--;
      });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  get available(): boolean {
    return !this.failed;
  }
  async fence(): Promise<void> {
    await this.tail;
  }
  metrics() {
    return {
      available: this.available,
      queuedRequests: this.queued,
      lastLatencyMs: this.latencyMs,
      maxLatencyMs: this.maxLatencyMs,
      latencySamples: [...this.samples],
    };
  }
  dispose() {
    this.worker.terminate();
    this.failed = new Error('The simulation worker was closed.');
    for (const pending of this.waiting.values()) pending.reject(this.failed);
    this.waiting.clear();
  }
}
