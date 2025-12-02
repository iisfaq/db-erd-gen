# 🐌 Slow Code Detection Guide

Quick reference for identifying performance bottlenecks in JavaScript/TypeScript.

## 🔍 Common Slow Patterns

### ❌ Pattern 1: Nested Loops on Large Arrays
```typescript
// SLOW - O(n²) complexity
for (const table of tables) {
  for (const col of table.columns) {
    const refTable = tables.find(t => t.name === col.foreignTo?.name);
  }
}
```

**Fix**: Cache or use Map for lookups
```typescript
// FAST - O(n) with O(1) lookups
const tableMap = new Map(tables.map(t => [t.name, t]));
for (const table of tables) {
  for (const col of table.columns) {
    const refTable = tableMap.get(col.foreignTo?.name);
  }
}
```

---

### ❌ Pattern 2: Repeated Array Searches
```typescript
// SLOW - Multiple find() calls
function getTableColumns(tableName: string) {
  return tables.find(t => t.name === tableName)?.columns;
}

// Called many times in a loop
for (let i = 0; i < 1000; i++) {
  const cols = getTableColumns("users");
}
```

**Fix**: Memoize or cache results
```typescript
// FAST - Cache results
const tableCache = new Map<string, Column[]>();
function getTableColumns(tableName: string) {
  if (!tableCache.has(tableName)) {
    const cols = tables.find(t => t.name === tableName)?.columns || [];
    tableCache.set(tableName, cols);
  }
  return tableCache.get(tableName);
}
```

---

### ❌ Pattern 3: String Concatenation in Loops (Array Approach)
```typescript
// SLOWER - Array join overhead for simple cases
const parts: string[] = [];
for (const item of items) {
  parts.push(`item: ${item}`);
}
const result = parts.join('\n');
```

**Fix**: Direct concatenation is often faster
```typescript
// FASTER - For simple concatenation
let result = '';
for (const item of items) {
  result += `item: ${item}\n`;
}
```

**Note**: Our benchmarks showed string concatenation is 38% faster!

---

### ❌ Pattern 4: Unnecessary Object Creation
```typescript
// SLOW - Creates new objects in loop
const results = items.map(item => ({
  ...item,
  computed: expensiveFunction(item)
}));
```

**Fix**: Mutate if possible or cache computations
```typescript
// FASTER - Cache expensive computations
const cache = new Map();
const results = items.map(item => {
  if (!cache.has(item.id)) {
    cache.set(item.id, expensiveFunction(item));
  }
  return { ...item, computed: cache.get(item.id) };
});
```

---

### ❌ Pattern 5: Large Array Filter + Map Chains
```typescript
// SLOWER - Multiple passes
const result = items
  .filter(x => x.active)
  .filter(x => x.valid)
  .map(x => x.value)
  .map(x => x * 2);
```

**Fix**: Single pass with reduce
```typescript
// FASTER - Single pass
const result = items.reduce((acc, x) => {
  if (x.active && x.valid) {
    acc.push(x.value * 2);
  }
  return acc;
}, [] as number[]);
```

---

### ❌ Pattern 6: Synchronous File Operations (Node.js)
```typescript
// SLOW - Blocks event loop
const content = fs.readFileSync('large-file.json', 'utf8');
const data = JSON.parse(content);
```

**Fix**: Use async operations
```typescript
// FAST - Non-blocking
const content = await fs.promises.readFile('large-file.json', 'utf8');
const data = JSON.parse(content);
```

---

### ❌ Pattern 7: Excessive React Re-renders
```typescript
// SLOW - Recreates function on every render
function MyComponent() {
  const handleClick = () => doSomething(); // New function each render
  return <button onClick={handleClick}>Click</button>;
}
```

**Fix**: Use useCallback
```typescript
// FAST - Memoized function
function MyComponent() {
  const handleClick = useCallback(() => doSomething(), []);
  return <button onClick={handleClick}>Click</button>;
}
```

---

### ❌ Pattern 8: Large State Updates
```typescript
// SLOW - Updates entire large array
setState([...state, newItem]); // Copies entire array
```

**Fix**: Use functional updates
```typescript
// FASTER - Only adds new item
setState(prev => [...prev, newItem]);

// BEST - Use a Map for large datasets
const [stateMap, setStateMap] = useState(new Map());
setStateMap(prev => new Map(prev).set(key, value));
```

---

## ✅ Performance Best Practices

### 1. **Measure Before Optimizing**
```typescript
import { Profiler } from './utils/profiler';

const result = Profiler.time('Operation', () => {
  return expensiveOperation();
});
```

### 2. **Use Browser DevTools**
- Chrome: Performance tab → Record → Analyze
- Look for long tasks (yellow bars)
- Check "Bottom-Up" view for hot functions

### 3. **Profile Memory**
```typescript
import { MemoryProfiler } from './utils/profiler';

const result = MemoryProfiler.measure('Large Operation', () => {
  return processLargeDataset();
});
```

### 4. **Lazy Load Heavy Components**
```typescript
// SLOW - Loads everything upfront
import HeavyComponent from './HeavyComponent';

// FAST - Loads on demand
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### 5. **Debounce Expensive Operations**
```typescript
import { useMemo, useCallback } from 'react';

// Expensive computation
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Debounce user input
const debouncedSearch = useCallback(
  debounce((query: string) => search(query), 300),
  []
);
```

---

## 🎯 When to Optimize

### ✅ Optimize When:
- Function takes > 100ms consistently
- User experiences lag or jank
- Memory grows unbounded
- Profiler shows bottleneck

### ❌ Don't Optimize When:
- Function takes < 10ms
- Only runs once
- Code becomes unreadable
- No measurable impact

---

## 🔬 How to Profile

### Quick Profile:
```typescript
console.time('operation');
doSomething();
console.timeEnd('operation'); // Logs time
```

### Detailed Profile:
```typescript
const profiler = new Profiler('Complex Op');
step1();
profiler.mark('Step 1 done');
step2();
profiler.mark('Step 2 done');
step3();
profiler.end();
// Logs breakdown of each step
```

### Statistics:
```typescript
import { PerformanceStats } from './utils/profiler';

const stats = new PerformanceStats('API Calls');
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  await apiCall();
  stats.add(performance.now() - start);
}
stats.log(); // Shows avg, median, p95, p99
```

---

## 📊 Performance Targets

| Operation | Target | Alert |
|-----------|--------|-------|
| Database query | < 50ms | > 200ms |
| Schema generation | < 100ms | > 500ms |
| UI render | < 16ms (60fps) | > 33ms |
| User interaction | < 100ms | > 300ms |
| Page load | < 2s | > 5s |

---

## 🚨 Red Flags

Watch out for these in your code:

1. `find()` inside `map()` or nested loops
2. Large arrays copied with spread operator
3. Functions recreated on every render
4. Synchronous file I/O in Node.js
5. Excessive component re-renders
6. Large object mutations
7. Unindexed database queries
8. Memory leaks (unbounded arrays/maps)

---

## 📚 Resources

- [Profiler Utility](./src/utils/profiler.ts)
- [Benchmark Suite](./benchmark/benchmark.test.ts)
- [Performance Report](./PERFORMANCE_REPORT.md)
- [Chrome DevTools - Performance](https://developer.chrome.com/docs/devtools/performance/)
- [React Profiler](https://react.dev/reference/react/Profiler)

---

## 🎓 Remember

> "Premature optimization is the root of all evil" - Donald Knuth

Always:
1. ✅ Write clean code first
2. ✅ Profile to find real bottlenecks  
3. ✅ Optimize only what matters
4. ✅ Measure the improvement
5. ✅ Keep code readable
