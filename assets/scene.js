/* United Hub — particle scroll scene: scatter → semi truck → 05:22 clock → globe */
(function(){
  const cv=document.getElementById('pc'); if(!cv) return;
  const ctx=cv.getContext('2d');
  const root=document.documentElement;
  const scene=document.querySelector('.scene');
  const caps=[...document.querySelectorAll('.cap')];
  const hud=[...document.querySelectorAll('.scene-hud span')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // particle colours: 0 body, 1 headlight, 2 tail light, 3 marker light
  const PAL={dark:['46,229,157','255,255,255','255,72,72','255,196,92'],light:['4,122,80','232,132,0','214,40,40','196,112,0']};
  const mobile=innerWidth<720;
  const N=mobile?5200:11000;
  const ROAD=10,PERSP=.048;            // half length of the visible road, in truck units
  let W,H,dpr;

  const R=Math.random;
  function rnd(a,b){return a+R()*(b-a)}

  // sample filled pixels of a drawing into normalized points
  function sample(w,h,draw,count){
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
    x.fillStyle='#fff';x.strokeStyle='#fff';draw(x);
    const d=x.getImageData(0,0,w,h).data,fill=[],edge=[];
    const A=(i,j)=>d[(j*w+i)*4+3]>128;
    for(let j=1;j<h-1;j+=2)for(let i=1;i<w-1;i+=2){
      if(!A(i,j))continue;
      const e=!A(i-2,j)||!A(i+2,j)||!A(i,j-2)||!A(i,j+2);
      (e?edge:fill).push([i,j]);
    }
    const out=[];
    for(let k=0;k<count;k++){
      const src=(R()<.45&&edge.length)?edge:fill;
      const p=src[(R()*src.length)|0];
      out.push([(p[0]-w/2)/w,(p[1]-h/2)/w,src===edge?1:.55]);
    }
    return out;
  }
  function clock(x){
    x.font='600 300px "Space Grotesk", sans-serif';x.textAlign='center';x.textBaseline='middle';
    x.fillText('05:22',500,220);
  }

  /* ---- 3D semi truck (conventional cab + dry van trailer) ----
     Axes: x forward, y up, z across. Each point: [x,y,z,brightness,colour,kind,p1,p2]
     kind 0 static · 1 wheel (x,y = hub, p1 radius, p2 angle) · 2 road (scrolls in x) · 3 light beam */
  function truck3d(n){
    const parts=[];const add=(w,f)=>{if(w>0)parts.push([w,f])};
    const len=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const line=(a,b,br=1,k=1,c=0)=>add(len(a,b)*k,()=>{const t=R();return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,br,c,0,0,0]});
    const quad=(a,b,c,d,br=.4,k=.2)=>add(len(a,b)*len(b,c)*k,()=>{const u=R(),v=R();
      return [0,1,2].map(i=>(a[i]*(1-u)+b[i]*u)*(1-v)+(d[i]*(1-u)+c[i]*u)*v).concat([br,0,0,0,0])});
    const loop=(ps,br,k)=>ps.forEach((p,i)=>line(p,ps[(i+1)%ps.length],br,k));
    // side-profile polygon [x,y] extruded across z
    function prism(poly,z0,z1,ek=1,fk=.2){
      const m=poly.length;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      for(let i=0;i<m;i++){const p=poly[i],q=poly[(i+1)%m];
        x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);
        line([p[0],p[1],z0],[q[0],q[1],z0],1,ek);line([p[0],p[1],z1],[q[0],q[1],z1],1,ek);
        line([p[0],p[1],z0],[p[0],p[1],z1],1,ek);
        quad([p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1],.4,fk);
      }
      const inside=(x,y)=>{let c=false;for(let i=0,j=m-1;i<m;j=i++){const a=poly[i],d=poly[j];if((a[1]>y)!==(d[1]>y)&&x<(d[0]-a[0])*(y-a[1])/(d[1]-a[1])+a[0])c=!c}return c};
      add((x1-x0)*(y1-y0)*fk*1.6,()=>{for(let k=0;k<30;k++){const x=rnd(x0,x1),y=rnd(y0,y1);if(inside(x,y))return [x,y,R()<.5?z0:z1,.4,0,0,0,0]}return [poly[0][0],poly[0][1],z0,.4,0,0,0,0]});
    }
    const box=(x0,x1,y0,y1,z0,z1,ek,fk)=>prism([[x0,y0],[x0,y1],[x1,y1],[x1,y0]],z0,z1,ek,fk);
    // wheel: rims, hub ring, spokes and tread — rotates at draw time
    function wheel(cx,cy,cz,r,w,out){
      const zo=cz+out*w/2,zi=cz-out*w/2,W8=k=>[cx,cy,k,0,0,1,0,0];
      const pt=(z,rad,ang,b)=>{const p=W8(z);p[3]=b;p[6]=rad;p[7]=ang;return p};
      add(4.2*r,()=>pt(R()<.7?zo:zi,r,R()*6.283,1));                  // tyre rims
      add(1.6*r,()=>pt(zo,r*.56,R()*6.283,.9));                        // wheel rim
      add(.5*r,()=>pt(zo,r*.16,R()*6.283,1));                          // hub
      add(2.2*r,()=>pt(zo,r*rnd(.16,.56),((R()*5)|0)*1.2566,.85));     // five spokes
      add(2.4*r*w/.3,()=>pt(rnd(zi,zo),r,R()*6.283,.45));              // tread
    }
    const ring=(c,r,ax,br,k)=>add(6.283*r*k,()=>{const a=R()*6.283,u=Math.cos(a)*r,v=Math.sin(a)*r;
      return ax==='x'?[c[0],c[1]+u,c[2]+v,br,0,0,0,0]:ax==='y'?[c[0]+u,c[1],c[2]+v,br,0,0,0,0]:[c[0]+u,c[1]+v,c[2],br,0,0,0,0]});
    const tube=(a,b,r,ax,br,k)=>add(len(a,b)*6.283*r*k,()=>{const t=R(),an=R()*6.283,u=Math.cos(an)*r,v=Math.sin(an)*r,p=[0,1,2].map(i=>a[i]+(b[i]-a[i])*t);
      if(ax==='x'){p[1]+=u;p[2]+=v}else{p[0]+=u;p[2]+=v}return p.concat([br,0,0,0,0])});
    const lamp=(c,r,col,w,br=1.5)=>add(w,()=>{const a=R()*6.283,b=Math.acos(2*R()-1),q=r*Math.cbrt(R());
      return [c[0]+q*Math.sin(b)*Math.cos(a)*.4,c[1]+q*Math.sin(b)*Math.sin(a),c[2]+q*Math.cos(b),br,col,0,0,0]});

    for(const s of [-1,1]){
      const z=.82*s;
      // trailer side ribs, underframe rail, landing gear
      for(let x=-5.2;x<2.2;x+=.62)line([x,.98,z],[x,3.25,z],.55,.45);
      line([-5.8,.9,.5*s],[2.3,.9,.5*s],.6,.6);
      line([.9,.06,.5*s],[.9,.98,.5*s],.9,1);line([.75,.06,.5*s],[1.05,.06,.5*s],.9,1);
      // trailer tandem + tractor drive axles + steer axle
      for(const x of [-4.75,-3.6])wheel(x,.46,.6*s,.46,.42,s);
      for(const x of [1.35,2.45])wheel(x,.46,.6*s,.46,.42,s);
      wheel(5.2,.46,.68*s,.46,.3,s);
      // front fender arch
      for(const zz of [.6*s,.84*s])add(1.1,()=>{const a=R()*3.1416;return [5.2+Math.cos(a)*.6,.46+Math.sin(a)*.6,zz,1,0,0,0,0]});
      add(.5,()=>{const a=R()*3.1416;return [5.2+Math.cos(a)*.6,.46+Math.sin(a)*.6,rnd(.6,.84)*s,.45,0,0,0,0]});
      // door, side window, sleeper window
      loop([[3.78,2.05,.805*s],[3.78,2.7,.805*s],[4.28,2.7,.805*s],[4.6,2.05,.805*s]],1,.9);
      line([3.7,.95,.805*s],[3.7,2.9,.805*s],.5,.5);
      loop([[3.1,2.2,.805*s],[3.1,2.6,.805*s],[3.5,2.6,.805*s],[3.5,2.2,.805*s]],.8,.7);
      // mirror + arm, exhaust stack, fuel tank, cab steps
      loop([[4.6,2.0,1.02*s],[4.6,2.55,1.02*s],[4.6,2.55,1.1*s],[4.6,2.0,1.1*s]],1,1);
      line([4.5,2.45,.8*s],[4.6,2.45,1.02*s],.8,1);line([4.5,2.1,.8*s],[4.6,2.1,1.02*s],.8,1);
      tube([2.72,1.0,.74*s],[2.72,3.78,.74*s],.075,'y',.9,1.6);
      ring([2.72,3.78,.74*s],.075,'y',1,2);
      tube([3.0,.74,.7*s],[4.25,.74,.7*s],.27,'x',.5,.5);
      ring([3.0,.74,.7*s],.27,'x',1,1);ring([4.25,.74,.7*s],.27,'x',1,1);
      // lights
      lamp([6.05,1.12,.66*s],.11,1,3.2,1.8);            // headlights
      lamp([6.2,.6,.5*s],.05,3,.7);                      // fog
      lamp([-5.82,1.12,.64*s],.08,2,1.6);                // tail
      lamp([2.3,3.24,.72*s],.03,3,.4);                   // trailer front marker
      lamp([-5.8,3.24,.72*s],.03,2,.4);                  // trailer rear marker
      // windshield half (with centre divider drawn once below)
      loop([[4.34,2.72,.06*s],[4.34,2.72,.7*s],[4.66,2.06,.7*s],[4.66,2.06,.06*s]],1,1);
    }
    for(const z of [-.5,-.25,0,.25,.5])lamp([4.1,3.33,z],.03,3,.3);           // roof marker lights
    for(const z of [-.12,0,.12])lamp([-5.8,3.24,z],.03,2,.25);

    // trailer body + rear doors + bumper
    box(-5.8,2.3,.98,3.25,-.82,.82,1,.16);
    line([-5.8,.98,0],[-5.8,3.25,0],.8,.8);
    for(const z of [-.32,.32])line([-5.8,1.05,z],[-5.8,3.18,z],.6,.6);
    line([-5.86,.55,-.8],[-5.86,.55,.8],1,1);
    for(const z of [-.55,.55])line([-5.86,.55,z],[-5.8,.98,z],.8,1);
    // tractor frame + fifth wheel
    box(.9,5.6,.52,.72,-.42,.42,.7,.1);
    ring([1.9,.95,0],.46,'y',1,.8);ring([1.9,.95,0],.2,'y',.7,.8);
    // sleeper + cab with roof fairing, then hood, grille, bumper
    prism([[2.85,.78],[2.85,3.0],[3.15,3.32],[3.95,3.32],[4.3,2.8],[4.7,1.98],[4.7,.78]],-.8,.8,1.1,.2);
    prism([[4.7,.78],[4.7,1.98],[5.9,1.76],[6.02,1.6],[6.02,.78]],-.6,.6,1.1,.2);
    for(let z=-.4;z<=.401;z+=.1)line([6.04,.86,z],[6.04,1.58,z],1,1.1);
    loop([[6.04,.84,-.44],[6.04,1.6,-.44],[6.04,1.6,.44],[6.04,.84,.44]],1,1.2);
    box(6.02,6.2,.42,.8,-.86,.86,1.1,.3);

    const body=parts.reduce((a,p)=>a+p[0],0);
    // light beams
    for(const s of [-1,1])add(body*.035,()=>{const t=Math.pow(R(),.7),a=R()*6.283,r=(.1+t*1.15)*Math.sqrt(R());
      return [6.1+t*5.2,1.12-t*.75+Math.sin(a)*r*.55,.66*s+Math.cos(a)*r,Math.pow(1-t,1.6)*.55,1,3,0,0]});
    // road: lane dashes, shoulders, asphalt speckle
    for(const z of [-1.75,1.75])add(body*.035,()=>{let x;do{x=rnd(-ROAD,ROAD)}while((((x+ROAD)/1.6)|0)%2);return [x,0,z+rnd(-.04,.04),.95,0,2,0,0]});
    for(const z of [-3.5,3.5])add(body*.03,()=>[rnd(-ROAD,ROAD),0,z,.5,0,2,0,0]);
    add(body*.06,()=>[rnd(-ROAD,ROAD),0,rnd(-3.5,3.5),.2,0,2,0,0]);

    const tot=parts.reduce((a,p)=>a+p[0],0),out=[];
    for(let i=0;i<n;i++){let q=R()*tot,k=0;while(k<parts.length-1&&q>parts[k][0]){q-=parts[k][0];k++}out.push(parts[k][1]())}
    return out;
  }

  let P=[],T1,T2,G=[];
  function land(lat,lon){return Math.sin(lon*2.1+.5)*Math.cos(lat*2.7)+.6*Math.sin(lon*3.7-lat*2.2+1.3)+.4*Math.cos(lon*5.3+lat*4.1)+.3*Math.sin(lat*6+lon*1.3)}
  function build(){
    T1=truck3d(N);
    T2=sample(1000,440,clock,N);
    G=[];const ga=Math.PI*(3-Math.sqrt(5)),M=N*3;
    for(let i=0;i<M&&G.length<N;i++){
      const y=1-(i/(M-1))*2,r=Math.sqrt(1-y*y),th=ga*i,x=Math.cos(th)*r,z=Math.sin(th)*r;
      const isl=land(Math.asin(y),Math.atan2(z,x))>.35;
      if(!isl&&R()>.25)continue;G.push([x,y,z,isl?1:.45]);
    }
    while(G.length<N)G.push(G[(R()*G.length)|0]);
    P=[];
    for(let i=0;i<N;i++)P.push({s:[rnd(-.75,.75),rnd(-.45,.45),rnd(.2,.8)],d:R(),w:rnd(.6,1.6),ph:R()*6.28});
  }

  function resize(){dpr=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr}
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function local(p,a,b,d){return ease(clamp((p-a)/(b-a)*1.35-d*.35,0,1))}

  let rot=0,last=0,prog=0,vis=true;
  new IntersectionObserver(es=>{vis=es[0].isIntersecting},{rootMargin:'200px'}).observe(scene);
  function progress(){const r=scene.getBoundingClientRect(),total=r.height-innerHeight;return clamp(-r.top/total,0,1)}

  function frame(now){
    requestAnimationFrame(frame);
    if(!vis)return;
    const dt=Math.min(50,now-last);last=now;
    const t=reduce?0:now;
    if(!reduce)rot+=dt*.00015;
    const target=progress();prog+=(target-prog)*(reduce?1:.12);
    const p=prog,light=root.dataset.theme==='light',pal=light?PAL.light:PAL.dark,gain=light?1.25:1;
    const S=Math.min(W*.82,H*1.55),cx=W/2,cy=H*.44;
    const cr=Math.cos(rot),sr=Math.sin(rot),tilt=.35,ct=Math.cos(tilt),st=Math.sin(tilt),Rg=Math.min(W,H)*.30;
    // truck camera: front three-quarter view, slowly swinging, orbiting a little with scroll
    const yaw=.92+Math.sin(t*.00035)*.16+(p-.2)*.6,pit=-.24,cY=Math.cos(yaw),sY=Math.sin(yaw),cP=Math.cos(pit),sP=Math.sin(pit);
    const U=S/(mobile?8.2:12.2),ty0=cy-H*(mobile?.04:.08);
    const wang=t*.0085,road=t*.0039,bob=Math.sin(t*.006)*.012;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation=light?'source-over':'lighter';

    // headlight flares, only while the truck is assembled
    const kt=local(p,.06,.22,.6)*(1-local(p,.36,.50,.1));
    if(kt>.02)for(const s of [-1,1]){
      const X3=6.08*cY+.66*s*sY,Z3=-6.08*sY+.66*s*cY,Yp=(1.12-1.6)*cP-Z3*sP,Zp=(1.12-1.6)*sP+Z3*cP,f=1/(1+Zp*PERSP);
      const fx=cx+X3*U*f,fy=ty0-Yp*U*f,fr=U*1.5*f,g=ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
      const c=light?'255,176,48':'214,255,238',a=(light?.5:.42)*kt*(.9+.1*Math.sin(t*.02+s));
      g.addColorStop(0,`rgba(${c},${a})`);g.addColorStop(.25,`rgba(${c},${a*.35})`);g.addColorStop(1,`rgba(${c},0)`);
      ctx.fillStyle=g;ctx.fillRect(fx-fr,fy-fr,fr*2,fr*2);
    }

    for(let i=0;i<N;i++){
      const q=P[i],a=T1[i],b=T2[i],g=G[i];
      const k1=local(p,.06,.22,q.d),k2=local(p,.36,.50,q.d),k3=local(p,.64,.78,q.d);
      const sx=q.s[0]+Math.sin(t*.0003*q.w+q.ph)*.02,sy=q.s[1]+Math.cos(t*.00035*q.w+q.ph)*.02;
      let x=sx*W*1.1+cx,y=sy*H*1.6+cy,al=q.s[2]*.5,sz=1.1,col=0;
      if(k1>0&&k2<1){
        let ax=a[0],ay=a[1],ab=a[3];const az=a[2],kind=a[5];
        if(kind===1){const an=a[7]-wang;ax+=Math.cos(an)*a[6];ay+=Math.sin(an)*a[6]}
        else if(kind===2){ax=((a[0]-road)%(2*ROAD)+2*ROAD)%(2*ROAD)-ROAD;ab*=1-Math.pow(Math.abs(ax)/ROAD,2)}
        else{ay+=bob;if(kind===3)ab*=.6+.4*Math.sin(t*.004+q.ph)}
        const X3=ax*cY+az*sY,Z3=-ax*sY+az*cY,Yp=(ay-1.6)*cP-Z3*sP,Zp=(ay-1.6)*sP+Z3*cP;
        const f=1/(1+Zp*PERSP),tx=cx+X3*U*f,ty=ty0-Yp*U*f;
        const ta=ab*(.32+.68*clamp(.55-Zp*.2,0,1));
        x+=(tx-x)*k1;y+=(ty-y)*k1;al+=(ta-al)*k1;sz+=((kind===3?1.5:a[4]?2.9:1.75)*f-sz)*k1;
        if(k1>.5&&k2<.5)col=a[4];
      }
      if(k2>0){const ox=cx+b[0]*S*.9,oy=cy+b[1]*S*.9;x+=(ox-x)*k2;y+=(oy-y)*k2;al+=(b[2]-al)*k2;sz+=(1.5-sz)*k2}
      if(k3>0){
        const x2=g[0]*cr+g[2]*sr,z2=-g[0]*sr+g[2]*cr,y3=g[1]*ct-z2*st,z3=g[1]*st+z2*ct;
        const gx=cx+x2*Rg,gy=cy-y3*Rg,gal=(z3<0?.06:(.35+.75*z3))*g[3];
        x+=(gx-x)*k3;y+=(gy-y)*k3;al+=(gal-al)*k3;
      }
      const tw=.75+.25*Math.sin(t*.003+q.ph);
      const A=Math.min(1,Math.max(0,al*tw*gain));
      if(A<.02)continue;
      ctx.fillStyle=`rgba(${pal[col]},${A})`;ctx.fillRect(x,y,sz,sz);
      if(A>.5&&!light){ctx.fillStyle=`rgba(${pal[col]},${A*.07})`;ctx.fillRect(x-2,y-2,sz+4,sz+4)}
    }
    ctx.globalCompositeOperation='source-over';
    const st2=p<.06?0:p<.34?1:p<.62?2:3;
    caps.forEach((c,i)=>c.classList.toggle('on',i===st2&&(i===0||(p>.18&&p<.34)||(p>.46&&p<.62)||p>.74)));
    hud.forEach((h,i)=>h.classList.toggle('on',i+1===st2));
  }

  resize();addEventListener('resize',resize);
  (document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{build();requestAnimationFrame(frame)});
})();
