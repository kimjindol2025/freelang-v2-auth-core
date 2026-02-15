/**
 * Phase 5: v1 코드 통합 테스트
 *
 * .free 파일 파싱 → HeaderProposal → Pipeline 통합
 */
import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';
import { astToProposal, proposalToString } from '../src/bridge/ast-to-proposal';

describe('Phase 5: v1 코드 통합 (.free 파일 파싱)', () => {
  // ============================================================================
  // PART 1: Lexer 토큰 확장 테스트
  // ============================================================================
  describe('Lexer: INPUT, OUTPUT, INTENT 토큰', () => {
    test('INPUT 키워드 인식', () => {
      const lexer = new Lexer('input');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('INPUT');
    });

    test('OUTPUT 키워드 인식', () => {
      const lexer = new Lexer('output');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('OUTPUT');
    });

    test('INTENT 키워드 인식', () => {
      const lexer = new Lexer('intent');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('INTENT');
    });

    test('기본 .free 파일 토큰화', () => {
      const code = `
        fn sum
        input: array<number>
        output: number
        intent: "배열 합산"
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // FN, IDENT, INPUT, COLON, IDENT, LT, IDENT, GT,
      // OUTPUT, COLON, IDENT, INTENT, COLON, STRING, EOF
      const types = tokens.map((t) => t.type);

      expect(types).toContain('FN');
      expect(types).toContain('INPUT');
      expect(types).toContain('OUTPUT');
      expect(types).toContain('INTENT');
      expect(types[types.length - 1]).toBe('EOF');
    });
  });

  // ============================================================================
  // PART 2: Parser 기본 파싱 테스트
  // ============================================================================
  describe('Parser: .free 파일 파싱', () => {
    test('최소 .free 형식 파싱', () => {
      const code = `fn sum
input: array<number>
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBeUndefined();
    });

    test('Phase 5: 한 줄 형식 파싱 (세미콜론/줄바꿈 선택적)', () => {
      // Phase 5 AI-First: 한 줄에 모든 것을 쓸 수 있게
      const code = `fn sum input: array<number> output: number intent: "배열 합산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('배열 합산');
    });

    test('Phase 5: 데코레이터 + 한 줄 형식', () => {
      const code = `@minimal fn sum input: array<number> output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('sum');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
    });

    test('intent 포함한 .free 파싱', () => {
      const code = `fn average
input: array<number>
output: number
intent: "배열 평균 계산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('average');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('number');
      expect(ast.intent).toBe('배열 평균 계산');
    });

    test('@minimal decorator 파싱', () => {
      const code = `@minimal
fn sum
input: array<number>
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.decorator).toBe('minimal');
      expect(ast.fnName).toBe('sum');
    });

    test('제네릭 타입 파싱 (map)', () => {
      const code = `fn transform
input: array<number>
output: array<number>`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('transform');
      expect(ast.inputType).toBe('array<number>');
      expect(ast.outputType).toBe('array<number>');
    });

    test('중첩 제너릭 타입 파싱 (nested generics)', () => {
      const code = `fn matrixSum
input: array<array<number>>
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.fnName).toBe('matrixSum');
      expect(ast.inputType).toBe('array<array<number>>');
      expect(ast.outputType).toBe('number');
    });

    test('배열 타입 축약형 파싱', () => {
      const code = `fn count
input: [number]
output: int`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);

      expect(ast.inputType).toBe('[number]');
    });

    test('파싱 에러: missing input', () => {
      const code = `fn sum
output: number`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);

      expect(() => parseMinimalFunction(buffer)).toThrow('Expected "input:" keyword');
    });

    test('파싱 에러: missing output', () => {
      const code = `fn sum
input: array<number>`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);

      expect(() => parseMinimalFunction(buffer)).toThrow('Expected "output:" keyword');
    });
  });

  // ============================================================================
  // PART 3: AST to HeaderProposal 브릿지 테스트
  // ============================================================================
  describe('Bridge: AST → HeaderProposal', () => {
    test('기본 변환', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.fn).toBe('sum');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.confidence).toBe(0.98); // v1 파서이므로 매우 높음
    });

    test('동작 추론: intent에서', () => {
      const code = `fn foo
input: array<number>
output: number
intent: "배열 최대값 찾기"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.matched_op).toBeDefined();
    });

    test('지시어 추론: 속도 최적화', () => {
      const code = `fn sort
input: array<number>
output: array<number>
intent: "빠른 정렬 알고리즘"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.directive).toBe('speed');
    });

    test('지시어 추론: 메모리 효율성', () => {
      const code = `fn filter
input: array<number>
output: array<number>
intent: "메모리 효율적 필터링"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.directive).toBe('memory');
    });

    test('지시어 추론: 안전성', () => {
      const code = `fn validate
input: array<number>
output: bool
intent: "안전한 범위 검사"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.directive).toBe('safety');
    });

    test('proposalToString 포맷팅', () => {
      const code = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(code);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);
      const str = proposalToString(proposal);

      expect(str).toContain('fn sum');
      expect(str).toContain('array<number>');
      expect(str).toContain('98%');
    });
  });

  // ============================================================================
  // PART 4: E2E 통합 테스트
  // ============================================================================
  describe('E2E: .free 파일 → Pipeline 준비', () => {
    test('sum.free E2E', () => {
      const freeCode = `@minimal
fn sum
input: array<number>
output: number
intent: "배열의 모든 요소 합산"`;

      // 1. 렉스
      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);

      // 2. 파싱
      const ast = parseMinimalFunction(buffer);
      expect(ast.fnName).toBe('sum');

      // 3. 브릿지
      const proposal = astToProposal(ast);
      expect(proposal.fn).toBe('sum');
      expect(proposal.confidence).toBe(0.98);

      // 4. 파이프라인 준비
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('number');
      expect(proposal.fn).toBe('sum');
    });

    test('average.free E2E', () => {
      const freeCode = `fn average
input: array<number>
output: number
intent: "배열 요소의 평균값 계산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.fn).toBe('average');
      expect(proposal.confidence).toBe(0.98);
      expect(proposal.output).toBe('number');
    });

    test('filter.free E2E', () => {
      const freeCode = `fn filter
input: array<number>
output: array<number>
intent: "메모리 효율적 필터 구현"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.fn).toBe('filter');
      expect(proposal.directive).toBe('memory');
      expect(proposal.input).toBe('array<number>');
      expect(proposal.output).toBe('array<number>');
    });

    test('다양한 타입 지원', () => {
      const freeCode = `fn process
input: array<string>
output: string
intent: "문자열 배열 처리"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);
      const ast = parseMinimalFunction(buffer);
      const proposal = astToProposal(ast);

      expect(proposal.input).toBe('array<string>');
      expect(proposal.output).toBe('string');
    });
  });

  // ============================================================================
  // PART 5: 성능 및 메모리 테스트
  // ============================================================================
  describe('성능: TokenBuffer 메모리 효율', () => {
    test('TokenBuffer 메모리 사용량', () => {
      const freeCode = `fn sum
input: array<number>
output: number
intent: "배열 합산"`;

      const lexer = new Lexer(freeCode);
      const buffer = new TokenBuffer(lexer);

      const usage = buffer.memoryUsage();
      expect(usage.bufferSize).toBeLessThan(100); // BUFFER_SIZE = 100
      expect(usage.position).toBeGreaterThanOrEqual(0);
    });

    test('대용량 .free 파일 파싱 (성능)', () => {
      // 반복 코드로 큰 파일 시뮬레이션
      let code = '';
      for (let i = 0; i < 50; i++) {
        code += `fn func${i}\ninput: array<number>\noutput: number\n`;
      }

      const startTime = Date.now();
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const elapsed = Date.now() - startTime;

      // 50개 함수 선언 토큰화: < 50ms
      expect(elapsed).toBeLessThan(50);
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PART 6: v1 호환성 테스트
  // ============================================================================
  describe('v1 호환성', () => {
    test('v1 lexer 토큰들 유지', () => {
      const code = 'fn sum let const if for async await';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const types = tokens.map((t) => t.type);
      expect(types).toContain('FN');
      expect(types).toContain('LET');
      expect(types).toContain('CONST');
      expect(types).toContain('IF');
      expect(types).toContain('FOR');
      expect(types).toContain('ASYNC');
      expect(types).toContain('AWAIT');
    });

    test('v1 operator 파싱', () => {
      const code = '== != <= >= && || + - * /';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const types = tokens.map((t) => t.type);
      expect(types).toContain('EQ');
      expect(types).toContain('NE');
      expect(types).toContain('LE');
      expect(types).toContain('GE');
    });
  });
});
