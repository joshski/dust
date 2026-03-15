/**
 * dust new idea - Idea creation instructions
 *
 * Displays guidance for capturing new ideas.
 */

import { dedent } from '../dedent'
import type { CommandDependencies, CommandResult } from '../types'
import {
  manageGitHooks,
  type TemplateVars,
  templateVariables,
} from '../shared/agent-shared'

function newIdeaInstructions(vars: TemplateVars): string {
  return dedent`
    ## Adding a New Idea

    Follow these steps:

    1. Run \`${vars.bin} ideas\` to see all existing ideas and avoid duplicates
    2. Create a new markdown file in \`.dust/ideas/\` with a descriptive kebab-case name (e.g., \`improve-error-messages.md\`)
    3. Add a title as the first line using an H1 heading (e.g., \`# Improve error messages\`)
    4. Write a brief description of the potential change or improvement
    5. If the idea has open questions, add an \`## Open Questions\` section (see below)
    6. Run \`${vars.bin} lint\` to catch any issues with the idea file format
    7. Create a single atomic commit with a message in the format "Create task: Add idea: <title>"
    8. Push your commit to the remote repository

    ### Open Questions section

    Ideas exist to eventually spawn tasks, so they start intentionally vague. An optional \`## Open Questions\` section captures the decisions that need to be made before the idea becomes actionable. Each question is an h3 heading ending with \`?\`, and each option is an h4 heading with markdown content explaining the trade-offs:

    \`\`\`markdown
    ## Open Questions

    ### Should we take our own payments?

    #### Yes, take our own payments

    Lower costs and we become the seller of record, but requires a merchant account.

    #### No, use a payment provider

    Higher costs but simpler setup. No merchant account needed.

    ### Which storage backend should we use?

    #### SQLite

    Simple and embedded. Good for single-node deployments.

    #### PostgreSQL

    Scalable but requires a separate server.
    \`\`\`

    Rules:
    - Questions are \`###\` headings and must end with \`?\`
    - Options are \`####\` headings beneath a question
    - Each question must have at least one option
    - Options can contain any markdown content (paragraphs, lists, code blocks, etc.)
  `
}

export async function newIdea(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)
  context.stdout(newIdeaInstructions(vars))
  return { exitCode: 0 }
}
