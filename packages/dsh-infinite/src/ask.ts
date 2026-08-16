import type { AskAnswerItem, AskItem, CommandInvocation, InfiniteContext } from './types.js'

export function canAsk(ctx: InfiniteContext): boolean {
  return typeof ctx.userQuestions?.ask === 'function'
}

export function stripRecommend(label: string): string {
  return label.replace(/\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i, '').trim()
}

export function pickAnswer(answers: readonly AskAnswerItem[], id: string): string {
  const item = answers.find((row) => row.id === id)
  if (!item) return ''
  const custom = item.custom?.trim()
  if (custom) return custom
  return stripRecommend(item.selected[0]?.trim() ?? '')
}

export async function askUser(
  ctx: InfiniteContext,
  inv: CommandInvocation,
  questions: readonly AskItem[],
): Promise<readonly AskAnswerItem[] | null> {
  if (!ctx.userQuestions) return null
  const result = await ctx.userQuestions.ask({
    questions,
    agent: inv.agent,
    signal: inv.signal,
  })
  return result.answers
}
