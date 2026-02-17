# Phase 5 Stage 3.3: Skeleton Functions - Plan

**Date**: 2026-02-17  
**Status**: 🚀 Starting Implementation  
**Goal**: Enable header-only function definition with auto-generated stubs

---

## Overview

**Stage 3.3** extends FreeLang to support "skeleton functions" - function definitions with only headers (no body). The system automatically:

1. Detects skeleton functions (body missing)
2. Generates reasonable stub implementations
3. Provides intent-based suggestions
4. Marks functions as "incomplete" for later refinement

### Key Innovation

**Before Stage 3.3**:
```freelang
fn calculate_tax
  input: income  # 본체 없음 = ERROR!
  output: number
```

**After Stage 3.3**:
```freelang
fn calculate_tax
  input: income
  output: number  # 본체 없음 = OK! Stub 자동 생성
  
# Generated stub body:
do
  # TODO: Implement calculate_tax
  # Input: income (type: number)
  # Output: number
  # Suggested logic: income * 0.1 (placeholder)
  return 0
```

---

## Current State Analysis

### ✅ Already Working
- Parser accepts functions without body (`body: undefined`)
- MinimalFunctionAST has optional `body` field
- HeaderProposal generated successfully
- Parser Stage 3 complete (optional keywords, etc.)

### ❌ Missing Components
1. **Skeleton Detection**: Recognize function without body
2. **Stub Generator**: Create placeholder implementation
3. **Intent Analysis**: Use intent to guide stub generation
4. **Auto-completion DB**: Store function signatures for context
5. **Incomplete Marking**: Tag functions needing completion

---

## Implementation Strategy

### Stage 3.3.1: Skeleton Detection (Day 1)

**Goal**: Identify skeleton functions and classify them

**New File**: `src/analyzer/skeleton-detector.ts` (150 LOC)

```typescript
export interface SkeletonInfo {
  isSkeleton: boolean;           // true if body missing
  functionName: string;
  inputType: string;
  outputType: string;
  intent?: string;
  completeness: number;          // 0.0 = header only, 1.0 = fully complete
  suggestions: string[];         // auto-completion hints
}

export class SkeletonDetector {
  detect(ast: MinimalFunctionAST): SkeletonInfo;
}
```

**Logic**:
- Check if `ast.body` is undefined
- Extract metadata (name, input, output, intent)
- Estimate completeness based on intent quality
- Generate suggestions

**Tests** (5):
1. Detects missing body
2. Extracts metadata correctly
3. Calculates completeness score
4. Generates domain-specific suggestions
5. Handles edge cases (empty intent, etc.)

---

### Stage 3.3.2: Stub Generator (Day 1-2)

**Goal**: Generate reasonable placeholder implementations

**New File**: `src/codegen/stub-generator.ts` (250 LOC)

```typescript
export interface StubOptions {
  generateComments: boolean;      // Add TODO comments
  includeLogging: boolean;        // Add debug logs
  useDataTypes: boolean;          // Return typed defaults
}

export interface GeneratedStub {
  code: string;                   // Generated stub body
  placeholders: string[];         // What needs completion
  confidence: number;             // 0.0-1.0 certainty
  reasoning: string;              // Why this stub
}

export class StubGenerator {
  generate(info: SkeletonInfo, options?: StubOptions): GeneratedStub;
}
```

**Stub Templates** (by output type):
- `number`: `return 0` or domain-specific default
- `string`: `return ""` or template
- `boolean`: `return false`
- `array<T>`: `return []`
- `unknown`: `return null`

**Intent-Based Enhancements**:
- "calculate tax" → `return input * 0.1`
- "sum array" → `return input.reduce((a,b) => a+b, 0)`
- "filter..." → `return input.filter(...)`

**Tests** (5):
1. Generates basic stubs (number, string, array)
2. Intent-aware generation
3. Preserves function signature
4. Includes helpful comments
5. Handles complex types

---

### Stage 3.3.3: Auto-Completion Context (Day 2)

**Goal**: Build context from existing function signatures

**New File**: `src/learning/skeleton-context.ts` (150 LOC)

```typescript
export interface FunctionSignature {
  name: string;
  input: string;
  output: string;
  intent?: string;
  category: 'math' | 'string' | 'array' | 'general';
}

export class SkeletonContext {
  addSignature(sig: FunctionSignature): void;
  getSimilar(name: string): FunctionSignature[];
  suggestImplementation(info: SkeletonInfo): string;
}
```

**Context Database**:
- Pre-populate with 50+ common functions
- Learn from codebase patterns
- Suggest similar functions as templates

**Tests** (3):
1. Loads predefined signatures
2. Finds similar functions
3. Suggests implementations

---

### Stage 3.3.4: E2E Integration (Day 3)

**Goal**: Full pipeline: Parser → Skeleton Detection → Stub Generation

**Modified Files**:
- `src/pipeline.ts`: Add skeleton handling
- `src/analyzer/body-analysis.ts`: Skip analysis for stubs
- `src/codegen/code-generator.ts`: Include stub in output

**Flow**:
```
.free code
    ↓
Parser (accepts body=undefined)
    ↓
SkeletonDetector (identifies skeleton)
    ↓
StubGenerator (creates placeholder)
    ↓
Pipeline (marks as incomplete)
    ↓
Output code + TODO markers
```

**Tests** (2):
1. E2E: Header → Stub → Output
2. Multiple skeletons in same file

---

## File Structure

### New Files (550 LOC total)

1. **src/analyzer/skeleton-detector.ts** (150 LOC)
   - `SkeletonInfo` interface
   - `SkeletonDetector` class

2. **src/codegen/stub-generator.ts** (250 LOC)
   - `StubOptions` interface
   - `GeneratedStub` interface
   - `StubGenerator` class with templates

3. **src/learning/skeleton-context.ts** (150 LOC)
   - `FunctionSignature` interface
   - `SkeletonContext` class
   - Predefined function database (50+ entries)

### Modified Files (100 LOC)

1. **src/pipeline.ts**: Add skeleton path
2. **src/analyzer/body-analysis.ts**: Skip for stubs
3. **src/codegen/code-generator.ts**: Mark incomplete

---

## Test Coverage: 15 Tests

### By Component

**SkeletonDetector** (5):
- Detects missing body
- Extracts metadata
- Calculates completeness
- Generates suggestions
- Handles edge cases

**StubGenerator** (5):
- Basic stubs (number, string, array)
- Intent-aware generation
- Preserves signature
- Adds comments
- Complex types

**SkeletonContext** (3):
- Loads signatures
- Finds similar
- Suggests implementation

**E2E** (2):
- Header → Stub → Output
- Multiple skeletons

---

## Success Criteria

✅ All 15 tests passing (100%)  
✅ Backward compatibility (1,963/1,967 existing tests still pass)  
✅ Skeleton functions parse without error  
✅ Stubs include helpful TODO markers  
✅ Intent-based suggestions work (5+ templates)  
✅ Auto-completion context functional  
✅ Performance < 5ms per skeleton  

---

## Example Usage

### Input (Stage 3.3)

```freelang
fn calculate_tax
  input: number
  output: number
  intent: "Calculate income tax at 15% rate"

fn filter_positive
  input: array<number>
  output: array<number>
  intent: "Filter array to keep only positive numbers"
```

### Output (After Stage 3.3)

```freelang
fn calculate_tax
  input: number
  output: number
  intent: "Calculate income tax at 15% rate"
  do
    # TODO: Implement calculate_tax
    # Input: number
    # Output: number
    # Suggested: income * 0.15
    return input * 0.15

fn filter_positive
  input: array<number>
  output: array<number>
  intent: "Filter array to keep only positive numbers"
  do
    # TODO: Implement filter_positive
    # Input: array<number>
    # Output: array<number>
    # Suggested: Use filter() method
    return input.filter(x => x > 0)
```

---

## Integration Points

**With Stage 3.2** (Variable Type Inference):
- Use inferred types for stub generation
- Better type-aware templates

**With Phase 4** (Multi-Source Type Inference):
- Intent analysis for better suggestions
- Domain knowledge for stubs

**With Phase 6+** (Learning & Feedback):
- Collect actual implementations
- Improve stub templates over time
- Track which stubs get completed

---

## Next Steps

### Day 1: Foundation
- [ ] Create SkeletonDetector
- [ ] Create StubGenerator basic templates
- [ ] Write 10 unit tests

### Day 2: Enhancement
- [ ] Intent-based templates (5+ patterns)
- [ ] SkeletonContext with signatures
- [ ] Write 5 more tests

### Day 3: Integration
- [ ] Update Pipeline
- [ ] E2E tests
- [ ] Final validation

---

## Acceptance Criteria

- [ ] 15/15 tests passing
- [ ] 1,963/1,967 existing tests still passing
- [ ] Skeleton functions generate stubs without error
- [ ] Intent-based suggestions working (5+ templates)
- [ ] Auto-completion context functional
- [ ] Performance < 5ms per skeleton
- [ ] Code well-documented
- [ ] Examples in docs

---

## Notes

- Stage 3.3 is **optional** but valuable for AI-first workflows
- Stubs are always overridable - not restrictive
- Intent field drives most of stub quality
- Can be enhanced later with ML-based suggestions
- Foundation for Phase 6+ learning system

---

## Architecture

### Before Stage 3.3

```
Parser → HeaderProposal → CodeGenerator
(body required)
```

### After Stage 3.3

```
Parser
  ├─ Has body? → Normal path → CodeGenerator
  └─ No body? → SkeletonDetector → StubGenerator → CodeGenerator
                                                     (marks incomplete)
```

---

## Timeline

| Phase | Days | Output | Tests |
|-------|------|--------|-------|
| 3.3.1 | 1 | SkeletonDetector | 5 |
| 3.3.2 | 1-2 | StubGenerator | 5 |
| 3.3.3 | 2 | SkeletonContext | 3 |
| 3.3.4 | 3 | E2E Integration | 2 |
| **Total** | **3** | **Complete** | **15** |

---

## Estimated Impact

| Metric | Value | Impact |
|--------|-------|--------|
| New LOC | ~550 | Moderate |
| Test Coverage | 15/15 (100%) | Perfect |
| Backward Compat | 99.8% | Excellent |
| Execution Time | < 5ms | Negligible |
| AI-Friendliness | ⬆️⬆️ | High |

---

## Related Issues

- Header-only functions currently error (will be fixed by Stage 3.3)
- Incomplete function detection (will be added)
- Auto-completion templates (will be added)

