/**
 * dust subagent new task - Task creation instructions for sub-agents
 *
 * Displays guidance for creating new tasks without recursion.
 * This command is used by sub-agents spawned from Claude Code Web
 * to avoid infinite recursion in the agent new task template.
 */

import { createTemplateCommand } from '../template-command'

export const subagentNewTask = createTemplateCommand('subagent-new-task')
