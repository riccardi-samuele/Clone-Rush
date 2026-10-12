// Multi-stage authoring: outward/inward, release and return, key collection.
import{createLab,levels}from'./puzzle-lab.mjs';import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const root='docs/campaign/candy-sky-v2',hash=n=>createHash('sha256').update(JSON.stringify(levels.find(l=>l.number===n))).digest('hex');
const data=JSON.parse(await readFile(`${root}/solutions.json`));data.levels=data.levels.filter(l=>l.mapHash===hash(l.number));
const nums=(process.argv[2]??'6,7,8,15,16,17,20,22,23,24').split(',').map(Number);
function leg(dir,total,start,interval){const a=[];if(interval===0)return[[dir,total,false]];if(start)a.push([dir,start,false]);for(let t=start;t<total;t+=interval)a.push([dir,Math.min(interval,total-t),true]);return a;}
for(const number of nums){if(data.levels.some(l=>l.number===number))continue;const begin=Date.now();let found=null,count=0;
 const firsts=number>=25?[120,140,160,180,200,220,240,260,110,130,150,170,190,210,230,250]:number<=8?[85,75,95,65,105]:number===15?[70,80,90]:number===22?[110,100,120,130]:[210,220,230,200,190,240,180,250,170,260];
 const starts=number>=25?[20,40,60,80,100,0]:number<=8?[20,10,30]:number===23?[90,80,100,70]:number===24?[20,30,10,40,50,60]:[40,20,60,80,90,100];
 const intervals=number>=25?[0,65,50,80,100]:number<=8?[0]:number===24?[90,80,70,60,50]:[65,50,80,35,100,0];
 outer:for(const wait of[0,180,300])for(const first of firsts)for(const js of starts)for(const interval of intervals){
 let prefix=number<=8?[[1,js,false],[1,first-js,true]]:leg(1,first,js,interval);
 if(number===15)prefix=[[1,first,false],[0,170,false]];
 for(const backStart of[0,20,40,60,80,100,120])for(const backInterval of[0,65,50,90]){
 const actions=[...(wait?[[0,wait,false]]:[]),...prefix,...leg(-1,360,backStart,backInterval)];const replay=createLab(number).run(actions);count++;
 if(replay.status==='complete'){found={number,mapHash:hash(number),actions,replay:createLab(number).run(actions,true),method:'Authored multi-stage route; outward, pause/release or return with shared commands.'};break outer;}
 }
 }
 if(found){data.levels.push(found);data.levels.sort((a,b)=>a.number-b.number);}
 await writeFile(`${root}/solutions.json`,JSON.stringify(data,null,2));console.log(JSON.stringify({number,status:found?'complete':'needs-routing',step:found?.replay.step,count,seconds:(Date.now()-begin)/1000}));
}
