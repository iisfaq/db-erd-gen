/**
 * Simple performance profiler for development
 * Usage:
 * 
 * import { Profiler } from './utils/profiler';
 * 
 * const profiler = new Profiler('My Operation');
 * // ... do work ...
 * profiler.end(); // Logs timing to console
 * 
 * // Or use with async operations:
 * const result = await profiler.profile(async () => {
 *   return await someAsyncOperation();
 * });
 */

export class Profiler {
  private startTime: number;
  private name: string;
  private marks: Map<string, number> = new Map();

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  /**
   * Add a checkpoint/mark to track intermediate progress
   */
  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * End profiling and log results
   */
  end(): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    console.log(`⏱️  [${this.name}] took ${duration.toFixed(3)}ms`);

    if (this.marks.size > 0) {
      let lastTime = this.startTime;
      this.marks.forEach((time, label) => {
        const delta = time - lastTime;
        console.log(`  ├─ ${label}: ${delta.toFixed(3)}ms`);
        lastTime = time;
      });
      const finalDelta = endTime - lastTime;
      console.log(`  └─ (final): ${finalDelta.toFixed(3)}ms`);
    }

    return duration;
  }

  /**
   * Profile a synchronous function
   */
  static time<T>(name: string, fn: () => T): T {
    const profiler = new Profiler(name);
    const result = fn();
    profiler.end();
    return result;
  }

  /**
   * Profile an async function
   */
  static async profile<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const profiler = new Profiler(name);
    const result = await fn();
    profiler.end();
    return result;
  }

  /**
   * Create a profiler that only logs if duration exceeds threshold
   */
  static timeThreshold<T>(name: string, thresholdMs: number, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > thresholdMs) {
      console.warn(`⚠️  [${name}] exceeded threshold: ${duration.toFixed(3)}ms (limit: ${thresholdMs}ms)`);
    }
    
    return result;
  }
}

/**
 * Simple function timer decorator
 */
export function timed(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const profiler = new Profiler(`${target.constructor.name}.${propertyKey}`);
    const result = originalMethod.apply(this, args);
    profiler.end();
    return result;
  };

  return descriptor;
}

/**
 * Async function timer decorator
 */
export function timedAsync(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const profiler = new Profiler(`${target.constructor.name}.${propertyKey}`);
    const result = await originalMethod.apply(this, args);
    profiler.end();
    return result;
  };

  return descriptor;
}

/**
 * Memory usage tracker (Node.js only)
 * Note: This class is designed for Node.js/test environments only
 */
export class MemoryProfiler {
  private name: string;
  private initialMemory: { heapUsed: number; external: number };

  constructor(name: string) {
    this.name = name;
    // Check if we're in Node.js environment
    const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    if (proc && proc.memoryUsage) {
      this.initialMemory = proc.memoryUsage();
    } else {
      // Browser fallback - no-op
      this.initialMemory = { heapUsed: 0, external: 0 };
    }
  }

  end(): void {
    const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    if (!proc || !proc.memoryUsage) {
      console.log(`💾 [${this.name}] Memory profiling not available in browser`);
      return;
    }

    const finalMemory = proc.memoryUsage();
    const heapDiff = (finalMemory.heapUsed - this.initialMemory.heapUsed) / 1024 / 1024;
    const externalDiff = (finalMemory.external - this.initialMemory.external) / 1024 / 1024;

    console.log(`💾 [${this.name}] Memory Impact:`);
    console.log(`  Heap: ${heapDiff > 0 ? '+' : ''}${heapDiff.toFixed(2)} MB`);
    console.log(`  External: ${externalDiff > 0 ? '+' : ''}${externalDiff.toFixed(2)} MB`);
  }

  static measure<T>(name: string, fn: () => T): T {
    const profiler = new MemoryProfiler(name);
    const result = fn();
    profiler.end();
    return result;
  }
}

/**
 * Performance statistics collector
 */
export class PerformanceStats {
  private measurements: number[] = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  add(duration: number): void {
    this.measurements.push(duration);
  }

  getStats(): {
    count: number;
    avg: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  } {
    if (this.measurements.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, median: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: sorted.length,
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  log(): void {
    const stats = this.getStats();
    console.log(`📊 [${this.name}] Statistics:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Average: ${stats.avg.toFixed(3)}ms`);
    console.log(`  Median: ${stats.median.toFixed(3)}ms`);
    console.log(`  Min: ${stats.min.toFixed(3)}ms`);
    console.log(`  Max: ${stats.max.toFixed(3)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(3)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(3)}ms`);
  }

  reset(): void {
    this.measurements = [];
  }
}

// Example usage in code comments:
/*
Example 1: Basic profiling
--------------------------
const profiler = new Profiler('Schema Generation');
const schema = tableDataToPostgresScheme(tables);
profiler.end();

Example 2: With checkpoints
----------------------------
const profiler = new Profiler('Complex Operation');
const data = loadData();
profiler.mark('Data loaded');
const processed = processData(data);
profiler.mark('Data processed');
const result = saveData(processed);
profiler.end();

Example 3: Function wrapper
----------------------------
const schema = Profiler.time('PostgreSQL Schema', () => {
  return tableDataToPostgresScheme(tables);
});

Example 4: Async operations
----------------------------
const result = await Profiler.profile('Async Operation', async () => {
  return await fetchAndProcess();
});

Example 5: Memory profiling
----------------------------
const result = MemoryProfiler.measure('Large Data Processing', () => {
  return processLargeDataset(data);
});

Example 6: Collecting statistics
---------------------------------
const stats = new PerformanceStats('API Requests');
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  await makeApiRequest();
  stats.add(performance.now() - start);
}
stats.log();
*/
