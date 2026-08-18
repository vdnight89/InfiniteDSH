import { registerCommands } from './commands.js'
import { registerCoverServer } from './covers-host.js'
import { installUserPreset } from './install-preset.js'
import { onSessionEvent } from './lifecycle.js'
import { registerPrompt } from './prompt.js'
import { repairLegacyBindEvents } from './repair-sessions.js'
import type { DuckEvent, DuckSession, InfiniteContext, PluginConfig } from './types.js'
import { resolveConfig } from './types.js'

export const name = 'dsh-infinite'
export const inject = ['commands', 'systemPrompt', 'userQuestions']

export type { PluginConfig }

/** Named exports only. Cordis unwraps `default` and would drop `inject`. */
export function apply(ctx: InfiniteContext, raw?: PluginConfig): void {
  const config = resolveConfig(raw)
  try {
    repairLegacyBindEvents(config)
  } catch {
    // A broken walk must not prevent the plugin from loading.
  }
  installUserPreset(config)
  registerCoverServer(ctx, config)
  registerCommands(ctx, config)
  registerPrompt(ctx, config)
  ctx.effect(() => ctx.on('session/event', (...args: unknown[]) => {
    const session = args[0] as DuckSession
    const event = args[1] as DuckEvent
    if (!session || !event) return
    onSessionEvent(ctx, config, session, event)
  }), 'infinite.session')
}
