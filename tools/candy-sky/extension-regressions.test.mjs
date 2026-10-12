import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createLab } from './puzzle-lab.mjs';
import { ProgressStore } from '../../src/game/ProgressStore.js';
const data = JSON.parse(await readFile('public/data/levels.json','utf8'));
const solutions = JSON.parse(await readFile('docs/campaign/candy-sky-v2/solutions.json','utf8'));
const pages = await import('../../src/game/LevelPages.js').catch(e => { if(e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
test('campaign appends eight distinct authored maps with contiguous numbers', () => {
  assert.equal(data.levels.length,32); assert.equal(data.campaign.levelCount,32);
  assert.deepEqual(data.levels.map(l=>l.number),Array.from({length:32},(_,i)=>i+1));
  assert.equal(new Set(data.levels.map(l=>l.name)).size,32);
  const shapes=data.levels.map(l=>JSON.stringify([l.platforms,l.actors.map(a=>[a.type,a.x,a.y])]));
  assert.equal(new Set(shapes).size,32);
});
test('24 completed maps unlock 25 without changing stored volumes or old progress', () => {
  let raw=JSON.stringify({version:1,campaignVersion:2,unlockedThrough:1,completed:Array.from({length:24},(_,i)=>i+1),current:24,soundVolume:35,musicVolume:20});
  globalThis.localStorage={getItem:()=>raw,setItem:(_k,v)=>{raw=v;}};
  const p=new ProgressStore(32);assert.equal(p.isUnlocked(25),true);assert.equal(p.isUnlocked(26),false);
  assert.equal(p.select(25),true);p.complete(25);
  const restored=new ProgressStore(32);assert.equal(restored.current,26);assert.equal(restored.isUnlocked(26),true);
  assert.equal(restored.soundVolume,35);assert.equal(restored.musicVolume,20);assert.equal(restored.completed.size,25);
});
test('page ranges cover every map exactly once, including growth and a partial last page', () => {
  assert.equal(typeof pages.levelPageRange,'function');assert.equal(pages.LEVELS_PER_PAGE,24);
  for(const count of [1,24,25,32,48,49,64]){
    const found=[];
    for(let p=0;p<Math.ceil(count/24);p++){
      const {start,end}=pages.levelPageRange(p,count);
      assert.ok(end-start<24);for(let n=start;n<=end;n++){found.push(n);assert.equal(pages.pageForLevel(n),p);}
    }
    assert.deepEqual(found,Array.from({length:count},(_,i)=>i+1));
  }
  assert.deepEqual(pages.levelPageRange(5,32),{start:25,end:32});
  assert.deepEqual(pages.levelPageRange(-1,32),{start:1,end:24});
});
for(let number=25;number<=32;number++)test(`new level ${number}: exact map witness completes identically ten times`,()=>{
  const map=data.levels.find(l=>l.number===number);assert.ok(map,'New map missing');
  const solution=solutions.levels.find(l=>l.number===number);assert.ok(solution,'Completion witness missing');
  assert.equal(solution.mapHash,createHash('sha256').update(JSON.stringify(map)).digest('hex'));
  const spawn=createLab(number).run([[0,200,false]]);assert.equal(spawn.status,'playing');
  assert.ok(spawn.clones.every(c=>c.state==='playing'&&c.ground<=2&&Math.abs(c.v.y)<.01));
  const expected=createLab(number).run(solution.actions,true);assert.equal(expected.status,'complete');
  for(let repeat=0;repeat<9;repeat++)assert.deepEqual(createLab(number).run(solution.actions,true),expected);
});
