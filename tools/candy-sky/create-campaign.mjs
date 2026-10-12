// Authored islands for the Candy Sky campaign. All coordinates are world units.
// Assets and physics remain the approved game kit; these are new puzzle layouts.
import{writeFile}from'node:fs/promises';
const N=3,R=17,J=19,S=25,G=35;
const p=(x,y,width,undersideSupport=false)=>({x,y,width,height:20,undersideSupport});
const a=(type,x,y,angle=0)=>({type,x,y,angle,scaleX:1,scaleY:1});
const c=(type,x,surface)=>a(type,x,type===G?surface-1:surface-20);
const e=(type,x,surface)=>a(type,x,surface-40);
const under=(type,x,bottom)=>a(type,x,bottom);
const k=(x,y)=>a(32,x,y),b=(x,y)=>a(23,x,y),t=(x,surface)=>a(9,x,surface-20);
const maps=[];
function map(name,objective,tutorial,platforms,actors){
 const number=maps.length+1;
 maps.push({id:number,number,name,width:480,height:340,gravity:{x:0,y:100},mapVersion:2,objective,tutorial,platforms,actors:actors.map((actor,i)=>({...actor,instance:i+1,order:i}))});
}
map('First Together','Move the pair to a shared exit.','MOVE TOGETHER\nGuide every clone into a blue portal.',
 [p(40,280,400)], [c(N,70,280),c(N,125,280),e(5,395,280)]);
map('A Little Leap','One shared jump across a broad gap.','ONE JUMP, TWO CLONES\nBlue portals can be used again.',
 [p(30,280,170),p(245,280,205),p(100,320,280)], [c(N,70,280),c(N,110,280),e(5,395,280)]);
map('Different Heights','Jump on parallel routes at different heights.','SAME BUTTONS, DIFFERENT PATHS\nKeep both clones on their islands.',
 [p(40,180,150),p(230,140,210),p(40,300,150),p(230,260,210),p(160,320,160)],
 [c(N,70,180),c(N,70,300),e(5,395,140),e(5,395,260)]);
map('One Use Only','Assign the upper and lower exits.','PINK PORTALS ARE SINGLE USE\nOne clone per pink portal.',
 [p(40,180,140),p(220,220,220),p(40,300,150),p(230,300,210),p(160,320,160)],
 [c(N,70,180),c(N,70,300),e(15,385,220),e(5,385,300)]);
map('Mirror Meadow','Learn the reverse clone without hazards.','PINK CLONES MOVE IN REVERSE\nOne command guides both sides.',
 [p(40,280,400)], [c(N,270,280),c(R,190,280),e(5,395,280),e(5,45,280)]);
map('Mirror Steps','Climb outward, then reverse onto the central summit.','MIRROR STEPS\nGo outward, then turn back toward the summit.',
 [p(190,300,100),p(50,260,100),p(330,260,100),p(150,200,180),p(30,320,420)],
 [c(N,250,300),c(R,210,300),e(5,270,200),e(5,170,200)]);
map('Split Decision','Different heights and single-use assignment.','CHOOSE EACH EXIT\nThe other clone still needs a route.',
 [p(190,300,100),p(50,260,100),p(330,250,100),p(150,200,180),p(30,320,420)],
 [c(N,250,300),c(R,210,300),e(15,270,200),e(5,170,200)]);
map('Sweet Timing','Introduce one trap with a safe approach.','WATCH THE SPIKE\nCross while it is hidden, or jump over it.',
 [p(190,300,100),p(50,260,100),p(330,260,100),p(150,200,180),p(30,320,420)],
 [c(N,250,300),c(R,210,300),e(5,270,200),e(5,170,200),t(310,200)]);
map('Grounded Friend','N jumps while J uses a flat route.','GREEN CLONES CANNOT JUMP\nGive the green clone a walking route.',
 [p(40,180,400),p(40,300,150),p(230,260,210),p(150,320,180)],
 [c(J,70,180),c(N,70,300),e(15,395,180),e(5,395,260)]);
map('First Spring','A no-jump clone uses two flush springs.','SPRINGS LAUNCH GREEN CLONES\nWalk onto a spring, then steer in the air.',
 [p(20,300,120),p(160,300,190),p(370,300,90),p(210,240,90),p(390,240,80)],
 [c(J,65,300),b(140,300),b(350,300),e(5,400,240)]);
map('Spring Partners','N and J share a spring route.','TWO WAYS TO LEAP\nGreen uses springs; white can also jump.',
 [p(20,300,120),p(160,300,160),p(340,300,120),p(200,240,90),p(370,240,90)],
 [c(J,60,300),c(N,100,300),b(140,300),b(320,300),e(5,400,240),e(15,220,240)]);
map('Mirror Springs','Reverse and no-jump use opposite springs.','SPRINGS IN THE MIRROR\nSteer the pink and green clones apart.',
 [p(20,300,120),p(160,300,160),p(340,300,120),p(30,240,110),p(340,240,110)],
 [c(J,270,300),c(R,190,300),b(140,300),b(320,300),e(5,390,240),e(15,45,240)]);
map('Keep Sliding','Learn persistent motion on a broad route.','YELLOW CLONES KEEP MOVING\nUse the opposite direction to turn around.',
 [p(30,300,160),p(230,260,210),p(140,320,200)],
 [c(S,65,300),e(5,395,260)]);
map('Two Rhythms','S moves while N can brake.','TWO RHYTHMS\nWhite brakes when you release. Yellow keeps going.',
 [p(40,180,140),p(220,140,100),p(360,140,90),p(40,300,150),p(230,260,210),p(150,320,180)],
 [c(N,70,180),c(S,70,300),e(5,395,140),e(15,395,260)]);
map('Sliding Mirror','S and R climb outward in opposite directions.','SLIDE AND REVERSE\nRelease to brake pink while yellow keeps going.',
 [p(40,180,400),p(40,300,200),p(280,260,160),p(150,320,180)],
 [c(S,65,180),c(R,210,300),e(15,395,180),e(5,395,260)]);
map('Three Destinations','Two sliding clones consume separate exits.','THREE DESTINATIONS\nReserve one pink exit for each yellow clone.',
 [p(40,100,400),p(40,200,150),p(230,200,210),p(40,300,150),p(230,300,210)],
 [c(N,90,100),c(S,100,200),c(S,100,300),e(5,395,100),e(15,45,200),e(15,395,300)]);
map('The Shared Key','Collect a key before returning to a blue exit.','ONE KEY, ALL BLUE PORTALS\nCollect the golden key before entering.',
 [p(40,300,150),p(230,260,210),p(30,320,420)],
 [c(N,65,300),c(N,110,300),k(320,240),e(5,45,300)]);
map('Under the Clouds','Learn reversed gravity and collect a key on a forgiving ceiling route.','PURPLE CLONES FALL UP\nJump down for the key, then return to the island underside.',
 [p(40,100,400,true)],
 [c(G,70,120),k(245,160),under(5,395,120)]);
map('Above and Below','N and G travel on opposite island faces.','ABOVE AND BELOW\nThe same jump sends purple downward.',
 [p(40,200,150,true),p(230,240,210,true)],
 [c(N,70,200),c(G,125,220),e(5,395,240),under(5,395,260)]);
map('Reverse Gravity','R and G cross mirrored gaps and collect a key.','REVERSE GRAVITY\nCollect the key on the lower route.',
 [p(40,100,150,true),p(230,140,210,true),p(290,300,150),p(40,260,210),p(180,320,120)],
 [c(G,100,120),c(R,360,300),k(105,240),under(5,45,120),e(5,395,300)]);
map('Three Talents','Combine a spring, persistent movement and gravity.','THREE TALENTS\nSprings, sliding and gravity share your controls.',
 [p(30,40,420,true),p(30,180,420),p(20,300,120),p(160,300,190),p(370,300,90),p(220,260,90),p(370,260,90)],
 [c(G,65,60),c(S,65,180),c(J,65,300),b(140,300),b(350,300),k(240,70),under(5,400,60),e(15,400,180),e(5,400,260)]);
map('Keys and Choices','Separate three roles and collect both keys.','KEYS AND CHOICES\nPink exits stay open. Blue needs every key.',
 [p(40,140,400),p(170,300,140),p(40,260,110),p(330,260,110),p(30,320,420)],
 [c(S,100,140),c(N,270,300),c(R,190,300),k(240,120),k(105,240),e(15,45,140),e(5,395,260),e(5,45,260)]);
map('The Last Collector','Leave the remaining G a complete key route.','THE LAST COLLECTOR\nWhoever stays must collect every remaining key.',
 [p(40,80,210,true),p(290,120,150,true),p(40,300,400)],
 [c(G,70,100),c(G,120,100),c(N,70,300),k(150,110),k(200,280),k(310,150),k(395,150),under(15,200,100),e(15,395,300),under(5,45,100)]);
map('Candy Sky Symphony','Coordinate four clones through two keys and timed routes.','CANDY SKY SYMPHONY\nKeep a path for every clone that remains.',
 [p(30,40,140,true),p(210,80,240,true),p(30,180,140),p(210,180,240),p(30,300,140),p(210,260,100),p(350,260,100),p(150,320,220)],
 [c(G,90,60),c(S,130,180),c(N,80,300),c(N,110,300),k(280,160),k(350,110),under(5,45,60),e(5,45,180),e(5,45,300),t(300,260),t(340,180)]);
const ending={id:28,number:null,name:'Together at Last',width:480,height:340,gravity:{x:0,y:100},mapVersion:2,objective:'Bring the team home.',tutorial:'',platforms:[p(40,100,400,true),p(40,280,400)],actors:[c(G,70,120),c(G,125,120),c(N,70,280),c(N,125,280),under(5,395,120),e(5,395,280)].map((actor,i)=>({...actor,instance:i+1,order:i}))};
map('Mirror Relay','Collect two keys, then bring the three routes home.','MIRROR RELAY\nCollect on the outward trip. Return together.',
 [p(40,120,400),p(180,300,120),p(40,260,125),p(315,250,125),p(30,320,420)],
 [c(S,110,120),c(N,275,300),c(R,185,300),k(255,100),k(105,240),e(15,45,120),e(5,395,250),e(5,45,260)]);
map('Spring Orchard','Use the spring pair while white collects the high key.','SPRING ORCHARD\nGreen rides the springs. White takes the high route.',
 [p(20,160,130),p(190,120,120),p(350,160,110),p(20,300,160),p(200,300,140),p(360,300,100),p(370,240,90)],
 [c(N,65,160),c(J,50,300),c(J,90,300),b(180,300),b(340,300),k(265,100),k(390,220),e(15,395,160),e(5,400,240)]);
map('Sliding Switchback','Collect on the far islands, then reverse the two routes.','SLIDING SWITCHBACK\nYellow keeps moving while white brakes.',
 [p(30,150,135),p(205,110,100),p(345,150,105),p(30,300,420)],
 [c(N,65,150),c(S,100,300),k(265,90),k(280,280),e(5,45,150),e(15,45,300)]);
map('Ceiling Couriers','One ceiling courier exits early; the other must return with every key.','CEILING COURIERS\nLeave a courier for the return trip.',
 [p(30,50,150,true),p(220,90,230,true),p(40,300,400)],
 [c(G,70,70),c(G,95,70),c(R,400,300),k(105,280),k(350,120),k(410,120),under(15,390,110),under(5,45,70),e(5,45,300)]);
map('Three-Way Delivery','Deliver three keys before the sliding clone returns through the trap.','THREE-WAY DELIVERY\nFinish each delivery before the last return.',
 [p(40,140,400),p(40,220,160),p(250,220,190),p(40,300,400)],
 [c(R,360,140),c(S,75,220),c(N,70,300),k(220,120),k(350,200),k(360,280),e(15,45,140),e(5,395,220),e(15,395,300),t(310,220)]);
map('Crosswind Springs','Launch green to its exit, then reverse the ceiling and mirror routes.','CROSSWIND SPRINGS\nGreen leaves first. The others still need their return routes.',
 [p(30,40,420,true),p(30,180,420),p(20,300,120),p(160,300,190),p(370,300,90),p(220,260,90),p(370,260,90)],
 [c(G,65,60),c(R,380,180),c(J,65,300),b(140,300),b(350,300),k(410,70),k(100,160),k(375,215),under(5,45,60),e(5,395,180),e(15,400,260)]);
map('Four-Way Rhythm','Four roles collect on opposite sides before reversing for home.','FOUR-WAY RHYTHM\nCollect on every route, then choose the right moment to turn.',
 [p(30,40,420,true),p(30,120,420),p(30,200,150),p(220,200,230),p(30,300,420)],
 [c(G,70,60),c(R,360,120),c(S,70,200),c(N,70,300),k(370,70),k(80,100),k(350,180),k(378,280),under(5,45,60),e(5,395,120),e(15,400,200),e(5,45,300),t(300,200)]);
map('Cloud Convergence','Coordinate all five talents, collect every key and preserve the last route.','CLOUD CONVERGENCE\nFive talents. Every key. Keep a route for whoever remains.',
 [p(30,40,420,true),p(30,140,420),p(30,220,160),p(230,220,220),p(20,300,120),p(160,300,190),p(370,300,90)],
 [c(G,70,60),c(R,360,140),c(S,70,220),c(N,50,300),c(J,90,300),b(140,300),b(350,300),k(365,100),k(300,120),k(350,200),k(390,280),under(5,45,60),e(15,45,140),e(5,45,220),e(15,400,300),e(5,45,300),t(310,220)]);
const data={campaign:{id:'candy-sky-v2',version:2,name:'Candy Sky',levelCount:maps.length},levels:maps,ending};
await writeFile('public/data/levels.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({levels:maps.length,ending:ending.name,islands:maps.reduce((n,l)=>n+l.platforms.length,0)}));
