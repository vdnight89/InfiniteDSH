import type { CommandInvocation, CommandResult, InfiniteContext, PluginConfig } from './types.js';
export declare function handleNew(ctx: InfiniteContext, config: Required<PluginConfig>, inv: CommandInvocation): Promise<CommandResult>;
export declare function handleBind(ctx: InfiniteContext, config: Required<PluginConfig>, inv: CommandInvocation): Promise<CommandResult>;
export declare function handleCast(ctx: InfiniteContext, config: Required<PluginConfig>, inv: CommandInvocation): Promise<CommandResult>;
export declare function handleExport(ctx: InfiniteContext, config: Required<PluginConfig>, inv: CommandInvocation): Promise<CommandResult>;
export declare function registerCommands(ctx: InfiniteContext, config: Required<PluginConfig>): void;
