export interface CommandResult {
  readonly kind: 'success' | 'error'
  readonly text?: string
}

export interface CommandInvocation {
  readonly agent: DuckAgent
  readonly rawInput: string
  readonly signal: AbortSignal
}

export interface DuckSession {
  readonly id: string
  readonly header?: { readonly id?: string; readonly cwd?: string }
  readonly events?: readonly DuckEvent[]
  deriveMessages?: () => readonly unknown[]
  append?: (type: string, data?: Record<string, unknown>) => void
}

export interface DuckEvent {
  readonly type: string
  readonly data?: Record<string, unknown>
}

export interface DuckAgent {
  readonly session: DuckSession
}

export interface SessionLocation {
  readonly path: string
}

export interface AskOption {
  readonly label: string
  readonly description?: string
}

export interface AskItem {
  readonly id: string
  readonly question: string
  readonly detail?: string
  readonly header?: string
  readonly options?: readonly AskOption[]
  readonly multiSelect?: boolean
}

export interface AskAnswerItem {
  readonly id: string
  readonly selected: readonly string[]
  readonly custom?: string
}

export interface WebReply {
  writeHead(code: number, headers?: Record<string, string>): void
  end(body?: string): void
}

export interface WebRoute {
  readonly kind: 'exact' | 'prefix'
  readonly path: string
  handler(req: { url?: string; method?: string }, res: WebReply): void
}

export interface InfiniteContext {
  readonly userQuestions?: {
    readonly hasProvider?: boolean
    ask(request: {
      questions: readonly AskItem[]
      agent?: DuckAgent
      signal?: AbortSignal
    }): Promise<{ answers: readonly AskAnswerItem[] }>
  }
  readonly commands: {
    register(definition: {
      name: string
      description: string
      input?: { hint: string }
      handler: (invocation: CommandInvocation) => CommandResult | Promise<CommandResult>
    }): () => void
  }
  readonly systemPrompt: {
    section(section: {
      name: string
      order: number
      text: string | ((assemble: AssembleBag) => string)
    }): () => void
    context(context: {
      name: string
      order: number
      text: string | ((assemble: AssembleBag) => string)
    }): () => void
  }
  readonly sessionPersistence?: {
    locate?: (meta: unknown) => SessionLocation | undefined
  }
  readonly webServer?: {
    register(route: WebRoute): () => void
    tapIndex?(transform: (html: string) => string): () => void
  }
  effect(fn: () => (() => void) | void, label?: string): void
  on(event: string, handler: (...args: unknown[]) => void): () => void
}

export interface AssembleBag {
  readonly agent?: DuckAgent
}

export interface PluginConfig {
  readonly templatesDir?: string
  readonly dataDir?: string
  readonly dshHome?: string
  readonly maxWorldChars?: number
}

export function resolveConfig(raw: PluginConfig | undefined): Required<PluginConfig> {
  return {
    templatesDir: raw?.templatesDir ?? '',
    dataDir: raw?.dataDir ?? '',
    dshHome: raw?.dshHome ?? '',
    maxWorldChars: raw?.maxWorldChars ?? 8000,
  }
}
