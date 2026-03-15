export default {
  create(context) {
    const filename = context.filename ?? context.getFilename()

    if (!filename.includes('lib/cli/commands/')) return {}
    if (filename.endsWith('.test.ts')) return {}

    const basename = filename.split('/').pop().replace(/\.ts$/, '')
    const expectedExport = basename
      .split('-')
      .map((part, i) => (i === 0 ? part : part[0].toUpperCase() + part.slice(1)))
      .join('')

    let found = false

    return {
      ExportNamedDeclaration(node) {
        if (found) return
        const decl = node.declaration
        if (!decl) return

        if (decl.type === 'FunctionDeclaration' && decl.id?.name === expectedExport) {
          found = true
        }

        if (decl.type === 'VariableDeclaration') {
          for (const declarator of decl.declarations) {
            if (
              declarator.id?.type === 'Identifier' &&
              declarator.id.name === expectedExport
            ) {
              found = true
            }
          }
        }
      },
      'Program:exit'() {
        if (!found) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `Command file "${basename}.ts" must export a function named "${expectedExport}".`,
          })
        }
      },
    }
  },
}
