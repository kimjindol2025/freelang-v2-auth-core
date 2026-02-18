# Code Generator API

## Overview

The Code Generator module transforms the Abstract Syntax Tree (AST) into Intermediate Representation (IR), machine code, or target language code (C, LLVM, etc.). It handles multiple output targets and applies optimizations based on directives.

**Version**: v2.0.0
**Module**: `src/codegen`
**Key Features**:
- IR generation for VM execution
- C code generation with SIMD optimization
- LLVM code generation for native compilation
- Module linking and symbol resolution
- Memory-aware code generation

---

## Architecture

```
AST
 ↓
IR Generator (stack-based bytecode)
 ↓
├─ IR (for VM execution)
├─ C Generator (native code)
├─ LLVM Emitter (LLVM IR)
└─ Async Codegen (async/await support)
```

---

## Core Classes

### IRGenerator

Transforms AST into Intermediate Representation (IR) instructions.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `generateIR(ast: ASTNode): Inst[]`

Generates IR instructions from an AST node.

**Parameters**:
- `ast` (ASTNode): AST to transform

**Returns**: `Inst[]` - Array of IR instructions

**Features**:
- Recursive AST traversal
- Stack-based instruction generation
- Automatic HALT instruction
- Support for all expression types

**Example**:
```typescript
import { IRGenerator } from './ir-generator';

const generator = new IRGenerator();

// Simple arithmetic: 1 + 2
const ast = {
  type: 'binary',
  operator: '+',
  left: { type: 'literal', value: 1, dataType: 'number' },
  right: { type: 'literal', value: 2, dataType: 'number' }
};

const instructions = generator.generateIR(ast);
// Result:
// [
//   { op: Op.PUSH, arg: 1 },
//   { op: Op.PUSH, arg: 2 },
//   { op: Op.ADD },
//   { op: Op.HALT }
// ]
```

---

##### `generateModuleIR(module: Module): Inst[]`

Generates IR for an entire module with imports/exports.

**Parameters**:
- `module` (Module): Complete module AST

**Returns**: `Inst[]` - Module-level IR instructions

**Features**:
- Processes import statements
- Collects exported symbols
- Generates module linking code
- Maintains symbol resolution context

**Example**:
```typescript
const module = {
  imports: [
    { type: 'import', from: './math.fl', imports: [{ name: 'add' }] }
  ],
  statements: [
    // Module statements
  ],
  exports: []
};

const instructions = generator.generateModuleIR(module);
```

---

### CGenerator

Generates optimized C code from function proposals.

#### Static Methods

##### `generateCode(proposal: HeaderProposal): GeneratedCode`

Generates C code for a function operation.

**Parameters**:
- `proposal` (HeaderProposal): Function signature and metadata

**Returns**: `GeneratedCode` - Generated C code with metadata

**Features**:
- Operation-specific code templates (sum, average, max, min, filter, sort)
- SIMD optimization detection
- Memory profile analysis
- Include dependency tracking
- Directive-based optimization selection

**Example**:
```typescript
import { CGenerator } from './c-generator';

const proposal = {
  operation: 'sum',
  inputType: 'array<number>',
  outputType: 'number',
  directive: 'vectorized'
};

const result = CGenerator.generateCode(proposal);
console.log(result.cCode);
// Output: C function for array sum with SIMD optimization

console.log(result.includes);
// Output: ['#include <immintrin.h>'] for SIMD headers

console.log(result.memoryProfile);
// Output: { heapUsage: '8KB', stackUsage: '256B' }
```

---

##### `generateWithSIMD(code: string, loopBody: string): string`

Applies SIMD optimization to loop code.

**Parameters**:
- `code` (string): Original C code
- `loopBody` (string): Loop body to optimize

**Returns**: `string` - SIMD-optimized C code

**Features**:
- Vector instruction generation
- Data type adaptation
- Register allocation

---

### SIMDDetector

Detects opportunities for SIMD optimization.

#### Static Methods

##### `canVectorize(operation: string, dataType: string): boolean`

Checks if an operation can be vectorized.

**Parameters**:
- `operation` (string): Operation name (sum, map, filter, etc.)
- `dataType` (string): Data type (number, float, etc.)

**Returns**: `boolean`

**Example**:
```typescript
const canVectorize = SIMDDetector.canVectorize('sum', 'number');
// Output: true

const canVectorize2 = SIMDDetector.canVectorize('filter', 'struct');
// Output: false
```

---

##### `detectVectorWidth(dataType: string): number`

Determines optimal vector width for data type.

**Parameters**:
- `dataType` (string): Data type

**Returns**: `number` - Number of elements per vector

**Example**:
```typescript
const width = SIMDDetector.detectVectorWidth('number'); // 4 (AVX)
const width2 = SIMDDetector.detectVectorWidth('float');  // 8 (AVX)
```

---

### SIMDEmitter

Generates SIMD instructions for vectorized operations.

#### Static Methods

##### `emitVectorSum(dataType: string, vectorWidth: number): string`

Generates vectorized sum operation.

**Example**:
```typescript
const simdCode = SIMDEmitter.emitVectorSum('number', 4);
// Generates: __m128d _mm_add_pd(a, b) instructions
```

---

## Interfaces

### Inst (Instruction)

Single IR instruction.

```typescript
interface Inst {
  op: Op;                           // Operation code
  arg?: number | string | number[]; // Argument (depends on op)
  sub?: Inst[];                     // Sub-program (for MAP, FILTER, CALL)
}
```

**Example**:
```typescript
const pushInst: Inst = { op: Op.PUSH, arg: 42 };
const addInst: Inst = { op: Op.ADD };
const callInst: Inst = { op: Op.CALL, arg: 'add', sub: [/* body */] };
```

---

### Op (Opcode)

Enumeration of all IR operations.

```typescript
enum Op {
  // Stack operations
  PUSH, POP, DUP, SWAP,

  // Arithmetic
  ADD, SUB, MUL, DIV, MOD, NEG,

  // Comparison
  EQ, NEQ, LT, GT, LTE, GTE,

  // Logic
  AND, OR, NOT,

  // Variables
  STORE, LOAD,

  // Control flow
  JMP, JMP_IF, JMP_NOT, CALL, RET, HALT,

  // Array operations
  ARR_NEW, ARR_PUSH, ARR_GET, ARR_SET, ARR_LEN,
  ARR_SUM, ARR_AVG, ARR_MAX, ARR_MIN,
  ARR_MAP, ARR_FILTER, ARR_SORT, ARR_REV,

  // String operations
  STR_NEW, STR_LEN, STR_AT, STR_SUB, STR_CONCAT,

  // Lambda & Closure
  LAMBDA_NEW, LAMBDA_CAPTURE, LAMBDA_SET_BODY,

  // Threading
  SPAWN_THREAD, JOIN_THREAD, MUTEX_CREATE, MUTEX_LOCK,
  CHANNEL_CREATE, CHANNEL_SEND, CHANNEL_RECV,

  // Debug
  DUMP, COMMENT
}
```

---

### AIIntent

Intent specification from AI.

```typescript
interface AIIntent {
  fn: string;              // Function name
  params: Param[];         // Input parameters
  ret: string;            // Return type
  body: Inst[];           // IR instructions
  meta?: Record<string, unknown>;
}

interface Param {
  name: string;           // Parameter name
  type: string;           // Type: number, array, bool, string
}
```

**Example**:
```typescript
const intent: AIIntent = {
  fn: 'sum',
  params: [
    { name: 'arr', type: 'array<number>' }
  ],
  ret: 'number',
  body: [
    { op: Op.PUSH, arg: 0 },        // initial sum = 0
    { op: Op.ARR_SUM },              // sum all elements
    { op: Op.HALT }
  ]
};
```

---

### GeneratedCode

Generated target-language code.

```typescript
interface GeneratedCode {
  operation: string;           // Operation name
  cCode: string;              // Generated C code
  includes: string[];         // Required #include statements
  dependencies: string[];     // Function dependencies
  memoryProfile: {
    heapUsage: string;        // Heap memory needed
    stackUsage: string;       // Stack memory needed
  };
}
```

---

### ModuleLinkContext

Symbol resolution context for modules.

```typescript
interface ModuleLinkContext {
  importedSymbols: Map<string, string>;  // Symbol name → import path
  exportedSymbols: Map<string, string>;  // Symbol name → type
  moduleResolver?: any;                   // Module resolver instance
}
```

---

## Usage Examples

### Generate IR from Simple Expression

```typescript
import { IRGenerator } from './ir-generator';

const generator = new IRGenerator();

// Expression: x = 5 + 3
const ast = {
  type: 'assignment',
  target: 'x',
  value: {
    type: 'binary',
    operator: '+',
    left: { type: 'literal', value: 5, dataType: 'number' },
    right: { type: 'literal', value: 3, dataType: 'number' }
  }
};

const instructions = generator.generateIR(ast);
instructions.forEach((inst, i) => {
  console.log(`${i}: ${inst.op} ${inst.arg || ''}`);
});
// Output:
// 0: PUSH 5
// 1: PUSH 3
// 2: ADD
// 3: STORE x
// 4: HALT
```

---

### Generate C Code with SIMD

```typescript
import { CGenerator, SIMDDetector } from './codegen';

// Check if vectorization is possible
if (SIMDDetector.canVectorize('sum', 'number')) {
  const proposal = {
    operation: 'sum',
    inputType: 'array<number>',
    outputType: 'number',
    directive: 'vectorized'
  };

  const result = CGenerator.generateCode(proposal);
  console.log(result.cCode);
  console.log('Includes:', result.includes);
  console.log('Memory:', result.memoryProfile);
}
```

**Output**:
```c
// SIMD-optimized sum
__m128d sum_vec = _mm_setzero_pd();
for (int i = 0; i < n; i += 2) {
  sum_vec = _mm_add_pd(sum_vec, _mm_loadu_pd(&arr[i]));
}
// Horizontal sum
double result = ((double*)&sum_vec)[0] + ((double*)&sum_vec)[1];
```

---

### Generate Module IR with Imports

```typescript
import { IRGenerator } from './ir-generator';

const module = {
  imports: [
    {
      type: 'import',
      from: './math.fl',
      imports: [{ name: 'sqrt' }, { name: 'pow' }]
    }
  ],
  statements: [
    // Module code
  ],
  exports: [
    {
      type: 'export',
      declaration: { type: 'function', name: 'hypotenuse', ... }
    }
  ]
};

const generator = new IRGenerator();
const instructions = generator.generateModuleIR(module);

// Result includes:
// - Import binding instructions
// - Module statements
// - Export symbol collection
// - HALT instruction
```

---

## Common Patterns

### Pattern 1: IR to Machine Code Pipeline

```typescript
function compileToMachine(ast: ASTNode): string {
  // Step 1: Generate IR
  const generator = new IRGenerator();
  const ir = generator.generateIR(ast);

  // Step 2: Analyze and optimize
  const optimizer = new Optimizer();
  const optimized = optimizer.optimize(ir);

  // Step 3: Generate C code
  const cCode = emitC(optimized);

  // Step 4: Compile with GCC
  return compileC(cCode);
}
```

---

### Pattern 2: SIMD Detection and Optimization

```typescript
function generateOptimizedCode(
  operation: string,
  inputType: string,
  outputType: string
): GeneratedCode {
  // Detect if SIMD is applicable
  const directive = SIMDDetector.canVectorize(operation, inputType)
    ? 'vectorized'
    : 'scalar';

  // Generate code with appropriate directive
  const proposal = { operation, inputType, outputType, directive };
  return CGenerator.generateCode(proposal);
}
```

---

### Pattern 3: Memory-Aware Code Generation

```typescript
function generateMemorySafe(
  operation: string,
  constraint: 'low-memory' | 'balanced' | 'fast'
): GeneratedCode {
  const directive = constraint === 'low-memory' ? 'inplace' : 'optimized';

  const result = CGenerator.generateCode({
    operation,
    directive,
    inputType: 'array<number>',
    outputType: 'array<number>'
  });

  console.log(`Memory usage: ${result.memoryProfile.heapUsage}`);
  return result;
}
```

---

## Instruction Execution Order

The generated IR follows stack-based execution:

```
For expression: (a + b) * 2

IR Instructions:
1. PUSH a        → stack: [a]
2. PUSH b        → stack: [a, b]
3. ADD           → stack: [a+b]
4. PUSH 2        → stack: [a+b, 2]
5. MUL           → stack: [(a+b)*2]
```

---

## Performance Characteristics

| Operation | IR Size | SIMD Speed | Memory |
|-----------|---------|-----------|--------|
| sum(array) | 5 inst | 4-8x faster | O(1) |
| map(fn) | 8 inst | 2-4x faster | O(n) |
| filter(pred) | 10 inst | 2-3x faster | O(n) |
| sort(array) | 12 inst | 1.5-2x faster | O(n) |

---

## Integration Points

```
Parser → AST
   ↓
SemanticAnalyzer → Types
   ↓
CodeGenerator → IR
   ↓
Optimizer → Optimized IR
   ↓
C/LLVM Emitter → Target Code
   ↓
GCC/Clang → Machine Code
```

---

## Best Practices

1. **Always validate AST before generation**: Invalid AST causes IR errors
2. **Check SIMD compatibility**: Not all operations benefit from vectorization
3. **Profile memory usage**: Use memoryProfile for resource-constrained environments
4. **Reuse generators**: Create once, use multiple times
5. **Track dependencies**: Import/export symbols for modular compilation

---

## Related Documentation

- [Semantic Analyzer](./semantic-analyzer.md) - Pre-codegen analysis
- [Type System](./type-system.md) - Type information
- [Optimizer](./optimizer.md) - IR optimization
- [Virtual Machine](./vm.md) - IR execution
- [Compiler Pipeline](../COMPILER-PIPELINE.md) - Full flow

---

**Last Updated**: 2026-02-18
**Status**: Production Ready (Phase 18+)
**Test Coverage**: 1,942+ tests passing ✅
