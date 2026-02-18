# Optimizer API

## Overview

The Optimizer module analyzes and optimizes Intermediate Representation (IR) to improve performance. It uses AI-driven techniques to automatically detect optimization opportunities, apply transformations with confidence scoring, and track optimization effectiveness.

**Version**: v2.0.0
**Module**: `src/analyzer`, `src/phase-14-llvm`
**Key Features**:
- Automatic optimization detection (AI-driven)
- Multiple optimization passes (constant folding, DCE, strength reduction, etc.)
- Confidence-based decision making
- Learning-aware optimization
- Risk assessment and management

---

## Philosophy

Instead of hard-coding optimization logic, FreeLang **detects IR patterns automatically** and makes **data-driven decisions** about applying them:

```
IR Analysis
    ↓
[Detector] → Find patterns
    ↓
[Suggestions] → What could be optimized?
    ↓
[Applier] → Should we apply this?
    ↓
[Tracker] → Did it work? Learn for next time
```

---

## Core Classes

### OptimizationDetector

Automatically detects optimization opportunities in IR.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `detectOptimizations(instructions: Inst[]): OptimizationSuggestion[]`

Analyzes IR and returns all detected optimization opportunities.

**Parameters**:
- `instructions` (Inst[]): IR instruction array

**Returns**: `OptimizationSuggestion[]` - Sorted by confidence (highest first)

**Detection Types**:
1. **Constant Folding** - Pre-compute constant expressions
2. **Dead Code Elimination (DCE)** - Remove unused assignments
3. **Strength Reduction** - Replace expensive operations with cheaper ones
4. **Loop Unrolling** - Replicate loop body to reduce iterations
5. **Common Subexpression Elimination (CSE)** - Cache repeated computations

**Example**:
```typescript
import { OptimizationDetector } from './optimization-detector';

const detector = new OptimizationDetector();

// IR: PUSH 5, PUSH 3, ADD (should be PUSH 8)
const instructions = [
  { op: Op.PUSH, arg: 5 },
  { op: Op.PUSH, arg: 3 },
  { op: Op.ADD }
];

const suggestions = detector.detectOptimizations(instructions);
console.log(suggestions[0]);
// Output: {
//   type: 'constant_folding',
//   confidence: 0.95,
//   expected_improvement: 10,
//   reasoning: [
//     'Detected constant expression: 5 + 3',
//     'Can be pre-computed at compile time → result: 8'
//   ],
//   before: [PUSH 5, PUSH 3, ADD],
//   after: [PUSH 8]
// }
```

---

##### `detectConstantFolding(instructions: Inst[]): OptimizationSuggestion[]`

Detects constant expressions that can be computed at compile-time.

**Pattern**: `PUSH a, PUSH b, [OP]` where both are constants

**Example**:
```
PUSH 10
PUSH 20
MUL
→ PUSH 200
```

---

##### `detectDeadCode(instructions: Inst[]): OptimizationSuggestion[]`

Detects unused variables and unreachable code.

**Pattern**: Assignment with no subsequent usage

**Example**:
```
LOAD x
PUSH 5    ← No usage of x after this
HALT
→ Remove LOAD x
```

---

##### `detectStrengthReduction(instructions: Inst[]): OptimizationSuggestion[]`

Detects expensive operations that can be replaced with cheaper ones.

**Pattern**: `MUL by power of 2` → `SHL (bit shift)`

**Example**:
```
PUSH x
PUSH 8
MUL       ← Multiply by 8 (expensive)
→ Replace with SHL (3 bits) - much faster
```

---

##### `detectLoopUnrolling(instructions: Inst[]): OptimizationSuggestion[]`

Detects loops that benefit from unrolling.

**Criteria**:
- Loop body is small (<5 instructions)
- Iteration count is known or limited
- No complex dependencies

---

### OptimizationApplier

Makes AI-driven decisions about which optimizations to apply.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `decide(suggestion: OptimizationSuggestion, learningHistory?: PatternEntry[]): OptimizationDecision`

Decides whether to apply an optimization based on multiple factors.

**Parameters**:
- `suggestion` (OptimizationSuggestion): Proposed optimization
- `learningHistory` (PatternEntry[], optional): Historical success data

**Returns**: `OptimizationDecision` - Application decision with reasoning

**Decision Factors** (weighted):
1. **Confidence** (35%): How reliable is the suggestion?
2. **Improvement** (25%): How much performance gain is expected?
3. **Risk** (20%): What's the risk of side effects?
4. **History** (15%): Did similar optimizations work before?
5. **Complexity** (5%): How much complexity does it add?

**Example**:
```typescript
import { OptimizationApplier } from './optimization-applier';

const applier = new OptimizationApplier();

const suggestion: OptimizationSuggestion = {
  type: 'constant_folding',
  confidence: 0.95,
  expected_improvement: 10,
  instruction_indices: [0, 1, 2],
  reasoning: ['Can fold 5 + 3 to 8'],
  before: [PUSH 5, PUSH 3, ADD]
};

const decision = applier.decide(suggestion);
console.log(decision);
// Output: {
//   suggestion: {...},
//   shouldApply: true,
//   confidence: 0.92,
//   reasoning: [
//     '1. Suggestion confidence: 95%',
//     '2. Expected improvement: MEDIUM (10%)',
//     '3. Risk level: SAFE (no side effects)',
//     '4. Decision: APPLY (score: 0.92)'
//   ],
//   riskLevel: 'safe'
// }
```

---

##### `apply(decision: OptimizationDecision, instructions: Inst[]): Inst[]`

Applies an optimization decision to IR instructions.

**Parameters**:
- `decision` (OptimizationDecision): Apply decision from decide()
- `instructions` (Inst[]): IR to optimize

**Returns**: `Inst[]` - Optimized IR

**Example**:
```typescript
const decision = applier.decide(suggestion);

if (decision.shouldApply) {
  const optimized = applier.apply(decision, instructions);
  console.log(`Applied: ${suggestion.type}`);
  console.log(`Size reduction: ${instructions.length} → ${optimized.length}`);
}
```

---

### OptimizationTracker

Tracks optimization success and learns from results.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `record(suggestion: OptimizationSuggestion, applied: boolean, actualImprovement: number): void`

Records optimization application result for learning.

**Parameters**:
- `suggestion` (OptimizationSuggestion): Applied optimization
- `applied` (boolean): Was it actually applied?
- `actualImprovement` (number): Measured performance improvement %

**Example**:
```typescript
import { OptimizationTracker } from './optimization-tracker';

const tracker = new OptimizationTracker();

// After applying and measuring performance
const actualImprovement = 9.5; // Measured 9.5% improvement
tracker.record(suggestion, true, actualImprovement);
```

---

##### `getLearningHistory(): PatternEntry[]`

Returns historical data for decision-making.

**Returns**: `PatternEntry[]` - Success/failure history

**Example**:
```typescript
const history = tracker.getLearningHistory();
history.forEach(entry => {
  const successRate = entry.success_count / (entry.success_count + entry.fail_count);
  console.log(`${entry.fn}: ${(successRate * 100).toFixed(1)}% success rate`);
});
```

---

## Interfaces

### OptimizationSuggestion

Proposed optimization detected by analyzer.

```typescript
interface OptimizationSuggestion {
  type: 'constant_folding' | 'inlining' | 'dce' | 'loop_unroll' | 'strength_reduction';
  confidence: number;              // 0.0-1.0 (how certain is this optimization valid?)
  expected_improvement: number;    // % performance gain expected (0-100)
  instruction_indices: number[];   // Which instructions to optimize
  reasoning: string[];             // Explanation of the optimization
  before: Inst[];                  // Original instructions
  after?: Inst[];                  // Optimized instructions
}
```

**Example**:
```typescript
const suggestion: OptimizationSuggestion = {
  type: 'constant_folding',
  confidence: 0.95,
  expected_improvement: 15,
  instruction_indices: [2, 3, 4],
  reasoning: [
    'Detected: arr[0] is always 42 (constant)',
    'Can replace all arr[0] accesses with 42',
    'Saves array indexing overhead'
  ],
  before: [
    { op: Op.LOAD, arg: 'arr' },
    { op: Op.PUSH, arg: 0 },
    { op: Op.ARR_GET }
  ],
  after: [
    { op: Op.PUSH, arg: 42 }
  ]
};
```

---

### OptimizationDecision

AI decision about whether to apply an optimization.

```typescript
interface OptimizationDecision {
  suggestion: OptimizationSuggestion;      // The optimization to apply
  shouldApply: boolean;                    // Should we apply it?
  confidence: number;                      // Confidence in this decision (0.0-1.0)
  reasoning: string[];                     // Why this decision?
  riskLevel: 'safe' | 'moderate' | 'risky'; // Risk assessment
}
```

**Risk Levels**:
- **safe** (0.95-1.0): No side effects, always safe
- **moderate** (0.7-0.95): Usually safe, edge cases possible
- **risky** (<0.7): Potential issues, apply with caution

---

### PatternEntry

Learning history entry.

```typescript
interface PatternEntry {
  fn: string;                      // Function name
  params_hash: string;             // Parameter type hash
  body_hash: string;               // IR body hash
  success_count: number;           // Times optimization worked
  fail_count: number;              // Times optimization failed
  avg_cycles: number;              // Average cycles saved
  last_used: number;               // Unix timestamp (ms)
}
```

---

## Usage Examples

### Complete Optimization Pipeline

```typescript
import { Optimizer } from './optimizer';

const optimizer = new Optimizer();

// Original IR
const instructions = [
  { op: Op.PUSH, arg: 5 },
  { op: Op.PUSH, arg: 3 },
  { op: Op.ADD },           // 5 + 3 = 8
  { op: Op.STORE, arg: 'x' },
  { op: Op.HALT }
];

// Step 1: Detect optimizations
const suggestions = optimizer.detect(instructions);
console.log(`Found ${suggestions.length} optimization opportunities`);

// Step 2: Decide which to apply
const decisions = suggestions.map(s => optimizer.decide(s));
const toApply = decisions.filter(d => d.shouldApply);
console.log(`Will apply ${toApply.length} optimizations`);

// Step 3: Apply optimizations
let optimized = instructions;
for (const decision of toApply) {
  optimized = optimizer.apply(decision, optimized);
}

// Result:
// [
//   { op: Op.PUSH, arg: 8 },        // Folded from 5 + 3
//   { op: Op.STORE, arg: 'x' },
//   { op: Op.HALT }
// ]
```

---

### Optimization with Learning

```typescript
const optimizer = new Optimizer();
const tracker = optimizer.tracker;

// Get historical data
const history = tracker.getLearningHistory();

// Make decisions using history
const decision = optimizer.decide(suggestion, history);

// Apply optimization
const optimized = optimizer.apply(decision, ir);

// Measure actual improvement
const beforeSize = ir.length;
const afterSize = optimized.length;
const improvement = ((beforeSize - afterSize) / beforeSize) * 100;

// Record for learning
tracker.record(suggestion, decision.shouldApply, improvement);
```

---

### Risk-Based Optimization Selection

```typescript
const suggestions = detector.detectOptimizations(ir);

// Apply only safe optimizations
const safeOpts = suggestions.filter(s => {
  const decision = applier.decide(s);
  return decision.riskLevel === 'safe' && decision.shouldApply;
});

console.log(`Applying ${safeOpts.length} safe optimizations`);

// Apply risky optimizations only if benefit is high
const riskyOpts = suggestions.filter(s => {
  const decision = applier.decide(s);
  return decision.riskLevel === 'risky' &&
         s.expected_improvement >= 20 &&
         decision.shouldApply;
});

console.log(`Applying ${riskyOpts.length} risky optimizations (high benefit only)`);
```

---

## Optimization Types

### 1. Constant Folding

**Before**:
```
PUSH 10
PUSH 20
ADD
```

**After**:
```
PUSH 30
```

**Benefit**: Eliminates runtime computation

---

### 2. Dead Code Elimination

**Before**:
```
PUSH 42
STORE x    ← x is never used
PUSH 100
```

**After**:
```
PUSH 100
```

**Benefit**: Reduces instruction count and memory

---

### 3. Strength Reduction

**Before**:
```
PUSH x
PUSH 8
MUL        ← Multiply is slow
```

**After**:
```
PUSH x
PUSH 3
SHL        ← Bit shift is fast
```

**Benefit**: 2-3x faster execution

---

### 4. Common Subexpression Elimination

**Before**:
```
LOAD arr
PUSH 0
ARR_GET    ← arr[0]
...use it...
LOAD arr
PUSH 0
ARR_GET    ← arr[0] again
...use it...
```

**After**:
```
LOAD arr
PUSH 0
ARR_GET    ← arr[0]
DUP        ← Duplicate on stack
...use it...
...use it...
```

**Benefit**: Eliminates redundant computation

---

### 5. Loop Unrolling

**Before**:
```
LOOP 4 {
  PUSH 1
  ADD
}
```

**After**:
```
PUSH 1
ADD
PUSH 1
ADD
PUSH 1
ADD
PUSH 1
ADD
```

**Benefit**: Reduces loop overhead (for small loops)

---

## Performance Metrics

| Optimization | Speed | Safety | Use Case |
|--------------|-------|--------|----------|
| Constant Folding | 10-20% | Very Safe | Always apply |
| Dead Code Elim | 5-10% | Safe | Always apply |
| Strength Reduction | 20-50% | Safe | Most cases |
| Loop Unrolling | 10-30% | Moderate | Small loops |
| CSE | 10-40% | Moderate | Repeated expressions |

---

## Best Practices

1. **Enable safe optimizations by default**: Constant folding, DCE have no downside
2. **Be conservative with risky optimizations**: Apply only if benefit >> risk
3. **Profile before and after**: Verify actual improvement
4. **Use learning history**: Let past results guide decisions
5. **Balance speed and code size**: Some optimizations increase size

---

## Related Documentation

- [Code Generator](./code-generator.md) - IR generation
- [Virtual Machine](./vm.md) - IR execution
- [Compiler Pipeline](../COMPILER-PIPELINE.md) - Full flow

---

**Last Updated**: 2026-02-18
**Status**: Production Ready (Phase 5+)
**Test Coverage**: 1,942+ tests passing ✅
