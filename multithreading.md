Each worker owns:
- A local task queue.
- Its own queue indices and synchronization state.
- Its pass registry and map cache.
- Its output allocation strategy.
The shared scheduler contains:
- Queue metadata for every worker.
- A shared task registry for deduplication and dependency state.
- Worker activity state and wake-up signals.
Scheduling
1. A worker resolves a map request.
2. It checks the shared task registry to avoid duplicate generation.
3. It registers missing dependencies and enqueues them locally.
4. Once dependencies complete, it enqueues the parent task locally.
5. It executes tasks from its own queue.
6. If its queue is empty, it steals from another worker.
7. If no work exists anywhere, it waits until notified.
Work stealing
I'd use a deque per worker:
- Owner pushes and pops from one end (LIFO).
- Thieves steal from the opposite end (FIFO).
This is the classic work-stealing arrangement. It has good cache locality for the owner while thieves tend to take older, larger units of work.

For synchronization, each deque needs atomic coordination around concurrent owner/thief access. A proven bounded work-stealing deque algorithm is preferable to inventing a lock-free implementation.
Why this fits generation
Dependency resolution naturally creates more work. A worker processing a map can enqueue its prerequisites without involving the main thread.

It also avoids a global queue becoming a contention point when thousands of chunks are being generated.

One important design choice: where should newly discovered dependencies go?

I'd initially enqueue them on the worker that discovered them. That preserves locality and avoids cross-worker queue writes. Other workers can steal them when idle.

The shared task registry still ensures that two workers cannot generate the same map simultaneously.

My recommendation: per-worker deques + work stealing + shared atomic task registry. Keep postMessage for initialization, output-buffer handoff and errors—not task scheduling.