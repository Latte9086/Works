import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMail,samples,sumMonth} from './parser.js';
test('成功2件のみを集計し、利用不可の金額を加算しない',()=>{const parsed=samples.map(parseMail);assert.deepEqual(parsed.map(x=>x.status),['accepted','accepted','excluded']);assert.equal(sumMonth(parsed,'2026-11'),1786);assert.equal(parsed[1].approval,'123456');assert.equal(parsed[1].date,'2026-11-05T09:57:36+09:00');});
test('受信日ではなく利用月で集計する',()=>{const row=parseMail({...samples[0],body:samples[0].body.replace('2026/11/04','2026/10/31')});assert.equal(sumMonth([row],'2026-11'),0);assert.equal(sumMonth([row],'2026-10'),786);});
test('デビットの変更説明の注意書きは正常利用を除外しない',()=>assert.equal(parseMail(samples[1]).status,'accepted'));
test('未確認の返金・変更・不正な形式は加算しない',()=>{for(const mail of [{...samples[1],subject:'金額変更のお知らせ'},{...samples[1],body:'返金\n'+samples[1].body},{...samples[0],from:'fake@example.com'},{...samples[0],body:samples[0].body.replace('786円','金額不明')},{...samples[0],body:samples[0].body.replace('2026/11/04','2026/02/30')}])assert.equal(parseMail(mail).status,'review');});
test('件名・全角数字と空白を正規化する',()=>{assert.equal(parseMail({...samples[0],body:samples[0].body.replace('786円','７８６円')}).amount,786);});
test('JPY通知を利用月の日本円として集計する',()=>{
  const mails=[['2026/10/19 22:06','ROCKETNOW JPN','3,280.00\u00a0JPY'],['2026/10/23 11:50','GOOGLE*GOOGLE ONE','1,280.00 JPY']].map(([date,merchant,amount])=>({...samples[0],body:`Olive／クレジット\nご利用日時：${date}\n${merchant}（買物）\t${amount}\n本メールは承認照会に基づく通知です。`}));
  const parsed=mails.map(parseMail);assert.deepEqual(parsed.map(r=>r.status),['accepted','accepted']);assert.deepEqual(parsed.map(r=>r.amount),[3280,1280]);assert.equal(parsed[0].merchant,'ROCKETNOW JPN(買物)');assert.equal(sumMonth(parsed,'2026-10'),4560);assert.equal(sumMonth(parsed,'2026-11'),0);
});
test('デビットのJPY通知にも対応する',()=>{assert.equal(parseMail({...samples[1],body:samples[1].body.replace('1,000円','1,000.00 JPY')}).amount,1000);});
test('外貨は円換算待ち、JPYの端数・不正金額は保留し独自換算しない',()=>{
  for(const value of ['30,000 KRW','15.50 USD']) {const r=parseMail({...samples[0],body:samples[0].body.replace('786円',value)});assert.equal(r.status,'review');assert.match(r.reason,/円換算待ち/);assert.equal(r.amount,undefined);}
  for(const value of ['3,280.50 JPY','0 JPY','-100 JPY','1,23.00 JPY','9,007,199,254,740,992 JPY'])assert.equal(parseMail({...samples[0],body:samples[0].body.replace('786円',value)}).status,'review');
});
test('利用不可のJPYも除外し、変更通知は単純加算しない',()=>{assert.equal(parseMail({...samples[2],body:samples[2].body.replace('1,000円','1,000.00 JPY')}).status,'excluded');assert.equal(parseMail({...samples[0],body:samples[0].body.replace('786円','3,280.00 JPY'),subject:'金額変更のお知らせ'}).status,'review');});
