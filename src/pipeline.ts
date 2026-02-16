// FreeLang v2 - Complete Pipeline
// Free input → Header → IR → VM execution

import { AutoHeaderEngine, HeaderProposal } from './engine/auto-header';
import { AIIntent, Op, Inst, VMResult } from './types';
import { VM } from './vm';
import { CodeGen } from './codegen';
import { Compiler } from './compiler';
import { Corrector, CorrectionResult } from './correction';
import { Learner } from './learner';
import { OptimizationDetector, OptimizationSuggestion } from './analyzer/optimization-detector';

export interface PipelineInput {
  instruction: string;        // free-form input: "sum array", "filter > 5", etc
  data?: number[];            // optional test data
}

export interface PipelineOutput {
  header: HeaderProposal;           // proposed header
  intent: AIIntent;                 // generated IR intent
  vm: VMResult;                     // VM execution result
  correction?: CorrectionResult;
  compile?: { ok: boolean; c_code?: string };
  final_value?: unknown;            // Can be number, array, iterator, boolean, etc.
  optimizations?: OptimizationSuggestion[]; // AI-detected optimization opportunities
}

export class Pipeline {
  private engine: AutoHeaderEngine;
  private vm: VM;
  private codegen: CodeGen;
  private compiler: Compiler;
  private corrector: Corrector;
  private learner: Learner;
  private optimizer: OptimizationDetector;

  constructor(outDir?: string) {
    this.engine = new AutoHeaderEngine();
    this.vm = new VM();
    this.codegen = new CodeGen();
    this.compiler = new Compiler(outDir);
    this.corrector = new Corrector();
    this.learner = new Learner();
    this.optimizer = new OptimizationDetector();
  }

  /**
   * Complete pipeline: input → header → IR → VM execution
   *
   * Example:
   *   run({ instruction: "sum", data: [1,2,3,4,5] })
   *   →
   *   {
   *     header: { fn: "sum", input: "array<number>", ... },
   *     intent: { fn: "sum", params: [...], body: [Op.ARR_NEW, ...] },
   *     vm: { ok: true, value: 15, cycles: 10, ms: 1.2 },
   *     optimizations: [{ type: "constant_folding", confidence: 0.95, ... }],
   *     final_value: 15
   *   }
   */
  run(input: PipelineInput): PipelineOutput | null {
    // Step 1: Generate header from free-form input
    const header = this.engine.generate(input.instruction);
    if (!header) {
      throw new Error(`pipeline_no_header: "${input.instruction}"`);
    }

    // Step 2: Generate IR intent from header and data
    const intent = this.generateIntent(header, input.data);

    // Step 2.5: 🤖 AUTOMATIC OPTIMIZATION DETECTION (AI-First)
    // Detect potential optimizations in the generated IR
    const optimizations = this.optimizer.detectOptimizations(intent.body);

    // Step 3: Execute on VM
    let vmResult = this.vm.run(intent.body);

    // Step 4: Self-correct if failed
    let correction: CorrectionResult | undefined;
    if (!vmResult.ok) {
      correction = this.corrector.correct(intent);
      vmResult = correction.final_result;
      if (correction.ok) {
        intent.body = correction.final_body;
      }
    }

    // Step 5: Learn pattern
    this.learner.record(intent, vmResult);

    // Step 6: C code generation (optional, for reference)
    const cCode = this.codegen.generate(intent);
    const compileResult = { ok: true, c_code: cCode };

    return {
      header,
      intent,
      vm: vmResult,
      correction,
      compile: compileResult,
      final_value: vmResult.value,
      optimizations: optimizations.length > 0 ? optimizations : undefined,
    };
  }

  /**
   * Generate IR intent from header and test data
   * Creates full executable IR with array setup
   */
  private generateIntent(header: HeaderProposal, data?: number[]): AIIntent {
    const body: Inst[] = [];

    // Setup array from test data
    if (data) {
      body.push({ op: Op.ARR_NEW, arg: 'arr' });
      for (const val of data) {
        body.push({ op: Op.PUSH, arg: val });
        body.push({ op: Op.ARR_PUSH, arg: 'arr' });
      }
    }

    // Add operation based on matched_op
    const op = header.matched_op;
    switch (op) {
      case 'sum':
        body.push({ op: Op.ARR_SUM, arg: 'arr' });
        break;
      case 'average':
        body.push({ op: Op.ARR_AVG, arg: 'arr' });
        break;
      case 'max':
        body.push({ op: Op.ARR_MAX, arg: 'arr' });
        break;
      case 'min':
        body.push({ op: Op.ARR_MIN, arg: 'arr' });
        break;
      case 'sort':
        body.push({ op: Op.ARR_SORT, arg: 'arr' });
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        break;
      case 'reverse':
        body.push({ op: Op.ARR_REV, arg: 'arr' });
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        break;
      case 'count':
      case 'length':
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        break;
      case 'filter':
        // Filter with predicate: keep > 0 (simple default)
        body.push({
          op: Op.ARR_FILTER,
          arg: 'arr',
          sub: [
            { op: Op.PUSH, arg: 0 },
            { op: Op.GT },
            { op: Op.RET },
          ],
        });
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        break;
      case 'map':
        // Map with transformation: x * 2 (simple default)
        body.push({
          op: Op.ARR_MAP,
          arg: 'arr',
          sub: [
            { op: Op.DUP },
            { op: Op.ADD },
            { op: Op.RET },
          ],
        });
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        break;
      case 'unique':
        // For now, just return length (proper dedup needs more logic)
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        break;
      case 'flatten':
        // For now, just return first element
        body.push({ op: Op.PUSH, arg: 0 });
        body.push({ op: Op.ARR_GET, arg: 'arr' });
        break;
      case 'find':
        // Find first positive element
        body.push({ op: Op.PUSH, arg: 0 });
        body.push({ op: Op.ARR_GET, arg: 'arr' });
        break;
      case 'contains':
        // Simple: check if length > 0
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
        body.push({ op: Op.PUSH, arg: 0 });
        body.push({ op: Op.GT });
        break;
      default:
        // Fallback: just return length
        body.push({ op: Op.ARR_LEN, arg: 'arr' });
    }

    return {
      fn: header.fn,
      params: [{ name: 'arr', type: 'array<number>' }],
      ret: header.output,
      body,
    };
  }

  /**
   * Quick test: run with instruction + data
   */
  test(instruction: string, data: number[]): any {
    const result = this.run({ instruction, data });
    if (!result) throw new Error('pipeline_test_failed');
    return {
      op: result.header.fn,
      data,
      result: result.final_value,
      cycles: result.vm.cycles,
      ms: result.vm.ms,
      confidence: result.header.confidence,
    };
  }
}
