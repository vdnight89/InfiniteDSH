import { parseForkOptions } from 'infinite-core'
import { askUser, pickAnswer } from './ask.js'
import { ASK_HEADER, FORK_DETAIL, FORK_QUESTION, WRITE_OWN } from './copy.js'
import { lastAssistantRaw } from './transcript.js'
import type { DuckSession, InfiniteContext } from './types.js'
import { liveAgent, wakeSoon } from './wake.js'

const inFlight = new Set<string>()

/** After a prose turn, turn the 【歧路】 lines into a clickable ask. */
export async function offerForks(ctx: InfiniteContext, session: DuckSession): Promise<void> {
  const key = session.id
  if (!key || inFlight.has(key)) return
  const options = parseForkOptions(lastAssistantRaw(session))
  if (options.length === 0) return
  const agent = liveAgent(ctx, session)
  if (!agent) return

  inFlight.add(key)
  try {
    const answers = await askUser(ctx, { agent, signal: new AbortController().signal }, [{
      id: 'fork',
      header: ASK_HEADER,
      question: FORK_QUESTION,
      detail: FORK_DETAIL,
      options: [
        ...options.map((label, index) => ({
          label,
          description: `歧路 ${index + 1}`,
        })),
        { label: WRITE_OWN, description: '不走列出的路，写下你的行动。' },
      ],
    }])
    if (!answers) return
    const picked = pickAnswer(answers, 'fork')
    if (!picked || picked === WRITE_OWN) return
    wakeSoon(agent, picked)
  } finally {
    inFlight.delete(key)
  }
}
