import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'perf_hooks';
import { Table } from '../src/interface/inputData';
import { grandData } from '../src/data/testInputData';

// Import all transformation functions
import { inputDataToNodeAndEdges } from '../src/utils/inputData/inputDataToNode';
import { tableDataToPostgresScheme } from '../src/utils/dataBase/tableDataToPostgres';
import { tableDataToMySQLScheme } from '../src/utils/dataBase/tableDataToMySQL';
import { tableDataToSQLiteScheme } from '../src/utils/dataBase/tableDataToSQLite';
import { tableDataToPrismaScheme } from '../src/utils/dataBase/tableDataToPrisma';
import { tableDataToKnexScheme } from '../src/utils/dataBase/tableDataToKnex';
import { tableDataToKyselyScheme } from '../src/utils/dataBase/tableDataToKysely';
import { tableDataToDrizzleScheme } from '../src/utils/dataBase/tableDataToDrizzle';
import { tableDataToSequelizeScheme } from '../src/utils/dataBase/tableDataToSequelize';
import { tableDataToZodTypeScheme } from '../src/utils/dataBase/tableDataToZodType';
import { tableDataToYupTypeScheme } from '../src/utils/dataBase/tableDataToYupType';
import { tableDataToValibotTypeScheme } from '../src/utils/dataBase/tableDataToValibotType';
import { tableDataToTsTypeScheme } from '../src/utils/dataBase/tableDataToTsType';

// Performance measurement utilities
interface BenchmarkResult {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  opsPerSecond: number;
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 100
): BenchmarkResult {
  const times: number[] = [];

  // Warm-up runs
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;

  return {
    name,
    avgTime,
    minTime,
    maxTime,
    iterations,
    opsPerSecond,
  };
}

function formatResult(result: BenchmarkResult): string {
  return `
  📊 ${result.name}
  ⏱️  Average: ${result.avgTime.toFixed(3)}ms
  🚀 Min: ${result.minTime.toFixed(3)}ms
  🐌 Max: ${result.maxTime.toFixed(3)}ms
  📈 Ops/sec: ${result.opsPerSecond.toFixed(2)}
  🔁 Iterations: ${result.iterations}
  `;
}

describe('Performance Benchmarks', () => {
  let testData: Table[];
  let largeTestData: Table[];

  beforeAll(() => {
    testData = grandData;
    
    // Create larger dataset for stress testing
    largeTestData = [];
    for (let i = 0; i < 10; i++) {
      largeTestData.push(...grandData.map(table => ({
        ...table,
        name: `${table.name}_copy_${i}`,
      })));
    }
  });

  describe('🔍 Data Transformation Functions', () => {
    it('inputDataToNodeAndEdges - Standard Dataset', () => {
      const result = benchmark(
        'inputDataToNodeAndEdges (Standard)',
        () => inputDataToNodeAndEdges(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('inputDataToNodeAndEdges - Large Dataset', () => {
      const result = benchmark(
        'inputDataToNodeAndEdges (Large)',
        () => inputDataToNodeAndEdges(largeTestData),
        50
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(500); // Should complete in under 500ms
    });

    it('tableDataToPostgresScheme', () => {
      const result = benchmark(
        'PostgreSQL Schema Generation',
        () => tableDataToPostgresScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(50);
    });

    it('tableDataToMySQLScheme', () => {
      const result = benchmark(
        'MySQL Schema Generation',
        () => tableDataToMySQLScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(50);
    });

    it('tableDataToSQLiteScheme', () => {
      const result = benchmark(
        'SQLite Schema Generation',
        () => tableDataToSQLiteScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(50);
    });

    it('tableDataToPrismaScheme', () => {
      const result = benchmark(
        'Prisma Schema Generation',
        () => tableDataToPrismaScheme(testData, 'postgresql'),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToKnexScheme', () => {
      const result = benchmark(
        'Knex Schema Generation',
        () => tableDataToKnexScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToKyselyScheme', () => {
      const result = benchmark(
        'Kysely Schema Generation',
        () => tableDataToKyselyScheme(testData, 'postgresql'),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToDrizzleScheme', () => {
      const result = benchmark(
        'Drizzle Schema Generation',
        () => tableDataToDrizzleScheme(testData, 'postgresql'),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToSequelizeScheme', () => {
      const result = benchmark(
        'Sequelize Schema Generation',
        () => tableDataToSequelizeScheme(testData, 'postgresql'),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });
  });

  describe('📝 Type Generation Functions', () => {
    it('tableDataToZodTypeScheme', () => {
      const result = benchmark(
        'Zod Type Schema Generation',
        () => tableDataToZodTypeScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToYupTypeScheme', () => {
      const result = benchmark(
        'Yup Type Schema Generation',
        () => tableDataToYupTypeScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToValibotTypeScheme', () => {
      const result = benchmark(
        'Valibot Type Schema Generation',
        () => tableDataToValibotTypeScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });

    it('tableDataToTsTypeScheme', () => {
      const result = benchmark(
        'TypeScript Type Generation',
        () => tableDataToTsTypeScheme(testData),
        100
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(100);
    });
  });

  describe('🔥 Stress Tests - Large Datasets', () => {
    it('PostgreSQL Schema - Large Dataset', () => {
      const result = benchmark(
        'PostgreSQL (Large Dataset)',
        () => tableDataToPostgresScheme(largeTestData),
        50
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(500);
    });

    it('Prisma Schema - Large Dataset', () => {
      const result = benchmark(
        'Prisma (Large Dataset)',
        () => tableDataToPrismaScheme(largeTestData, 'postgresql'),
        50
      );
      console.log(formatResult(result));
      expect(result.avgTime).toBeLessThan(1000);
    });
  });

  describe('🎯 Individual Function Profiling', () => {
    it('findIndex performance in inputDataToNodeAndEdges', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        inputDataToNodeAndEdges(testData);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`\n  Average time per call: ${avgTime.toFixed(3)}ms`);
      console.log(`  Total time for ${iterations} iterations: ${(end - start).toFixed(3)}ms`);
    });

    it('String concatenation performance', () => {
      const iterations = 10000;
      let result: string;

      // Test 1: String concatenation with +
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        result = '';
        for (const table of testData.slice(0, 5)) {
          result += `CREATE TABLE ${table.name} (\n`;
          for (const col of table.columns) {
            result += `  ${col.name} ${col.dataType},\n`;
          }
          result += ');\n';
        }
      }
      const end1 = performance.now();

      // Test 2: Array join approach
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const parts: string[] = [];
        for (const table of testData.slice(0, 5)) {
          parts.push(`CREATE TABLE ${table.name} (`);
          for (const col of table.columns) {
            parts.push(`  ${col.name} ${col.dataType},`);
          }
          parts.push(');');
        }
        result = parts.join('\n');
      }
      const end2 = performance.now();

      const time1 = end1 - start1;
      const time2 = end2 - start2;

      console.log(`\n  String concatenation (+): ${time1.toFixed(3)}ms`);
      console.log(`  Array join approach: ${time2.toFixed(3)}ms`);
      console.log(`  Winner: ${time1 < time2 ? 'String concatenation' : 'Array join'} (${Math.abs(time1 - time2).toFixed(3)}ms faster)`);
    });

    it('Foreign key lookup performance', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const table of testData) {
          for (const col of table.columns) {
            if (col.foreignTo) {
              const refTable = testData.find(t => t.name === col.foreignTo!.name);
              if (refTable) {
                const refColumn = refTable.columns.find(c => c.name === col.foreignTo!.column);
              }
            }
          }
        }
      }

      const end = performance.now();
      console.log(`\n  Foreign key lookups: ${((end - start) / iterations).toFixed(3)}ms per iteration`);
    });
  });
});

describe('🧪 Memory Usage Analysis', () => {
  it('Memory footprint of transformations', () => {
    const initialMemory = process.memoryUsage();

    const results = {
      nodes: inputDataToNodeAndEdges(grandData),
      postgres: tableDataToPostgresScheme(grandData),
      mysql: tableDataToMySQLScheme(grandData),
      prisma: tableDataToPrismaScheme(grandData, 'postgresql'),
      zod: tableDataToZodTypeScheme(grandData),
      typescript: tableDataToTsTypeScheme(grandData),
    };

    const finalMemory = process.memoryUsage();
    const heapUsed = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    const external = (finalMemory.external - initialMemory.external) / 1024 / 1024;

    console.log(`\n  📦 Memory Impact:`);
    console.log(`  Heap Used: ${heapUsed.toFixed(2)} MB`);
    console.log(`  External: ${external.toFixed(2)} MB`);
    console.log(`  Total: ${(heapUsed + external).toFixed(2)} MB`);

    // Memory should be reasonable (less than 100MB for this operation)
    expect(heapUsed).toBeLessThan(100);
  });
});
