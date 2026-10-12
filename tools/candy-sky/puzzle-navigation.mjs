// Relaxed geometric distance for exploration. Ignores gravity and trap timing;
// a finite value is never a certificate that the puzzle can be solved.
export function navigation(world){
  const step=5,minX=-40,minY=-40,cols=113,rows=79,size=cols*rows;
  const blocks=[...world.floating.platforms,...world.objects.filter(o=>o.type===23).map(o=>({...o.instance,width:20,height:20}))];
  const blocked=new Uint8Array(size);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=minX+i*step,y=minY+j*step;
    blocked[j*cols+i]=blocks.some(p=>x>p.x-9.45&&x<p.x+p.width+9.45&&y>p.y-9.45&&y<p.y+p.height+9.45);
  }
  const fields=new Map();
  function field(object){
    if(fields.has(object))return fields.get(object);
    const d=new Float64Array(size);d.fill(Infinity);
    const heap=[];
    function push(v){let i=heap.length;heap.push(v);while(i>0){const p=(i-1)>>1;if(heap[p][0]<=v[0])break;heap[i]=heap[p];i=p;}heap[i]=v;}
    function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;}
    const b=object.body.bounds;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const k=j*cols+i,x=minX+i*step,y=minY+j*step;
      if(!blocked[k]&&x>b.min.x-9.5&&x<b.max.x+9.5&&y>b.min.y-9.5&&y<b.max.y+9.5){d[k]=0;push([0,k]);}
    }
    while(heap.length){
      const [cost,k]=pop();if(cost!==d[k])continue;const i=k%cols,j=Math.floor(k/cols);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;const x=i+dx,y=j+dy,n=y*cols+x;
        if(x<0||x>=cols||y<0||y>=rows||blocked[n]||dx&&dy&&(blocked[j*cols+x]||blocked[y*cols+i]))continue;
        const v=cost+step*Math.hypot(dx,dy);if(v<d[n]){d[n]=v;push([v,n]);}
      }
    }
    fields.set(object,d);return d;
  }
  return (clone,object)=>{
    const d=field(object),p=clone.body.position,i=Math.round((p.x-minX)/step),j=Math.round((p.y-minY)/step);
    let result=Infinity;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=i+dx,y=j+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
      result=Math.min(result,d[y*cols+x]+Math.hypot(minX+x*step-p.x,minY+y*step-p.y));
    }
    return Number.isFinite(result)?result:1200;
  };
}
