import { searchProcedures } from './src/tools/searchProcedures.js';
console.time('search');
searchProcedures.handler({ query: 'colonoscopy', top_k: 5 })
  .then(r => { console.timeEnd('search'); console.log(JSON.stringify(r).substring(0, 100)); })
  .catch(console.error);
