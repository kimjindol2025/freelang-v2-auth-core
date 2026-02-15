/**
 * FreeLang v2 Phase 5 - AST to HeaderProposal Bridge
 *
 * MinimalFunctionAST (.free 파일) → HeaderProposal (파이프라인 입력)
 *
 * 역할: Phase 5 (v1 파서)와 Phase 1-4 (AI 파이프라인) 연결
 */
import { MinimalFunctionAST } from '../parser/ast';
import { HeaderProposal } from '../engine/auto-header';
import { Directive } from '../engine/patterns';

/**
 * AST를 HeaderProposal로 변환
 *
 * .free 파일의 explicit 선언을 HeaderProposal 형식으로 변환하므로
 * 신뢰도는 매우 높음 (95%+)
 */
export function astToProposal(ast: MinimalFunctionAST): HeaderProposal {
  // .free 파일은 explicit 선언이므로 매우 높은 신뢰도
  const confidence = 0.98; // v1 파서로 명확하게 구문 분석됨 (0.0-1.0 범위)

  // matched_op 추론: intent에서 동작 키워드 찾기
  const matched_op = inferOperation(ast.intent || '', ast.fnName);

  // 이유 생성 (intent 또는 함수명 기반)
  const reason = ast.intent || `${ast.fnName} operation`;

  // 지시어 (directive) 추론: intent에서 최적화 방향 찾기
  const directive = inferDirective(ast.intent || '');

  // 복잡도 추론 (의도에서 또는 기본값)
  const complexity = inferComplexity(ast.intent || '');

  return {
    fn: ast.fnName,
    input: ast.inputType,
    output: ast.outputType,
    reason,
    directive,
    complexity,
    confidence,
    matched_op
  };
}


/**
 * 동작 추론 (intent + fnName에서)
 *
 * intent가 있으면 거기서, 없으면 fnName에서 동작 추론
 */
function inferOperation(intent: string, fnName: string): string {
  // intent에서 핵심 동작어 찾기
  const intentLower = (intent || fnName).toLowerCase();

  // 키워드 매핑
  const keywords: Record<string, string[]> = {
    sum: ['합산', 'sum', 'add', 'total'],
    average: ['평균', 'average', 'avg', 'mean'],
    max: ['최대', 'max', 'maximum'],
    min: ['최소', 'min', 'minimum'],
    sort: ['정렬', 'sort'],
    reverse: ['역순', 'reverse', 'reverse'],
    filter: ['필터', 'filter', 'where'],
    map: ['변환', 'map', 'transform'],
    count: ['개수', 'count', 'length'],
    find: ['찾기', 'find', 'search'],
    flatten: ['평탄화', 'flatten'],
    unique: ['유일', 'unique', 'distinct']
  };

  // 각 동작에서 intent 키워드 검색
  for (const [op, opKeywords] of Object.entries(keywords)) {
    for (const keyword of opKeywords) {
      if (intentLower.includes(keyword)) {
        return op;
      }
    }
  }

  // 함수명이 동작명과 정확히 일치하면 사용
  if (intentLower in keywords) {
    return intentLower;
  }

  // 기본값: 함수명 사용
  return fnName;
}

/**
 * 지시어 추론 (intent에서 최적화 힌트 찾기)
 *
 * "배열 합산" → "memory" (기본값)
 * "빠른 정렬" → "speed"
 * "메모리 효율적 필터링" → "memory"
 * "안전한 검사" → "safety"
 */
function inferDirective(intent: string): Directive {
  const intentLower = intent.toLowerCase();

  if (
    intentLower.includes('빠른') ||
    intentLower.includes('fast') ||
    intentLower.includes('speed') ||
    intentLower.includes('quick')
  ) {
    return 'speed';
  }

  if (
    intentLower.includes('메모리') ||
    intentLower.includes('효율') ||
    intentLower.includes('memory') ||
    intentLower.includes('efficient')
  ) {
    return 'memory';
  }

  if (
    intentLower.includes('안전') ||
    intentLower.includes('검사') ||
    intentLower.includes('safe') ||
    intentLower.includes('check')
  ) {
    return 'safety';
  }

  // 기본값: memory (효율성 우선)
  return 'memory';
}

/**
 * 복잡도 추론
 */
function inferComplexity(intent: string): string {
  const intentLower = intent.toLowerCase();

  if (
    intentLower.includes('정렬') ||
    intentLower.includes('sort') ||
    intentLower.includes('merge')
  ) {
    return 'O(n log n)';
  }

  if (
    intentLower.includes('순회') ||
    intentLower.includes('반복') ||
    intentLower.includes('loop') ||
    intentLower.includes('iterate')
  ) {
    return 'O(n)';
  }

  if (
    intentLower.includes('이진') ||
    intentLower.includes('찾기') ||
    intentLower.includes('binary') ||
    intentLower.includes('search')
  ) {
    return 'O(log n)';
  }

  // 기본값
  return 'O(n)';
}

/**
 * HeaderProposal을 인쇄 가능한 형식으로 변환 (디버깅)
 */
export function proposalToString(proposal: HeaderProposal): string {
  return `
Header: fn ${proposal.fn}: ${proposal.input} -> ${proposal.output}
Function: ${proposal.fn}
Input: ${proposal.input}
Output: ${proposal.output}
Reason: ${proposal.reason}
Directive: ${proposal.directive}
Complexity: ${proposal.complexity}
Confidence: ${proposal.confidence}%
Matched Op: ${proposal.matched_op}
  `.trim();
}
