import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { encode, decode } from '@msgpack/msgpack';
import * as flatbuffers from 'flatbuffers';
import { TestData as TestDataFB } from './schemas/generated/test-data/test-data';

// React Native provides performance API globally
declare const performance: {
  now: () => number;
};

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

function SerializationTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const ITERATIONS = 1000;

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
    for (let i = 0; i < ITERATIONS; i++) {
      JSON.parse(serialized[i]);
    }

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
    for (let i = 0; i < ITERATIONS; i++) {
      decode(serialized[i]) as TestData;
    }

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
    const startSerialize = performance.now();
    let serialized: Uint8Array[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const builder = new flatbuffers.Builder(1024);
      const fooOffset = builder.createString('bar');

      // Create TestData using generated schema
      const testDataOffset = TestDataFB.createTestData(
        builder,
        fooOffset,
        i, // foo_number increments to avoid caching
      );

      builder.finish(testDataOffset);
      serialized.push(builder.asUint8Array());
    }

    const serializeTime = performance.now() - startSerialize;

    const startDeserialize = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      const buf = new flatbuffers.ByteBuffer(serialized[i]);
      const testData = TestDataFB.getRootAsTestData(buf);

      // Read values using generated getters
      const foo = testData.foo();
      const fooNumber = testData.fooNumber();

      // Verify values match expected (ensures deserialization works correctly)
      if (foo !== 'bar') {
        console.warn(
          `FlatBuffers string mismatch at iteration ${i}: expected 'bar', got '${foo}'`,
        );
      }
      if (fooNumber !== i) {
        console.warn(
          `FlatBuffers number mismatch at iteration ${i}: expected ${i}, got ${fooNumber}`,
        );
      }
    }

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

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Run tests sequentially to avoid interference
    const jsonResult = testJSON();
    setResults([jsonResult]);

    // Small delay to ensure UI updates
    await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

    const msgpackResult = testMessagePack();
    setResults([jsonResult, msgpackResult]);

    await new Promise<void>(resolve => setTimeout(() => resolve(), 100));

    const flatbuffersResult = testFlatBuffers();
    setResults([jsonResult, msgpackResult, flatbuffersResult]);

    setIsRunning(false);
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)} ms`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Serialization Performance Test</Text>
        <Text style={styles.subtitle}>
          Testing JSON, MessagePack, and FlatBuffers
        </Text>
        <Text style={styles.info}>{ITERATIONS} iterations per format</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runAllTests}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : 'Run Performance Tests'}
        </Text>
      </TouchableOpacity>

      {results.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Results:</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <Text style={styles.resultFormat}>{result.format}</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Serialize:</Text>
                <Text style={styles.resultValue}>
                  {formatTime(result.serializeTime)}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Deserialize:</Text>
                <Text style={styles.resultValue}>
                  {formatTime(result.deserializeTime)}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total:</Text>
                <Text style={styles.resultValue}>
                  {formatTime(result.totalTime)}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Avg per operation:</Text>
                <Text style={styles.resultValue}>
                  {formatTime(result.totalTime / (result.iterations * 2))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#999',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultFormat: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default SerializationTest;
