// Research adapter: production physics and puzzle methods, without rendering,
// audio, scene transitions or writes to the player's progress. Not shipped.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const bundle = '/tmp/clone-rush-puzzle-physics.cjs';
await build({ stdin: { contents: `export { Clone } from './src/game/Clone.js'; export { LevelWorld } from './src/game/LevelWorld.js'; export { CandyHazards } from './src/game/CandyHazards.js'; export { floatingMap } from './src/game/GeneratedTerrain.js'; export { actorAnimation } from './src/game/Presentation.js';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', outfile: bundle,
  plugins: [{ name: 'physics-only-phaser', setup(b) {
    b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'physics-only' }));
    b.onLoad({ filter: /.*/, namespace: 'physics-only' }, () => ({ contents: `import Matter from ${JSON.stringify(resolve('node_modules/phaser/src/physics/matter-js/CustomMain.js'))}; export default { Physics:{Matter:{Matter}}, Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v))} };`, resolveDir: process.cwd() }));
  } }] });
const { Clone, LevelWorld, CandyHazards, floatingMap } = require(bundle);
const Matter = require('../../node_modules/phaser/src/physics/matter-js/CustomMain.js');
export const catalog = JSON.parse(await readFile('public/data/catalog.json', 'utf8'));
export const levels = JSON.parse(await readFile('public/data/levels.json', 'utf8')).levels;

function sprite(x, y) {
  return { x, y, rotation: 0, angle: 0, scaleX: 1, scaleY: 1, anims: {},
    setPosition(x,y) { this.x=x; this.y=y; return this; },
    setDisplaySize(w,h) { this.displayWidth=w; this.displayHeight=h; return this; },
    setOrigin(){return this;}, setDepth(){return this;}, setAngle(v){this.angle=v;this.rotation=v*Math.PI/180;return this;},
    setRotation(v){this.rotation=v;return this;}, setTint(){return this;}, clearTint(){return this;},
    setFlipY(v){this.flipY=v;return this;},
    setTexture(){return this;},
    setVisible(){return this;}, setAlpha(){return this;}, play(){return this;}, destroy(){} };
}

export function createLab(number, custom) {
  Matter.Common._nextId = 0;
  const level = custom ?? levels.find(l => l.number === number);
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 }, enableSleeping: false, positionIterations: 8, velocityIterations: 8 });
  const scene = { status: 'playing',
    add: { image: sprite, sprite }, tweens: { add(){}, killTweensOf(){} }, audio: { play(){} },
    matter: { world: { engine, add: b => Matter.Composite.add(engine.world,b) } },
    die(c) { this.status='dead'; this.deadClone=world.clones.indexOf(c); c.state='dead'; },
    checkComplete() { if (world.clones.every(c=>c.state==='exiting')) this.status='complete'; },
  };
  const world = Object.create(LevelWorld.prototype);
  Object.assign(world, { scene, level, catalog, objects: [], clones: [], particles: [], visualTime: 0, masks: new Map() });
  for(const p of catalog.collisionPairs) {
    world.masks.set(p.group1,(world.masks.get(p.group1)??0)|(1<<p.group2));
    world.masks.set(p.group2,(world.masks.get(p.group2)??0)|(1<<p.group1));
  }
  world.floating = floatingMap(level,catalog);
  world.buildTerrain();
  for(const a of world.floating.actors) {
    if([3,17,19,25,35].includes(a.type)) world.clones.push(new Clone(world,a));
    else if([5,15,32,23,9,11,13].includes(a.type)) world.addObject(a);
  }
  if(world.objects.some(o=>o.type===32)) world.objects.filter(o=>o.type===5).forEach(o=>{o.locked=true;});
  world.hazards = new CandyHazards(world);
  world.effects = { enterPortal(){return true;} };
  const events=[];
  const origCollect=world.collectKey;
  world.collectKey=function(k){if(!k.collected)events.push({step:lab.steps,event:'key',id:k.instance.instance});return origCollect.call(this,k);};
  world.clones.forEach((c,i)=>{
    const orig=c.enterExit;
    c.enterExit=function(e){if(this.state==='playing'&&!e.locked&&!e.used)events.push({step:lab.steps,event:'exit',clone:i,portal:e.instance.instance});return orig.call(this,e);};
  });
  const lab = { world, scene, engine, steps: 0, events,
    step(direction=0,jump=false) {
      if(scene.status!=='playing')return;
      // Key rotation is a visual tween in the real game. Use its nominal 3.6s
      // period here; successful research traces must also be replayed in Phaser.
      world.objects.filter(o=>o.type===32).forEach(o=>{o.sprite.rotation=this.steps*.01*Math.PI*2/3.6;});
      world.prepareStep(); Matter.Engine.update(engine,10); world.resolveContacts();
      if(scene.status==='playing')world.clones.forEach(c=>c.step({direction,pressed:new Set(jump?['up']:[])}));
      this.steps++;
    },
    run(actions,trace=false) {
      const frames=[];
      for(const [direction,duration,jump] of actions) {
        for(let i=0;i<duration && scene.status==='playing';i++) {
          this.step(direction,jump&&i===0);
          if(trace&&this.steps%10===0)frames.push(this.state());
        }
        if(scene.status!=='playing')break;
      }
      return {...this.state(),events,frames};
    },
    state() {return {step:this.steps,status:scene.status,deadClone:scene.deadClone,
      clones:world.clones.map(c=>({type:c.type,state:c.state,x:c.body.position.x,y:c.body.position.y,v:c.velocity(),ground:c.groundFrames})),
      keys:world.objects.filter(o=>o.type===32).map(o=>o.collected),
      used:world.objects.filter(o=>o.type===15).map(o=>o.used)};},
  };
  const bodies=Matter.Composite.allBodies(engine.world);
  const refs=new Set(bodies.flatMap(b=>[b,...b.vertices]));
  const copy=(v,seen=new Map())=>{
    if(!v||typeof v!=='object'||refs.has(v))return v;
    if(seen.has(v))return seen.get(v);
    const out=Array.isArray(v)?[]:{};seen.set(v,out);
    for(const [k,x] of Object.entries(v))out[k]=copy(x,seen);return out;
  };
  const bodyFields=['position','positionPrev','angle','anglePrev','velocity','angularVelocity','force','torque','speed','angularSpeed','deltaTime','positionImpulse','constraintImpulse','totalContacts','isStatic','isSensor','friction','frictionStatic','restitution','mass','inverseMass','inertia','inverseInertia','density','area','_original','collisionFilter','bounds','axes'];
  lab.save=()=>({steps:lab.steps,status:scene.status,deadClone:scene.deadClone,events:copy(events),
    bodies:bodies.map(b=>({fields:Object.fromEntries(bodyFields.map(k=>[k,copy(b[k])])),vertices:b.vertices.map(v=>({x:v.x,y:v.y}))})),
    worldModified:engine.world.isModified,pairs:copy(engine.pairs),timing:copy(engine.timing),detectorBodies:[...engine.detector.bodies],
    clones:world.clones.map(c=>Object.fromEntries(['state','groundFrames','jumpFrames','facing','sliding','bouncing','previousPosition'].map(k=>[k,copy(c[k])]))),
    objects:world.objects.map(o=>Object.fromEntries(['collected','used','locked','physicsAngle','bodyScaleX','bodyScaleY'].map(k=>[k,o[k]]))),
    clock:world.hazards.clock,extensions:world.hazards.teeth.map(t=>t.extension),
  });
  lab.restore=s=>{
    lab.steps=s.steps;scene.status=s.status;scene.deadClone=s.deadClone;events.splice(0,events.length,...copy(s.events));
    bodies.forEach((b,i)=>{
      Object.assign(b,copy(s.bodies[i].fields));
      b.vertices.forEach((v,j)=>Object.assign(v,s.bodies[i].vertices[j]));
    });
    engine.world.isModified=s.worldModified;engine.pairs=copy(s.pairs);engine.detector.pairs=engine.pairs;
    engine.timing=copy(s.timing);engine.detector.bodies=[...s.detectorBodies];
    world.clones.forEach((c,i)=>Object.assign(c,copy(s.clones[i])));
    world.objects.forEach((o,i)=>Object.assign(o,s.objects[i]));
    world.hazards.clock=s.clock;world.hazards.teeth.forEach((t,i)=>{t.extension=s.extensions[i];});
  };
  return lab;
}

if(process.argv[1]===new URL(import.meta.url).pathname) {
  const n=Number(process.argv[2]??1), actions=JSON.parse(process.argv[3]??'[[0,100,false]]');
  console.log(JSON.stringify(createLab(n).run(actions,true),null,2));
}
