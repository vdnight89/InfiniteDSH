import type { AskAnswerItem, AskItem, CommandInvocation, InfiniteContext } from './types.js'

export function isNoAskProvider(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'NO_PROVIDER') {
    return true
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /NO_PROVIDER|no user-questions provider/i.test(message)
}

/** True only when a UI provider is known to exist. Headless still exposes ask(). */
export function canAsk(ctx: InfiniteContext): boolean {
  const questions = ctx.userQuestions
  if (typeof questions?.ask !== 'function') return false
  if (questions.hasProvider === false) return false
  return true
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
  if (typeof ctx.userQuestions?.ask !== 'function') return null
  try {
    const result = await ctx.userQuestions.ask({
      questions,
      agent: inv.agent,
      signal: inv.signal,
    })
    return result.answers
  } catch (error) {
    if (isNoAskProvider(error)) return null
    throw error
  }
}
