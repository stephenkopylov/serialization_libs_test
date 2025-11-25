import { encode, decode } from '@msgpack/msgpack';
import * as flatbuffers from 'flatbuffers';
import { TestData as TestDataFB } from '../schemas/generated/test-data/test-data';

interface TestResult {
  format: string;
  serializeTime: number;
  deserializeTime: number;
  totalTime: number;
  iterations: number;
}

interface TestData {
  foo: string;
  foo_number: number;
}

const ITERATIONS = 10000;

// JSON serialization test
const testJSON = (): TestResult => {
  const startSerialize = performance.now();
  let serialized: string[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const data: TestData = {
      foo: 'bar',
      foo_number: i, // Increment to avoid caching
    };
    serialized.push(JSON.stringify(data));
  }

  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  let sum = 0; // Use result to prevent optimization
  for (let i = 0; i < ITERATIONS; i++) {
    const parsed = JSON.parse(serialized[i]) as TestData;
    sum += parsed.foo_number; // Use the result
  }
  // Prevent dead code elimination
  if (sum === 0) console.log('JSON sum:', sum);

  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'JSON',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: ITERATIONS,
  };
};

// MessagePack serialization test
const testMessagePack = (): TestResult => {
  const startSerialize = performance.now();
  let serialized: Uint8Array[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const data: TestData = {
      foo: 'bar',
      foo_number: i, // Increment to avoid caching
    };
    serialized.push(encode(data));
  }

  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  let sum = 0; // Use result to prevent optimization
  for (let i = 0; i < ITERATIONS; i++) {
    const parsed = decode(serialized[i]) as TestData;
    sum += parsed.foo_number; // Use the result
  }
  // Prevent dead code elimination
  if (sum === 0) console.log('MessagePack sum:', sum);

  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'MessagePack',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: ITERATIONS,
  };
};

// FlatBuffers serialization test
// Using generated schema classes
const testFlatBuffers = (): TestResult => {
  const serialized: Uint8Array[] = new Array(ITERATIONS);
  const builder = new flatbuffers.Builder(1024);

  const startSerialize = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    builder.clear();

    const fooOffset = builder.createString('bar');

    const testDataOffset = TestDataFB.createTestData(
      builder,
      fooOffset,
      i, // foo_number increments to avoid caching
    );

    builder.finish(testDataOffset);

    const buf = builder.asUint8Array();
    serialized[i] = buf.slice(); // Important: copy!
  }
  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  let sum = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const buf = new flatbuffers.ByteBuffer(serialized[i]);
    const testData = TestDataFB.getRootAsTestData(buf);

    const foo = testData.foo();
    const fooNumber = testData.fooNumber();

    sum += fooNumber + (foo ? foo.length : 0);
  }
  // Prevent dead code elimination
  if (sum === 0) console.log('FlatBuffers sum:', sum);

  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'FlatBuffers',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: ITERATIONS,
  };
};

const formatTime = (ms: number): string => {
  return `${ms.toFixed(2)} ms`;
};

const runAllTests = async () => {
  const runButton = document.getElementById('run-button') as HTMLButtonElement;
  const resultsDiv = document.getElementById('results') as HTMLDivElement;
  const resultsContent = document.getElementById(
    'results-content',
  ) as HTMLDivElement;

  runButton.disabled = true;
  runButton.textContent = 'Running Tests...';
  resultsDiv.style.display = 'none';
  resultsContent.innerHTML = '';

  // Run tests sequentially to avoid interference
  const jsonResult = testJSON();
  updateResults([jsonResult]);

  // Small delay to ensure UI updates
  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const msgpackResult = testMessagePack();
  updateResults([jsonResult, msgpackResult]);

  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const flatbuffersResult = testFlatBuffers();
  updateResults([jsonResult, msgpackResult, flatbuffersResult]);

  runButton.disabled = false;
  runButton.textContent = 'Run Performance Tests';
  resultsDiv.style.display = 'block';
};

const updateResults = (results: TestResult[]) => {
  const resultsContent = document.getElementById(
    'results-content',
  ) as HTMLDivElement;

  resultsContent.innerHTML = results
    .map(
      result => `
    <div class="result-card">
      <div class="result-format">${result.format}</div>
      <div class="result-row">
        <span class="result-label">Serialize:</span>
        <span class="result-value">${formatTime(result.serializeTime)}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Deserialize:</span>
        <span class="result-value">${formatTime(result.deserializeTime)}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Total:</span>
        <span class="result-value">${formatTime(result.totalTime)}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Avg per operation:</span>
        <span class="result-value">${formatTime(
          result.totalTime / (result.iterations * 2),
        )}</span>
      </div>
    </div>
  `,
    )
    .join('');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const iterationsInfo = document.getElementById('iterations-info');
  if (iterationsInfo) {
    iterationsInfo.textContent = `${ITERATIONS} iterations per format`;
  }

  const runButton = document.getElementById('run-button');
  if (runButton) {
    runButton.addEventListener('click', runAllTests);
  }
});
