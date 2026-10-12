// Choose complete input sequences while authoring the new campaign.
// This constructs reference solutions with the actual production physics.
import{createLab,levels}from'./puzzle-lab.mjs';import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
const hash=n=>createHash('sha256').update(JSON.stringify(levels.find(l=>l.number===n))).digest('hex');
const root='docs/campaign/candy-sky-v2';let data;try{data=JSON.parse(await readFile(`${root}/solutions.json`));}catch{data={campaign:'candy-sky-v2',method:'Construction witnesses: production Matter, Clone, LevelWorld and native islands at10ms. Phaser replay is recorded separately.',levels:[]};}
data.levels=data.levels.filter(l=>l.mapHash===hash(l.number));
const nums=(process.argv[2]??levels.map(l=>l.number).join(',')).split(',').map(Number);
function commands(dir,start,interval,wait=0,total=500){const actions=wait?[[0,wait,false]]:[];if(interval===0){actions.push([dir,total,false]);return actions;}if(start)actions.push([dir,start,false]);for(let t=start;t<total;t+=interval)actions.push([dir,Math.min(interval,total-t),true]);return actions;}
for(const number of nums){if(data.levels.some(l=>l.number===number&&l.replay.status==='complete'))continue;const start=Date.now();let found=null,evaluated=0;
 outer:for(const wait of[0,200,300,100,400])for(const interval of[0,65,50,80,35,100,25])for(const jumpStart of interval?[20,40,60,80,100,10,30,50,70,90]:[0]){
  const actions=commands(1,jumpStart,interval,wait),l=createLab(number);const replay=l.run(actions);evaluated++;
  if(replay.status==='complete'){found={number,mapHash:hash(number),actions,replay:createLab(number).run(actions,true),method:'Authored route with constant right movement and sampled jump/wait schedule.'};break outer;}
 }
 if(found){data.levels=data.levels.filter(l=>l.number!==number);data.levels.push(found);data.levels.sort((a,b)=>a.number-b.number);await writeFile(`${root}/solutions.json`,JSON.stringify(data,null,2));}
 console.log(JSON.stringify({number,status:found?'complete':'needs-routing',steps:found?.replay.step,evaluated,seconds:(Date.now()-start)/1000}));
}
