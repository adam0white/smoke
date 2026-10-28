import { afterEach, expect, it, vi } from 'vitest';
import { type Reply, type Request, Simulation } from './simulation';

class WorkerDouble {
  static instance: WorkerDouble;
  onmessage?: (event: { data: Reply }) => void;
  onerror?: (event: { message: string }) => void;
  sent: Request[] = [];
  constructor() {
    WorkerDouble.instance = this;
  }
  postMessage(request: Request) {
    this.sent.push(request);
  }
  terminate() {}
}
afterEach(() => vi.unstubAllGlobals());

it('fences an export behind a submitted advance', async () => {
  vi.stubGlobal('Worker', WorkerDouble);
  const simulation = new Simulation();
  const advance = simulation.request('advance', { ticks: 1, inputs: [], held: { dx: 0, dy: 0 } });
  const exported = simulation.request('export', {});
  await vi.waitFor(() => expect(WorkerDouble.instance.sent).toHaveLength(1));
  const worker = WorkerDouble.instance;
  expect(worker.sent[0]!.kind).toBe('advance');
  worker.onmessage!({ data: { id: worker.sent[0]!.id, ok: false, error: 'Rejected tick' } });
  await expect(advance).rejects.toThrow('Rejected tick');
  await vi.waitFor(() => expect(worker.sent).toHaveLength(2));
  expect(worker.sent[1]!.kind).toBe('export');
  worker.onmessage!({ data: { id: worker.sent[1]!.id, ok: false, error: 'Export response' } });
  await expect(exported).rejects.toThrow('Export response');
  await simulation.fence();
  expect(simulation.metrics().queuedRequests).toBe(0);
  simulation.dispose();
});

it('rejects in-flight, queued and later requests when the worker crashes', async () => {
  vi.stubGlobal('Worker', WorkerDouble);
  const simulation = new Simulation();
  const first = simulation.request('export', {});
  const second = simulation.request('export', {});
  const settled = Promise.allSettled([first, second]);
  await vi.waitFor(() => expect(WorkerDouble.instance.sent).toHaveLength(1));
  WorkerDouble.instance.onerror!({ message: 'Worker crashed' });
  expect(simulation.available).toBe(false);
  expect((await settled).every((result) => result.status === 'rejected')).toBe(true);
  await expect(simulation.request('export', {})).rejects.toThrow('Worker crashed');
  expect(simulation.metrics().queuedRequests).toBe(0);
  simulation.dispose();
});
