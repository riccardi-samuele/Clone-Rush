// Bounded exploratory search, not an impossibility proof. A candidate solution
// is always replayed from the original state before it is written to the study.
import { createLab } from './puzzle-lab.mjs';
import { navigation } from './puzzle-navigation.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const numbers=(process.argv[2]??'2,6,9,11').split(',').map(Number);
const seconds=Number(process.argv[3]??35), width=Number(process.argv[4]??55), duration=Number(process.argv[5]??20);
const output='docs/campaign/candy-sky-v2/search';
await mkdir(output,{recursive:true});
for(const number of numbers){
  const lab=createLab(number), started=Date.now();
  const ports=lab.world.objects.filter(o=>[5,15].includes(o.type));
  const keys=lab.world.objects.filter(o=>o.type===32);
  const distance=navigation(lab.world),hasBounce=lab.world.objects.some(o=>o.type===23);
  function score(){
    let s=0;
    const active=lab.world.clones.filter(c=>c.state==='playing');
    const available=ports.filter(o=>!o.used),used=new Set();
    let assignment=Infinity;
    function assign(i,cost){
      if(cost>=assignment)return;
      if(i===active.length){assignment=cost;return;}
      const c=active[i];
      for(const o of available){
        if(o.type===15&&used.has(o))continue;
        const impossibleSolo=c.type===19&&!hasBounce&&o.body.position.y+30<c.body.position.y;
        const assisted=active.some(a=>a.type!==19);
        const penalty=impossibleSolo?(assisted?500:10000):0;
        if(o.type===15)used.add(o);
        assign(i+1,cost+distance(c,o)+penalty);
        if(o.type===15)used.delete(o);
      }
    }
    assign(0,0);s+=assignment;
    for(const c of active){const p=c.body.position;if(p.x<10)s+=(10-p.x)*3;if(p.x>470)s+=(p.x-470)*3;}
    for(const k of keys.filter(k=>!k.collected))s+=80+Math.min(...active.map(c=>distance(c,k)));
    return s-500*(lab.world.clones.length-active.length);
  }
  function bin(){return lab.world.clones.map(c=>c.state==='playing'?
    [Math.round(c.body.position.x/8),Math.round(c.body.position.y/8),Math.round(c.velocity().x/75),Math.round(c.velocity().y/120),c.groundFrames<9?1:0,c.facing].join(','):'X').join('|')+
    ';'+lab.world.objects.map(o=>`${+o.collected}${+o.used}`).join('')+';'+Math.floor((lab.steps%440)/40);}
  let beam=[{state:lab.save(),actions:[],score:score()}],evaluated=0,best=null,solved=null;
  const visited=new Set();
  for(let depth=0;depth<160 && (Date.now()-started)/1000<seconds;depth++){
    const candidates=new Map();
    for(const node of beam){
      lab.restore(node.state);visited.add(bin());
      for(const direction of [-1,0,1])for(const jump of [false,true]){
        lab.restore(node.state);lab.run([[direction,duration,jump]]);evaluated++;
        if(lab.scene.status==='dead')continue;
        const actions=[...node.actions,[direction,duration,jump]];
        if(lab.scene.status==='complete'){
          const replay=createLab(number).run(actions,true);
          if(replay.status==='complete'){solved={actions,replay};break;}
          continue;
        }
        const value=score(),key=bin();
        if(value>9000)continue;
        if(visited.has(key))continue;
        if(!candidates.has(key)||value<candidates.get(key).score)candidates.set(key,{state:lab.save(),actions,score:value,observation:lab.state()});
      }
      if(solved)break;
    }
    if(solved)break;
    beam=[...candidates.values()].sort((a,b)=>a.score-b.score).slice(0,width);
    if(!beam.length)break;
    if(!best||beam[0].score<best.score)best={score:beam[0].score,actions:beam[0].actions,state:beam[0].observation};
    if(depth%20===0)console.log(JSON.stringify({number,depth,evaluated,best:best?.score,elapsed:(Date.now()-started)/1000}));
  }
  const result={number,method:`bounded beam exploration; production Matter + Clone and LevelWorld puzzle methods, render stubs; ${duration*10}ms decisions`,seconds:(Date.now()-started)/1000,evaluated,status:solved?'candidate-solved':'unresolved',...solved,best};
  await writeFile(`${output}/level-${String(number).padStart(2,'0')}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({number,status:result.status,evaluated,seconds:result.seconds,steps:solved?.replay.step,best:best?.score}));
}
