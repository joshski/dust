import ts from 'typescript'

type PolicyId =
  | 'dust-no-abbreviated-names'
  | 'no-vitest-mocking'
  | 'no-unsafe-double-cast'

interface PolicyDiagnostic {
  policy: PolicyId
  filePath: string
  line: number
  column: number
  message: string
}

const ABBREVIATED_NAMES = new Map<string, string>([
  ['ctx', "Avoid abbreviated name 'ctx'. Use 'context' instead."],
  ['deps', "Avoid abbreviated name 'deps'. Use 'dependencies' instead."],
  ['fs', "Avoid abbreviated name 'fs'. Use 'fileSystem' instead."],
  ['args', "Avoid abbreviated name 'args'. Use 'arguments' instead."],
  ['req', "Avoid abbreviated name 'req'. Use 'request' instead."],
  ['res', "Avoid abbreviated name 'res'. Use 'response' instead."],
  ['err', "Avoid abbreviated name 'err'. Use 'error' instead."],
  ['cb', "Avoid abbreviated name 'cb'. Use 'callback' instead."],
  ['fn', "Avoid abbreviated name 'fn'. Use a descriptive name instead."],
  ['opts', "Avoid abbreviated name 'opts'. Use 'options' instead."],
  ['params', "Avoid abbreviated name 'params'. Use 'parameters' instead."],
  ['obj', "Avoid abbreviated name 'obj'. Use a descriptive name instead."],
  ['val', "Avoid abbreviated name 'val'. Use 'value' instead."],
  ['idx', "Avoid abbreviated name 'idx'. Use 'index' instead."],
  ['len', "Avoid abbreviated name 'len'. Use 'length' instead."],
  ['tmp', "Avoid abbreviated name 'tmp'. Use a descriptive name instead."],
  [
    'str',
    "Avoid abbreviated name 'str'. Use 'string' or a descriptive name instead.",
  ],
  [
    'num',
    "Avoid abbreviated name 'num'. Use 'number' or a descriptive name instead.",
  ],
])

const MOCKING_METHOD_MESSAGES = new Map<string, string>([
  [
    'mock',
    'Avoid vi.mock(). Use dependency injection or a test helper instead.',
  ],
  [
    'spyOn',
    'Avoid vi.spyOn(). Use dependency injection or a test helper instead.',
  ],
  ['useFakeTimers', 'Avoid vi.useFakeTimers(). Use a test helper instead.'],
  ['useRealTimers', 'Avoid vi.useRealTimers(). Use a test helper instead.'],
  ['runAllTimers', 'Avoid vi.runAllTimers(). Use a test helper instead.'],
  [
    'advanceTimersByTime',
    'Avoid vi.advanceTimersByTime(). Use a test helper instead.',
  ],
  ['fn', 'Avoid vi.fn(). Use a typed test double or test helper instead.'],
])

function diagnostic(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  policy: PolicyId,
  filePath: string,
  message: string
): PolicyDiagnostic {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  )
  return {
    policy,
    filePath,
    line: line + 1,
    column: character + 1,
    message,
  }
}

function visitBindingName(
  sourceFile: ts.SourceFile,
  name: ts.BindingName,
  filePath: string,
  diagnostics: PolicyDiagnostic[]
): void {
  if (ts.isIdentifier(name)) {
    const message = ABBREVIATED_NAMES.get(name.text)
    if (message) {
      diagnostics.push(
        diagnostic(
          sourceFile,
          name,
          'dust-no-abbreviated-names',
          filePath,
          message
        )
      )
    }
    return
  }

  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) continue
    visitBindingName(sourceFile, element.name, filePath, diagnostics)
  }
}

function isUnknownKeywordTypeNode(node: ts.TypeNode): boolean {
  return node.kind === ts.SyntaxKind.UnknownKeyword
}

function isNodeWithBindingName(node: ts.Node): boolean {
  return (
    ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isTypeParameterDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isImportClause(node) ||
    ts.isNamespaceImport(node) ||
    ts.isImportSpecifier(node) ||
    ts.isBindingElement(node) ||
    ts.isCatchClause(node)
  )
}

function hasBindableName(
  node: ts.Node
): node is ts.Node & { name: ts.BindingName } {
  return (
    'name' in node &&
    node.name != null &&
    (ts.isIdentifier(node.name as ts.Node) ||
      ts.isObjectBindingPattern(node.name as ts.Node) ||
      ts.isArrayBindingPattern(node.name as ts.Node))
  )
}

function checkAbbreviatedNames(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  filePath: string,
  diagnostics: PolicyDiagnostic[]
): void {
  if (isNodeWithBindingName(node) && hasBindableName(node)) {
    visitBindingName(sourceFile, node.name, filePath, diagnostics)
  }
}

function checkVitestMocking(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  filePath: string,
  diagnostics: PolicyDiagnostic[]
): void {
  if (!ts.isCallExpression(node)) return
  if (!ts.isPropertyAccessExpression(node.expression)) return

  const callTarget = node.expression
  if (!ts.isIdentifier(callTarget.expression)) return
  if (callTarget.expression.text !== 'vi') return

  const message = MOCKING_METHOD_MESSAGES.get(callTarget.name.text)
  if (message) {
    diagnostics.push(
      diagnostic(sourceFile, callTarget, 'no-vitest-mocking', filePath, message)
    )
  }
}

function checkUnsafeDoubleCast(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  filePath: string,
  diagnostics: PolicyDiagnostic[]
): void {
  if (!filePath.endsWith('.test.ts')) return
  if (!ts.isAsExpression(node)) return
  if (!ts.isAsExpression(node.expression)) return
  if (!isUnknownKeywordTypeNode(node.expression.type)) return

  diagnostics.push(
    diagnostic(
      sourceFile,
      node.type,
      'no-unsafe-double-cast',
      filePath,
      "Avoid double-casting with 'as unknown as'. Prefer typed helpers/adapters, or add a local suppression with rationale at unavoidable interop boundaries."
    )
  )
}

function checkNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  filePath: string,
  diagnostics: PolicyDiagnostic[]
): void {
  checkAbbreviatedNames(sourceFile, node, filePath, diagnostics)
  checkVitestMocking(sourceFile, node, filePath, diagnostics)
  checkUnsafeDoubleCast(sourceFile, node, filePath, diagnostics)

  ts.forEachChild(node, child =>
    checkNode(sourceFile, child, filePath, diagnostics)
  )
}

export function analyzePolicyViolations(
  filePath: string,
  content: string
): PolicyDiagnostic[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  )
  const diagnostics: PolicyDiagnostic[] = []
  checkNode(sourceFile, sourceFile, filePath, diagnostics)
  return diagnostics
}
