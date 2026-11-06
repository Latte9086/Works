import test from 'node:test';
import assert from 'node:assert/strict';
import {readCsv,decodeCsv,parseStatementCsv,prepareCsvImport,guardCsvDuplicates} from './csv-import.js';
import {mergeRecords,reconcileRecords} from './reconcile.js';
const header='テスト,4980-00**-****-****,Olive／クレジット\r\n';
const line='2026/08/01,モバイルＳｕｉｃａ,1000,１,１,1000,';
test('quoted CSV including commas, escapes, BOM and multiline',()=>{
  assert.deepEqual(readCsv('\uFEFF"a,b","c""d","x\ny"\r\n'),[['a,b','c"d','x\ny']]);
  assert.throws(()=>readCsv('"a'));assert.throws(()=>readCsv('"a"x'));
});
test('UTF-8 and Shift-JIS decoding',()=>{
  assert.equal(decodeCsv(new TextEncoder().encode('利用')),'利用');
  assert.equal(decodeCsv(Uint8Array.from([0x97,0x98,0x97,0x70])),'利用');
});
test('usage month, charges, foreign JPY amounts, ignore statement total and owner',()=>{
  const parsed=parseStatementCsv(header+line+'\r\n2026/08/02,"SHOP, SEOUL",22060,１,１,22060,189000.00　KRW　0.11672　08 10\r\n,,,,,23060,');
  assert.equal(parsed.summary.count,2);assert.equal(parsed.summary.total,23060);assert.deepEqual(parsed.summary.months,['2026-08']);
  assert.equal(parsed.records[1].currency,'JPY');assert.equal(parsed.records[1].originalCurrency,'KRW');
  assert.equal(parsed.records[1].originalAmount,'189000.00');assert.ok(!JSON.stringify(parsed.records).includes('テスト'));
});
test('repeated identical rows have stable distinct keys across files',()=>{
  const a=parseStatementCsv(header+line+'\n'+line).records,b=parseStatementCsv(header+line+'\n'+line+'\n,,,,,2000,').records;
  assert.notEqual(a[0].csvKey,a[1].csvKey);assert.deepEqual(a.map(r=>r.csvKey),b.map(r=>r.csvKey));
});
test('unsupported files and malformed rows fail atomically',()=>{
  for(const s of ['日付,出金額\n2026/08/01,1000',header+line+'\nunknown',header+line.replace('08/01','02/30'),header+line.replace('1000,１','bad,１')])assert.throws(()=>parseStatementCsv(s));
});
test('refunds and installments require review',()=>{
  const a=parseStatementCsv(header+'2026/08/01,SHOP,-1000,１,１,-1000,\n2026/08/02,SHOP,3000,３,１,1000,').records;
  assert.deepEqual(a.map(r=>r.status),['review','review']);
});
const base={account:'a',mode:'credit',date:'2026-08-01T00:00:00+09:00',month:'2026-08',merchant:'SHOP',status:'accepted',amount:1000,currency:'JPY'};
const mail={...base,id:'mail'},csv={...base,id:'csv',source:'csv'};
test('repeat import skipped; same day amount candidate requires review even different merchant',()=>{
  assert.equal(prepareCsvImport([csv],[csv]).length,0);
  assert.equal(prepareCsvImport([mail],[{...csv,merchant:'DIFFERENT'}])[0].status,'review');
  assert.equal(prepareCsvImport([mail],[{...csv,amount:1100}])[0].status,'review');
  assert.equal(prepareCsvImport([{...mail,account:'other'}],[csv])[0].status,'accepted');
  assert.equal(prepareCsvImport([{...mail,mode:'debit'}],[csv])[0].status,'accepted');
});
test('later mail cannot double count CSV, manual distinct decision survives reconciliation',()=>{
  const result=mergeRecords([csv],[mail]);assert.equal(result.find(r=>r.id==='mail').status,'review');
  const distinct={...mail,csvDistinctAgainst:['csv']};
  assert.equal(reconcileRecords([csv,distinct]).filter(r=>r.status==='accepted').length,2);
  assert.equal(guardCsvDuplicates([{...csv,csvDistinctAgainst:['mail']},mail])[1].status,'accepted');
});
test('foreign pending stays pending and duplicate review can be manually resolved',()=>{
  assert.equal(guardCsvDuplicates([csv,{...mail,status:'review',currency:'KRW'}])[1].status,'review');
  const review=prepareCsvImport([mail],[csv])[0];
  const resolved={...review,status:'excluded',resolvedBy:'mail',resolution:'manual',previousReason:review.reason};
  assert.equal(reconcileRecords([mail,resolved])[1].status,'excluded');
});
