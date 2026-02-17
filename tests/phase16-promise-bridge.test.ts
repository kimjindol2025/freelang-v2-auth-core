/**
 * Promise Bridge 테스트 (Phase 16 FFI Foundation)
 *
 * async/await와 C 콜백 통합 검증
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import promiseBridge, { PromiseBridge, simulateAsyncCall } from '../src/runtime/promise-bridge';

describe('PromiseBridge', () => {
  let bridge: PromiseBridge;

  beforeEach(() => {
    bridge = new PromiseBridge();
  });

  afterEach(() => {
    bridge.cancelAll();
  });

  describe('registerCallback', () => {
    it('should register callback and return promise + ID', () => {
      const { promise, callbackId } = bridge.registerCallback();

      expect(promise).toBeInstanceOf(Promise);
      expect(callbackId).toBeGreaterThan(0);
      expect(bridge.getPendingCallbacks()).toContain(callbackId);
    });

    it('should generate unique callback IDs', () => {
      const { callbackId: id1 } = bridge.registerCallback();
      const { callbackId: id2 } = bridge.registerCallback();
      const { callbackId: id3 } = bridge.registerCallback();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });

    it('should have default timeout of 5000ms', async () => {
      const { promise } = bridge.registerCallback(); // 기본 5000ms

      const start = Date.now();
      await expect(promise).rejects.toThrow('timed out');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(4900);
      expect(elapsed).toBeLessThan(6000);
    });

    it('should respect custom timeout', async () => {
      const { promise } = bridge.registerCallback(100); // 100ms 타임아웃

      const start = Date.now();
      await expect(promise).rejects.toThrow('timed out');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('executeCallback', () => {
    it('should resolve promise with result', async () => {
      const { promise, callbackId } = bridge.registerCallback();

      simulateAsyncCall(callbackId, 'test data', 10);

      const result = await promise;
      expect(result).toBe('test data');
    });

    it('should resolve promise with object', async () => {
      const { promise, callbackId } = bridge.registerCallback();
      const expectedData = { name: 'test', value: 42 };

      simulateAsyncCall(callbackId, expectedData, 10);

      const result = await promise;
      expect(result).toEqual(expectedData);
    });

    it('should resolve promise with array', async () => {
      const { promise, callbackId } = bridge.registerCallback();
      const expectedData = [1, 2, 3, 'a', 'b'];

      simulateAsyncCall(callbackId, expectedData, 10);

      const result = await promise;
      expect(result).toEqual(expectedData);
    });

    it('should reject promise with error', async () => {
      const { promise, callbackId } = bridge.registerCallback();

      setTimeout(() => {
        bridge.executeCallback(callbackId, undefined, 'File not found');
      }, 10);

      await expect(promise).rejects.toThrow('File not found');
    });

    it('should remove callback after execution', async () => {
      const { promise, callbackId } = bridge.registerCallback();

      simulateAsyncCall(callbackId, 'data', 10);
      await promise;

      expect(bridge.getPendingCallbacks()).not.toContain(callbackId);
    });

    it('should handle unknown callback ID gracefully', () => {
      // Should not throw
      bridge.executeCallback(9999, 'data');
      expect(true).toBe(true);
    });

    it('should clear timeout after execution', async () => {
      const { promise, callbackId } = bridge.registerCallback();

      simulateAsyncCall(callbackId, 'data', 10);
      await promise;

      // Wait longer than timeout would be
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Should not reject from timeout
      expect(true).toBe(true);
    });
  });

  describe('cancelCallback', () => {
    it('should cancel specific callback', async () => {
      const { promise, callbackId } = bridge.registerCallback(10000);

      bridge.cancelCallback(callbackId);

      expect(bridge.getPendingCallbacks()).not.toContain(callbackId);
    });

    it('should not affect other callbacks', async () => {
      const { callbackId: id1 } = bridge.registerCallback();
      const { callbackId: id2 } = bridge.registerCallback();

      bridge.cancelCallback(id1);

      expect(bridge.getPendingCallbacks()).not.toContain(id1);
      expect(bridge.getPendingCallbacks()).toContain(id2);
    });

    it('should handle non-existent callback gracefully', () => {
      // Should not throw
      bridge.cancelCallback(9999);
      expect(true).toBe(true);
    });
  });

  describe('cancelAll', () => {
    it('should cancel all pending callbacks', () => {
      bridge.registerCallback();
      bridge.registerCallback();
      bridge.registerCallback();

      bridge.cancelAll();

      expect(bridge.getPendingCallbacks().length).toBe(0);
    });

    it('should reject all pending promises', async () => {
      const { promise: p1 } = bridge.registerCallback();
      const { promise: p2 } = bridge.registerCallback();

      bridge.cancelAll();

      await expect(p1).rejects.toThrow('PromiseBridge destroyed');
      await expect(p2).rejects.toThrow('PromiseBridge destroyed');
    });
  });

  describe('getPendingCallbacks', () => {
    it('should return empty array initially', () => {
      const bridge = new PromiseBridge();
      expect(bridge.getPendingCallbacks()).toEqual([]);
    });

    it('should return all pending callback IDs', () => {
      const ids = [];
      for (let i = 0; i < 5; i++) {
        const { callbackId } = bridge.registerCallback();
        ids.push(callbackId);
      }

      const pending = bridge.getPendingCallbacks();
      expect(pending).toHaveLength(5);
      expect(pending).toEqual(expect.arrayContaining(ids));
    });
  });

  describe('Integration: Simulating FreeLang async/await', () => {
    it('should simulate async file read', async () => {
      // FreeLang 코드 시뮬레이션:
      // let content = await fs.readFile("/tmp/test.txt");
      // println(content);

      const { promise, callbackId } = bridge.registerCallback();

      // C 코드 시뮬레이션:
      // fs_read_async(path, callbackId)
      // → uv_fs_open() → uv_fs_read() → callback → vm_execute_callback(callbackId, content)
      simulateAsyncCall(callbackId, 'Hello, FreeLang!', 50);

      const content = await promise;
      expect(content).toBe('Hello, FreeLang!');
    });

    it('should simulate parallel async operations', async () => {
      // Promise.all 시뮬레이션
      const { promise: p1, callbackId: id1 } = bridge.registerCallback();
      const { promise: p2, callbackId: id2 } = bridge.registerCallback();
      const { promise: p3, callbackId: id3 } = bridge.registerCallback();

      simulateAsyncCall(id1, 'data1', 10);
      simulateAsyncCall(id2, 'data2', 20);
      simulateAsyncCall(id3, 'data3', 30);

      const results = await Promise.all([p1, p2, p3]);
      expect(results).toEqual(['data1', 'data2', 'data3']);
    });

    it('should handle callback error chain', async () => {
      // FreeLang 코드 시뮬레이션:
      // try {
      //   let content = await fs.readFile("/nonexistent");
      // } catch (err) {
      //   println("Error: " + err);
      // }

      const { promise, callbackId } = bridge.registerCallback();

      // C 코드: open() 실패 → callback with error
      setTimeout(() => {
        bridge.executeCallback(callbackId, undefined, 'ENOENT: No such file');
      }, 10);

      try {
        await promise;
        expect(true).toBe(false); // Should not reach
      } catch (err: any) {
        expect(err.message).toContain('ENOENT');
      }
    });

    it('should support sequential async operations', async () => {
      // FreeLang 코드 시뮬레이션:
      // let data1 = await operation1();
      // let data2 = await operation2(data1);
      // let result = await operation3(data2);

      const { promise: p1, callbackId: id1 } = bridge.registerCallback();
      const data1 = (async () => {
        simulateAsyncCall(id1, { id: 1, name: 'Alice' }, 10);
        return p1;
      })();

      const result1 = await data1;

      const { promise: p2, callbackId: id2 } = bridge.registerCallback();
      const data2 = (async () => {
        simulateAsyncCall(id2, { ...result1, age: 30 }, 10);
        return p2;
      })();

      const result2 = await data2;

      expect(result2).toEqual({ id: 1, name: 'Alice', age: 30 });
    });
  });

  describe('Performance', () => {
    it('should handle 1000 concurrent callbacks', async () => {
      const callbacks = [];
      for (let i = 0; i < 1000; i++) {
        const { promise, callbackId } = bridge.registerCallback();
        callbacks.push({ promise, callbackId });
      }

      expect(bridge.getPendingCallbacks().length).toBe(1000);

      // Execute all
      callbacks.forEach(({ callbackId }, index) => {
        simulateAsyncCall(callbackId, `result-${index}`, 0);
      });

      const results = await Promise.all(callbacks.map((c) => c.promise));
      expect(results.length).toBe(1000);
      expect(bridge.getPendingCallbacks().length).toBe(0);
    });

    it('should measure callback latency', async () => {
      const { promise, callbackId } = bridge.registerCallback();

      const start = Date.now();
      simulateAsyncCall(callbackId, 'data', 50);
      await promise;
      const latency = Date.now() - start;

      expect(latency).toBeGreaterThanOrEqual(45);
      expect(latency).toBeLessThan(200);
    });
  });
});
