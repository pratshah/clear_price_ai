/**
 * Shared MCPToolset factory — connects agents to the ClearPrice MCP server via stdio.
 * Each agent gets its own toolset instance filtered to only the tools it needs.
 */
import { config } from 'dotenv'
import { MCPToolset } from '@google/adk'
import { resolve, dirname, join } from 'path'
import { existsSync } from 'fs'

function findProjectRoot(): string {
  const localPath = '/Users/pratik/hackathong'
  if (existsSync(localPath)) {
    return localPath
  }
  let dir = process.cwd()
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'mcp-server')) && existsSync(join(dir, 'package.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

const rootDir = findProjectRoot()

// Load .env before any process.env reads — must happen in this module
// because ESM static imports are hoisted before test-runner.ts config() call
config({ path: resolve(rootDir, '.env') })

const MCP_SERVER_PATH = resolve(rootDir, 'mcp-server/dist/index.js')

/**
 * Create a MCPToolset connected to the ClearPrice MCP server.
 * toolFilter: list of tool names this agent is allowed to use.
 * Pass empty array to allow all tools (orchestrator).
 */
export function createMcpToolset(toolFilter: string[] = []): MCPToolset {
  const mcpServerUrl = process.env['MCP_SERVER_URL']
  if (mcpServerUrl) {
    const mcpUrl = mcpServerUrl.endsWith('/mcp') ? mcpServerUrl : `${mcpServerUrl}/mcp`
    console.error(`Connecting to remote MCP server via SSE: ${mcpUrl}`)
    return new MCPToolset(
      {
        type: 'StreamableHTTPConnectionParams' as const,
        url: mcpUrl,
      },
      toolFilter.length > 0 ? toolFilter : undefined
    )
  }

  console.error(`Connecting to local MCP server via stdio: ${MCP_SERVER_PATH}`)
  return new MCPToolset(
    {
      type: 'StdioConnectionParams' as const,
      serverParams: {
        command: 'node',
        args: [MCP_SERVER_PATH],
        env: {
          ...process.env,
          MONGODB_URI: process.env['MONGODB_URI'] ?? '',
          MONGODB_DATABASE: process.env['MONGODB_DATABASE'] ?? 'clearprice',
          GOOGLE_MAPS_API_KEY: process.env['GOOGLE_MAPS_API_KEY'] ?? '',
        },
      },
    },
    toolFilter.length > 0 ? toolFilter : undefined
  )
}
