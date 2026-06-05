import { searchProcedures } from './tools/searchProcedures.js'

async function run() {
  console.log('Testing search_procedures tool with query "knee replacement"...')
  try {
    const response = await searchProcedures.handler({
      query: 'knee replacement',
      top_k: 5
    })
    console.log('\nResponse from searchProcedures:')
    const textContent = (response.content?.[0] as any)?.text
    console.log(textContent ?? 'No text response received.')
  } catch (err) {
    console.error('Error testing searchProcedures:', err)
  }
}

run().then(() => process.exit(0))
