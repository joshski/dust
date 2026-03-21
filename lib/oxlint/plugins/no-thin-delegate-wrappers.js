function getDelegatedCall(node) {
  const { body } = node
  if (!body) return null
  if (body.type === 'CallExpression') return body
  if (body.type !== 'BlockStatement') return null
  if (body.body.length !== 1) return null
  const [stmt] = body.body
  if (
    stmt.type !== 'ReturnStatement' ||
    !stmt.argument ||
    stmt.argument.type !== 'CallExpression'
  )
    return null
  return stmt.argument
}

function isPurePassthrough(parameters, callArguments) {
  if (parameters.length === 0) return false

  if (
    parameters.length === 1 &&
    parameters[0].type === 'RestElement' &&
    parameters[0].argument.type === 'Identifier' &&
    callArguments.length === 1 &&
    callArguments[0].type === 'SpreadElement' &&
    callArguments[0].argument.type === 'Identifier'
  ) {
    return parameters[0].argument.name === callArguments[0].argument.name
  }

  if (callArguments.length !== parameters.length) return false

  for (let i = 0; i < parameters.length; i++) {
    const param = parameters[i]
    const arg = callArguments[i]
    if (param.type === 'RestElement') return false
    if (param.type === 'AssignmentPattern') return false
    if (param.optional) return false
    if (param.type !== 'Identifier' || arg.type !== 'Identifier') return false
    if (param.name === 'this' || param.name !== arg.name) return false
  }

  return true
}

function isCandidateLocation(node) {
  const parent = node.parent
  if (!parent) return false
  if (parent.type === 'CallExpression' || parent.type === 'NewExpression')
    return false
  return parent.type === 'VariableDeclarator' || parent.type === 'Property'
}

export default {
  create(context) {
    function isThinDelegate(fnNode) {
      const call = getDelegatedCall(fnNode)
      if (!call) return null
      if (call.optional) return null
      if (!isPurePassthrough(fnNode.params, call.arguments)) return null
      return call
    }

    function checkFunction(node) {
      if (!isCandidateLocation(node)) return
      const call = isThinDelegate(node)
      if (!call) return
      const callText = context.sourceCode.getText(call)
      context.report({
        node,
        message: `Thin delegate wrapper around \`${callText}\`. Use a direct reference or \`.bind()\` instead.`,
      })
    }

    function checkMethod(node) {
      if (!node.value || node.value.type !== 'FunctionExpression') return
      const call = isThinDelegate(node.value)
      if (!call) return
      const callText = context.sourceCode.getText(call)
      context.report({
        node,
        message: `Thin delegate wrapper around \`${callText}\`. Use a direct reference or \`.bind()\` instead.`,
      })
    }

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionExpression(node) {
        const parent = node.parent
        if (parent?.type === 'Property' && parent.method) return
        if (parent?.type === 'MethodDefinition') return
        checkFunction(node)
      },
      'Property[method=true]': checkMethod,
      MethodDefinition: checkMethod,
    }
  },
}
