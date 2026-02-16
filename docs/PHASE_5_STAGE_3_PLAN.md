# Phase 5 Stage 3: Grammar Extensions - AI-Friendly Syntax

**Date**: 2026-02-17
**Status**: 🚀 Starting Implementation
**Goal**: Make FreeLang more AI-friendly by removing required keywords while maintaining backward compatibility

---

## Overview

Stage 3 focuses on making FreeLang grammar more flexible to support AI-written code that may skip redundant keywords. The goal is to detect function structure implicitly and allow flexible syntax without sacrificing clarity.

### Key Changes
1. **Optional `fn` keyword**: Detect functions by structure (name + types pattern)
2. **Optional `input`/`output` keywords**: Detect by position and context
3. **Full variable type inference**: Infer types in all variable declarations
4. **Skeleton function support**: Header-only functions with auto-generated stubs

---

## Current State Analysis

### Parser.ts Structure
```typescript
parse() {
  // Line 118: MANDATORY fn keyword
  this.expect(TokenType.FN, 'Expected "fn" keyword');

  // Line 121: Function name
  const fnName = this.expect(TokenType.IDENT, 'Expected function name');

  // Line 126: MANDATORY input keyword
  this.expect(TokenType.INPUT, 'Expected "input" keyword');
  const inputType = this.parseOptionalType();

  // Line 133: MANDATORY output keyword
  this.expect(TokenType.OUTPUT, 'Expected "output" keyword');
  const outputType = this.parseOptionalType();

  // Line 141: Optional intent
  if (this.check(TokenType.INTENT)) { ... }

  // Line 157: Optional body
  if (this.check(TokenType.LBRACE)) { ... }
}
```

### Current Limitations
- ❌ `fn` keyword required
- ❌ `input` keyword required
- ❌ `output` keyword required
- ✅ `intent` optional (already supported)
- ✅ `body` optional (already supported)
- ⚠️ Variable type inference partial (comment/name based only)

---

## Implementation Strategy

### Phase 3.1: Optional `fn` Keyword (Week 1)

**Goal**: Allow `fn` keyword to be omitted while detecting functions by structure

**Approach**:
1. Create `detectFunctionStructure()` method
   - Heuristic: `IDENT` followed by `input`/output types → function
   - Fallback to `fn` keyword check
2. Modify `parse()` to be optional-aware:
   ```typescript
   // OLD: this.expect(TokenType.FN, 'Expected "fn" keyword');
   // NEW: Check for fn keyword, but make it optional if structure matches
   if (this.check(TokenType.FN)) {
     this.advance();
   } else {
     // Verify function structure before continuing
     if (!this.looksLikeFunction()) {
       throw ParseError('Expected function definition');
     }
   }
   ```

**Test Cases**:
```freelang
# With fn (backward compatible)
fn sum
  input: array<number>
  output: number

# Without fn (new)
sum
  input: array<number>
  output: number
```

**Files**:
- Modify: `src/parser/parser.ts` (parse method)
- Add: `src/parser/parser.ts` (detectFunctionStructure method)
- Add: `tests/phase-5-stage-3-grammar-fn.test.ts` (6 tests)

---

### Phase 3.2: Optional `input`/`output` Keywords (Week 1-2)

**Goal**: Allow `input:` and `output:` keywords to be inferred from position

**Approach**:
1. Create `parseImplicitSignature()` method
   - After function name, expect type annotations without keywords
   - Use positional parsing: first type = input, second type = output
2. Support mixed mode: `input: type` or just `type`

**Example Syntax**:
```freelang
# Old (with keywords)
fn sum
  input: array<number>
  output: number

# New (positional)
fn sum
  array<number>    # First position = input
  number           # Second position = output

# Mixed (partial keywords)
fn sum
  input array<number>    # Keyword but colon optional
  number                 # No keyword, positional
```

**Test Cases**:
```freelang
# Positional parameters
sum
  array<number>
  number

# Mixed
calculate
  input: number
  string
```

**Files**:
- Modify: `src/parser/parser.ts` (parseFunction method)
- Add: `src/parser/parser.ts` (parseImplicitSignature method)
- Add: `tests/phase-5-stage-3-grammar-keywords.test.ts` (8 tests)

---

### Phase 3.3: Full Variable Type Inference (Week 2)

**Goal**: Extend type inference to variable declarations in function bodies

**Current State**:
- Phase 4: Type inference from comments/names only (42.9% accuracy)
- Phase 5 Stage 1-2: Semantic analysis with 75%+ accuracy
- Stage 3: Use both for variable inference in bodies

**Approach**:
1. Extend `AdvancedTypeInferenceEngine` to analyze function bodies
2. When parsing variable declarations, attempt type inference:
   ```typescript
   // Currently:
   let x: number = 5;    // Type required

   // With Stage 3:
   let x = 5;            // Type inferred as number
   let arr = [];         // Type inferred as array<unknown>
   let total = 0;        // Type inferred as number (from assignment)
   ```

**Integration**:
- Use `AdvancedTypeInferenceEngine.infer()` on variable assignment
- If confidence > 0.70, allow omitted type
- If confidence < 0.70, warn user (but still allow)

**Test Cases**:
```freelang
fn process_array
  input: arr
  do
    total = 0              # Inferred: number (from = 0)
    for item in arr        # Inferred: item type from arr
      total = total + item # number + number → number
    return total
```

**Files**:
- Modify: `src/parser/parser.ts` (parseVariableDeclaration)
- Modify: `src/analyzer/ai-first-type-inference-engine.ts` (add variable inference)
- Add: `tests/phase-5-stage-3-variable-inference.test.ts` (8 tests)

---

### Phase 3.4: Skeleton Function Support (Week 2-3)

**Goal**: Allow header-only functions with auto-generated stubs

**Example**:
```freelang
# Header only (skeleton)
calculate_tax
  income: number
  country: string

# Auto-generates stub:
fn calculate_tax
  input: income number, country string
  output: number
  do
    # TODO: implement calculate_tax
    return 0  # Placeholder
```

**Approach**:
1. Create `StubGenerator` class
   - Generate placeholder body based on intent/name patterns
   - Use domain knowledge (tax → financial calculation)
   - Add `// TODO` marker for user completion
2. Detect skeleton functions (header without body)
   - If EOF after signature without body → skeleton
   - Auto-generate stub before compilation

**Test Cases**:
```freelang
# Skeleton (no body)
calculate
  input: number
  output: number

# Should auto-generate:
fn calculate
  input: number
  output: number
  do
    return 0  # Placeholder
```

**Files**:
- Add: `src/codegen/stub-generator.ts` (150 LOC, 10 methods)
- Modify: `src/parser/parser.ts` (detect skeleton)
- Add: `tests/phase-5-stage-3-skeleton-functions.test.ts` (6 tests)

---

## Implementation Roadmap

### Week 1: Foundation (Optional fn + Keywords)
- [ ] Implement `detectFunctionStructure()`
- [ ] Make `fn` keyword optional with fallback check
- [ ] Make `input`/`output` keywords optional
- [ ] Add 14 tests (6 + 8)
- [ ] Backward compatibility: all existing tests pass
- **Expected**: 150 LOC new, 80 LOC modified

### Week 2: Enhancement (Variable Inference + Skeleton)
- [ ] Extend `AdvancedTypeInferenceEngine` for variables
- [ ] Implement `StubGenerator`
- [ ] Add 14 tests (8 + 6)
- [ ] Integration with Stage 2 semantic analysis
- **Expected**: 250 LOC new, 120 LOC modified

### Week 3: Polish
- [ ] Grammar examples and documentation
- [ ] Edge case testing (mixed syntax, errors)
- [ ] Performance validation
- [ ] Final commit and merge

---

## Test Coverage Plan

### Test Categories

| Category | Tests | File |
|----------|-------|------|
| Optional fn keyword | 6 | phase-5-stage-3-grammar-fn.test.ts |
| Optional input/output | 8 | phase-5-stage-3-grammar-keywords.test.ts |
| Variable type inference | 8 | phase-5-stage-3-variable-inference.test.ts |
| Skeleton functions | 6 | phase-5-stage-3-skeleton-functions.test.ts |
| **Total** | **28** | **4 new test files** |

### Test Examples

#### Backward Compatibility
```typescript
test('fn keyword still works (backward compat)', () => {
  const code = `fn sum input: array<number> output: number`;
  const ast = parser.parse(code);
  expect(ast.fnName).toBe('sum');
  expect(ast.inputType).toBe('array<number>');
});

test('optional fn keyword works', () => {
  const code = `sum input: array<number> output: number`;
  const ast = parser.parse(code);
  expect(ast.fnName).toBe('sum');
});
```

#### Variable Inference
```typescript
test('number literal infers as number', () => {
  const code = `
    fn process input: number output: number
    do
      total = 0
      return total
  `;
  const ast = parser.parse(code);
  expect(ast.variableTypes.total).toBe('number');
});

test('array literal infers as array', () => {
  const code = `
    fn create_list input: any output: array
    do
      items = []
      return items
  `;
  const ast = parser.parse(code);
  expect(ast.variableTypes.items).toContain('array');
});
```

#### Skeleton Functions
```typescript
test('skeleton function gets stub generated', () => {
  const code = `
    calculate_tax
      income: number
      country: string
  `;
  const ast = parser.parse(code);
  expect(ast.body).toBeDefined();
  expect(ast.body).toContain('TODO');
});
```

---

## Backward Compatibility

**Critical**: All existing tests must pass with no modifications

- Phase 4 tests: 1,824 tests (must still pass)
- Existing parser tests: 70 tests (must still pass)
- New grammar tests: 28 tests (new)

**Strategy**:
1. Use optional parsing: `match(TokenType.FN)` instead of `expect()`
2. Fallback logic: if no `fn`, check structure
3. Clear error messages: if neither `fn` nor structure matches

---

## Success Criteria

✅ All 1,852 existing tests still pass (1,824 + 28)
✅ New grammar features work: optional fn, input/output, variable inference, stubs
✅ Backward compatible: all old syntax still works
✅ Error messages clear and helpful
✅ Documentation complete with examples
✅ No performance regression (< 2ms per function)

---

## Example Progression

### Before Stage 3
```freelang
fn sum
  input: arr
  output: number
  do
    total: number = 0
    for i in arr
      total = total + i
    return total
```

### After Stage 3
```freelang
# Complete flexibility
sum                    # No fn keyword
  arr                 # No input: keyword
  number              # No output: keyword (positional)
  do
    total = 0         # Type inferred as number
    for i in arr      # Type inferred from arr
      total += i      # ✅ Works
    return total
```

---

## Next Steps

1. **Week 1 Start**: Implement optional `fn` keyword detection
2. **Week 1-2**: Implement optional `input`/`output` keywords
3. **Week 2**: Implement variable type inference
4. **Week 3**: Implement skeleton function support
5. **Final**: Commit all changes, run full test suite

---

## Notes

- This stage builds on Phase 5 Stage 2's semantic analysis
- The goal is to make FreeLang more accessible to AI-written code
- All changes are backward compatible (optional, not required)
- Performance should remain < 2ms per function
- Error handling: clear messages when grammar is ambiguous

---

## Files to Modify

| File | Changes | LOC |
|------|---------|-----|
| parser.ts | Optional fn/input/output, variable inference | +180 |
| ai-first-type-inference-engine.ts | Variable type inference | +100 |
| stub-generator.ts | NEW - stub generation | +150 |
| Tests (4 files) | NEW - comprehensive tests | +250 |

**Total**: ~680 LOC new + 280 LOC modified = 960 LOC

---

## Questions for User

1. Should skeleton functions warn if no body? (Yes: "TODO" comment)
2. Should variable type inference show confidence? (Yes: comment)
3. Should errors show both old/new syntax? (Yes: helpful)
