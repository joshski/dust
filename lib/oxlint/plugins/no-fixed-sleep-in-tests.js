function isNonZeroDelay(node) {
  if (!node) return false
  if (node.type === 'NumericLiteral' || node.type === 'Literal') {
    return node.value !== 0
  }
  // Any non-literal (variable reference, expression, etc.) is flagged
  return true
}

const message =
  'Fixed-duration sleep in test file. Use event-based waiting or inject time dependencies.'

export default {
  create(context) {
    const filename = context.filename ?? context.getFilename()

    if (!filename.endsWith('.test.ts')) return {}

    return {
      CallExpression(node) {
        const { callee, arguments: callArguments } = node

        // Check for setTimeout(fn, delay) where delay > 0 or is a variable
        if (callee.type === 'Identifier' && callee.name === 'setTimeout') {
          if (callArguments.length >= 2 && isNonZeroDelay(callArguments[1])) {
            context.report({ node, message })
          }
          return
        }

        // Check for globalThis.setTimeout(fn, delay)
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'globalThis' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'setTimeout'
        ) {
          if (callArguments.length >= 2 && isNonZeroDelay(callArguments[1])) {
            context.report({ node, message })
          }
          return
        }

        // Check for sleep(delay) where delay > 0 or is a variable
        if (callee.type === 'Identifier' && callee.name === 'sleep') {
          if (callArguments.length >= 1 && isNonZeroDelay(callArguments[0])) {
            context.report({ node, message })
          }
        }
      },
    }
  },
}
