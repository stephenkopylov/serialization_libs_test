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
  // Using low-level API to create a simple table structure
  const testFlatBuffers = (): TestResult => {
    const startSerialize = performance.now();
    let serialized: Uint8Array[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const builder = new flatbuffers.Builder(1024);
      const fooOffset = builder.createString('bar');

      // Create a simple table with 2 fields:
      // - field 0: string (foo)
      // - field 1: int32 (foo_number)
      builder.startObject(2);
      builder.addFieldOffset(0, fooOffset, 0);
      builder.addFieldInt32(1, i, 0);
      const offset = builder.endObject();
      builder.finish(offset);

      serialized.push(builder.asUint8Array());
    }

    const serializeTime = performance.now() - startSerialize;

    const startDeserialize = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      const buf = new flatbuffers.ByteBuffer(serialized[i]);
      // Root offset is stored at the end of the buffer (last 4 bytes)
      buf.setPosition(serialized[i].length - 4);
      const root = buf.readInt32(buf.position());

      // Deserialize using low-level API
      // FlatBuffers format: root points to table, table[0] points to vtable
      buf.setPosition(root);
      const vtableOffset = root - buf.readInt32(root);

      // Read vtable: [vtable_size: 2 bytes][object_size: 2 bytes][field_offsets: 2 bytes each]
      // Field offsets are stored as 16-bit values relative to table start
      const field0Offset = buf.readInt16(vtableOffset + 4); // Skip vtable_size and object_size
      const field1Offset = buf.readInt16(vtableOffset + 6);

      // Read field values from table
      if (field0Offset !== 0) {
        // Read string offset (relative to table position)
        const stringOffset = buf.readInt32(root + field0Offset);
        if (stringOffset !== 0) {
          const stringPos = root + field0Offset + stringOffset;
          // Read string length to ensure we're reading valid data
          const stringLength = buf.readInt32(stringPos);
          // Verify string length matches expected ("bar" = 3 bytes)
          if (stringLength !== 3) {
            console.warn(
              `FlatBuffers string length mismatch at iteration ${i}`,
            );
          }
        }
      }

      if (field1Offset !== 0) {
        // Read int32 value from table
        const numberValue = buf.readInt32(root + field1Offset);
        // Verify number value matches expected (ensures deserialization works correctly)
        if (numberValue !== i) {
          console.warn(
            `FlatBuffers number mismatch at iteration ${i}: expected ${i}, got ${numberValue}`,
          );
        }
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
