// Check real selector pagination, save migration and level 25 entry on desktop
// and touch screens. Only scene references are exposed; no gameplay logic patch.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = 'docs/campaign/candy-sky-v2';
await mkdir(`${root}/screens`, { recursive: true });
const report={recordedAt:new Date().toISOString(),method:'Real Phaser UI with isolated completed-24 save; mouse/touch pagination, keyboard crossing, level entry and pause return.',cases:[],errors:[],failures:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const check=(value,message)=>{if(!value)report.failures.push(message);};
try{
  for(const [name,width,height,touch] of [['desktop',1280,800,false],['phone',390,844,true],['compact-phone',320,460,true],['landscape-phone',844,390,true]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?2:1});
    page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
    page.on('response',r=>{if(r.status()>=400)report.errors.push(`${name}: HTTP ${r.status()} ${r.url()}`);});
    await page.addInitScript(()=>localStorage.setItem('clone-rush:v1',JSON.stringify({version:1,campaignVersion:2,current:25,completed:Array.from({length:24},(_,i)=>i+1),unlockedThrough:1,soundVolume:35,musicVolume:20})));
    for(const [pattern,before,after] of [
      ['**/src/game/RoyalLobby.js*','this.scene = scene;','this.scene = scene; window.__lobby=this;'],
      ['**/src/scenes/LevelSelectScene.js*','this.view = new RoyalLevelSelect(this);','this.view = new RoyalLevelSelect(this); window.__select=this;'],
      ['**/src/scenes/PlayScene.js*','this.world = new LevelWorld(this, this.level);','this.world = new LevelWorld(this, this.level); window.__play=this;'],
    ]) await page.route(pattern,async route=>{const response=await route.fetch(),body=await response.text();assert.ok(body.includes(before),pattern);await route.fulfill({response,body:body.replace(before,after)});});
    await page.goto('http://127.0.0.1:5175/');
    await page.waitForFunction(()=>window.__lobby?.ready(),null,{timeout:90000});
    await page.evaluate(()=>{window.__point=(object,scene,camera=scene.cameras.main)=>{const canvas=scene.game.canvas,rect=canvas.getBoundingClientRect(),p=camera.matrix.transformPoint(object.x-camera.scrollX,object.y-camera.scrollY);return{x:rect.left+p.x*rect.width/canvas.width,y:rect.top+p.y*rect.height/canvas.height};};});
    const click=async point=>touch?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y);
    await click(await page.evaluate(()=>window.__point(window.__lobby.start,window.__lobby.scene)));
    await page.waitForFunction(()=>window.__select?.view.ready(),null,{timeout:15000});
    const snapshot=async()=>page.evaluate(()=>{const s=window.__select,v=s.view,rect=s.game.canvas.getBoundingClientRect(),zoom=s.cameras.main.zoom*rect.width/s.game.canvas.width;
      const target=b=>({width:b.input.hitArea.width*Math.abs(b.scaleX)*zoom,height:b.input.hitArea.height*Math.abs(b.scaleY)*zoom});
      return{page:v.page,visible:v.tiles.filter(t=>t.image.visible).map(t=>t.number),interactive:v.tiles.filter(t=>t.image.input?.enabled).map(t=>t.number),current:s.number,count:s.progress.levelCount,prev:target(v.previousPage),next:target(v.nextPage),label:v.pageLabel.text};});
    const first=await snapshot();
    check(first.page===1&&first.count===32&&first.current===25&&first.visible.join(',')==='25,26,27,28,29,30,31,32'&&first.interactive.join(',')==='25',`${name}: restored second page`);
    check(Math.min(first.prev.width,first.prev.height)>=43.9&&Math.min(first.next.width,first.next.height)>=43.9,`${name}: page arrows too small`);
    await page.screenshot({path:`${root}/screens/levels-25-${name}.png`});
    await click(await page.evaluate(()=>window.__point(window.__select.view.previousPage,window.__select)));
    const previous=await snapshot();check(previous.page===0&&previous.visible.length===24&&previous.interactive.length===24,`${name}: previous page`);
    await click(await page.evaluate(()=>window.__point(window.__select.view.nextPage,window.__select)));
    const next=await snapshot();check(next.page===1&&next.visible.length===8&&next.interactive.join(',')==='25',`${name}: next page`);
    if(!touch){
      await click(await page.evaluate(()=>window.__point(window.__select.view.previousPage,window.__select)));
      await page.evaluate(()=>{window.__select.number=24;window.__select.view.updateSelection();});
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>window.__select.number===25&&window.__select.view.page===1);
      check((await snapshot()).visible[0]===25,`${name}: keyboard crosses 24 to 25`);
    }
    await click(await page.evaluate(()=>window.__point(window.__select.view.tiles[24].image,window.__select)));
    await page.waitForFunction(()=>window.__play?.number===25&&!window.__play.transitioning,null,{timeout:15000});
    const entered=await page.evaluate(()=>({number:window.__play.number,playing:window.__play.status,save:JSON.parse(localStorage.getItem('clone-rush:v1'))}));
    check(entered.playing==='playing'&&entered.save.current===25&&entered.save.completed.length===24&&entered.save.soundVolume===35&&entered.save.musicVolume===20,`${name}: level entry/save`);
    await page.screenshot({path:`${root}/screens/level-25-${name}.png`});
    await click(await page.evaluate(()=>window.__point(window.__play.hud.pauseBadge,window.__play,window.__play.hud.camera)));
    await page.waitForFunction(()=>window.__play.status==='paused');
    await click(await page.evaluate(()=>window.__point(window.__play.hud.actions[2].plate,window.__play,window.__play.hud.camera)));
    await page.waitForFunction(()=>window.__select?.sys.isActive()&&window.__select.view.ready()&&window.__select.view.page===1,null,{timeout:15000});
    const returned=await snapshot();check(returned.current===25&&returned.visible[0]===25,`${name}: pause returns to current page`);
    report.cases.push({name,first,previous,next,entered,returned});
    console.log(JSON.stringify({name,entered:entered.number,returned:returned.page,failures:report.failures}));
    await page.close();
  }
}finally{await browser.close();await writeFile(`${root}/extension-selection-checks.json`,JSON.stringify(report,null,2)+'\n');}
assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);
