import { encode, decode } from '@msgpack/msgpack';
import * as flatbuffers from 'flatbuffers';
import { TestData as TestDataFB } from '../schemas/generated/test-data/test-data';
import { Person } from '../schemas/generated/person/person';
import { PersonList } from '../schemas/generated/person/person-list';
import * as avro from 'avsc';
import largeJsonData from './5MB.json';

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
      foo: `bar${i}`,
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

// Avro serialization test
const testAvro = (): TestResult => {
  // Define Avro schema
  const schema = avro.Type.forSchema({
    type: 'record',
    name: 'TestData',
    fields: [
      { name: 'foo', type: 'string' },
      { name: 'foo_number', type: 'int' },
    ],
  });

  const startSerialize = performance.now();
  let serialized: Buffer[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const data: TestData = {
      foo: 'bar',
      foo_number: i, // Increment to avoid caching
    };
    serialized.push(schema.toBuffer(data));
  }

  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  let sum = 0; // Use result to prevent optimization
  for (let i = 0; i < ITERATIONS; i++) {
    const parsed = schema.fromBuffer(serialized[i]) as TestData;
    sum += parsed.foo_number; // Use the result
  }
  // Prevent dead code elimination
  if (sum === 0) console.log('Avro sum:', sum);

  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'Avro',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: ITERATIONS,
  };
};

// Large JSON test (5MB file)
const testLargeJSON = (): TestResult => {
  const startSerialize = performance.now();
  const serialized = JSON.stringify(largeJsonData);
  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  const parsed = JSON.parse(serialized);
  // Use result to prevent optimization
  const sum = Array.isArray(parsed) ? parsed.length : 0;
  if (sum === 0) console.log('Large JSON sum:', sum);
  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'JSON (5MB)',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: 1,
  };
};

// Large MessagePack test (5MB file)
const testLargeMessagePack = (): TestResult => {
  const startSerialize = performance.now();
  const serialized = encode(largeJsonData);
  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  const parsed = decode(serialized);
  // Use result to prevent optimization
  const sum = Array.isArray(parsed) ? (parsed as any[]).length : 0;
  if (sum === 0) console.log('Large MessagePack sum:', sum);
  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'MessagePack (5MB)',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: 1,
  };
};

// Large FlatBuffers test (5MB file)
const testLargeFlatBuffers = (): TestResult => {
  const data = largeJsonData as any[];

  const startSerialize = performance.now();
  const builder = new flatbuffers.Builder(1024 * 1024 * 10); // 10MB initial capacity

  // Create Person objects
  const personOffsets: flatbuffers.Offset[] = [];
  for (let i = 0; i < data.length; i++) {
    const person = data[i];
    const nameOffset = builder.createString(person.name || '');
    const languageOffset = builder.createString(person.language || '');
    const idOffset = builder.createString(person.id || '');
    const bioOffset = builder.createString(person.bio || '');
    const version = person.version || 0.0;

    const personOffset = Person.createPerson(
      builder,
      nameOffset,
      languageOffset,
      idOffset,
      bioOffset,
      version,
    );
    personOffsets.push(personOffset);
  }

  // Create PersonList
  const personsVector = PersonList.createPersonsVector(builder, personOffsets);
  const personListOffset = PersonList.createPersonList(builder, personsVector);
  builder.finish(personListOffset);

  const serialized = builder.asUint8Array();
  const serializeTime = performance.now() - startSerialize;

  const startDeserialize = performance.now();
  const buf = new flatbuffers.ByteBuffer(serialized);
  const personList = PersonList.getRootAsPersonList(buf);

  // Use result to prevent optimization
  let sum = 0;
  const length = personList.personsLength();
  for (let i = 0; i < length; i++) {
    const person = personList.persons(i);
    if (person) {
      sum += person.version();
    }
  }
  if (sum === 0) console.log('Large FlatBuffers sum:', sum);

  const deserializeTime = performance.now() - startDeserialize;
  const totalTime = serializeTime + deserializeTime;

  return {
    format: 'FlatBuffers (5MB)',
    serializeTime,
    deserializeTime,
    totalTime,
    iterations: 1,
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

  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const flatbuffersResult = testFlatBuffers();
  updateResults([jsonResult, msgpackResult, flatbuffersResult]);

  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const avroResult = testAvro();
  updateResults([jsonResult, msgpackResult, flatbuffersResult, avroResult]);

  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const largeJsonResult = testLargeJSON();
  updateResults([
    jsonResult,
    msgpackResult,
    flatbuffersResult,
    avroResult,
    largeJsonResult,
  ]);

  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const largeMsgpackResult = testLargeMessagePack();
  updateResults([
    jsonResult,
    msgpackResult,
    flatbuffersResult,
    avroResult,
    largeJsonResult,
    largeMsgpackResult,
  ]);

  await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

  const largeFlatbuffersResult = testLargeFlatBuffers();
  updateResults([
    jsonResult,
    msgpackResult,
    flatbuffersResult,
    avroResult,
    largeJsonResult,
    largeMsgpackResult,
    largeFlatbuffersResult,
  ]);

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
        <span class="result-value">${
          result.iterations > 1
            ? formatTime(result.totalTime / (result.iterations * 2))
            : 'N/A (single operation)'
        }</span>
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
