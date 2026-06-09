import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import { randomUUID } from 'node:crypto'
import { searchProcedures } from './tools/searchProcedures.js'
import { findHospitalsNear } from './tools/findHospitalsNear.js'
import { getPriceData } from './tools/getPriceData.js'
import { getAscPrices } from './tools/getAscPrices.js'
import { getQualityScores } from './tools/getQualityScores.js'
import { getFinancialAssistance } from './tools/getFinancialAssistance.js'
import { getProviders } from './tools/getProviders.js'
import { getProviderRatings } from './tools/getProviderRatings.js'
import { rankHospitals } from './tools/rankHospitals.js'
import { getHospitalComparison } from './tools/getHospitalComparison.js'
import { findAndCompare } from './tools/findAndCompare.js'
import { saveSession, getSession } from './tools/session.js'

function createMcpServer(): McpServer {
  const s = new McpServer({
    name: 'clearprice-mcp',
    version: '0.1.0',
  })

  // Register all tools
  s.tool('search_procedures', searchProcedures.schema, searchProcedures.handler)
  s.tool('find_hospitals_near', findHospitalsNear.schema, findHospitalsNear.handler)
  s.tool('get_price_data', getPriceData.schema, getPriceData.handler)
  s.tool('get_asc_prices', getAscPrices.schema, getAscPrices.handler)
  s.tool('get_quality_scores', getQualityScores.schema, getQualityScores.handler)
  s.tool('get_financial_assistance', getFinancialAssistance.schema, getFinancialAssistance.handler)
  s.tool('get_providers', getProviders.schema, getProviders.handler)
  s.tool('get_provider_ratings', getProviderRatings.schema, getProviderRatings.handler)
  s.tool('rank_hospitals', rankHospitals.schema, rankHospitals.handler)
  s.tool('get_hospital_comparison', getHospitalComparison.schema, getHospitalComparison.handler)
  s.tool('find_and_compare', findAndCompare.schema, findAndCompare.handler)
  s.tool('save_session', saveSession.schema, saveSession.handler)
  s.tool('get_session', getSession.schema, getSession.handler)

  return s
}

function isInitializeRequest(body: any): boolean {
  return body && body.method === 'initialize'
}

async function main() {
  const port = process.env['PORT'] ? Number(process.env['PORT']) : null

  if (port) {
    const app = createMcpExpressApp({ host: '0.0.0.0' })
    const sessions: Record<string, { transport: StreamableHTTPServerTransport; server: McpServer }> = {}

    // Add extra CORS headers
    app.use((req: any, res: any, next: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version')
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version')
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
        return
      }
      next()
    })

    app.post('/mcp', async (req: any, res: any) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined
        let transport: StreamableHTTPServerTransport

        if (sessionId && sessions[sessionId]) {
          transport = sessions[sessionId].transport
        } else if (!sessionId && isInitializeRequest(req.body)) {
          const serverInstance = createMcpServer()
          const newTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: true,
            onsessioninitialized: (id) => {
              console.error(`Session initialized with ID: ${id}`)
              sessions[id] = { transport: newTransport, server: serverInstance }
            }
          })
          transport = newTransport
          await serverInstance.connect(transport as any)
          await transport.handleRequest(req, res as any, req.body)
          return
        } else {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided'
            },
            id: null
          })
          return
        }

        await transport.handleRequest(req, res as any, req.body)
      } catch (error) {
        console.error('Error handling MCP request:', error)
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error'
            },
            id: null
          })
        }
      }
    })

    app.get('/mcp', async (req: any, res: any) => {
      res.status(405).set('Allow', 'POST').send('Method Not Allowed')
    })

    app.listen(port, () => {
      console.error(`ClearPrice MCP server listening on HTTP/SSE port ${port}`)
    })
  } else {
    const serverInstance = createMcpServer()
    const transport = new StdioServerTransport()
    await serverInstance.connect(transport)
    console.error('ClearPrice MCP server running on stdio')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
