/* United Hub — particle scroll scene: scatter → semi truck → 05:22 clock → globe */
(function(){
  const cv=document.getElementById('pc'); if(!cv) return;
  const ctx=cv.getContext('2d');
  const root=document.documentElement;
  const scene=document.querySelector('.scene');
  const caps=[...document.querySelectorAll('.cap')];
  const hud=[...document.querySelectorAll('.scene-hud span')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // particle colours: 0 body · 1 headlight · 2 red light · 3 amber light · 4 chrome / lettering
  const PAL={dark:['46,229,157','255,255,255','255,72,72','255,196,92','226,255,243'],
             light:['4,122,80','232,132,0','214,40,40','196,112,0','5,52,36']};
  const NC=5,NL=10;           // colours × alpha levels = draw buckets
  const mobile=innerWidth<720;
  const N=mobile?7000:16000;
  const ROAD=10,PERSP=.048;
  const ST=15;                // floats per truck point
  let W,H,dpr;

  const R=Math.random;
  function rnd(a,b){return a+R()*(b-a)}

  // sample filled pixels of a drawing: returns {fill,edge} pixel lists
  function pixels(w,h,draw){
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
    x.fillStyle='#fff';x.strokeStyle='#fff';draw(x);
    const d=x.getImageData(0,0,w,h).data,fill=[],edge=[];
    const A=(i,j)=>d[(j*w+i)*4+3]>128;
    for(let j=1;j<h-1;j+=2)for(let i=1;i<w-1;i+=2){
      if(!A(i,j))continue;
      const e=!A(i-2,j)||!A(i+2,j)||!A(i,j-2)||!A(i,j+2);
      (e?edge:fill).push([i,j]);
    }
    return {fill,edge};
  }
  function sample(w,h,draw,count){
    const {fill,edge}=pixels(w,h,draw),out=[];
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
     Axes: x forward, y up, z across.
     Point: [x,y,z, brightness, colour, kind, p1,p2, n1xyz, n2xyz, cull]
     kind 0 static · 1 wheel (x,y hub; p1 radius, p2 angle) · 2 road · 3 light (flickers)
          4 wind streak · 5 exhaust smoke (p1 drift, p2 phase)
     cull 0 always drawn · 1 shaded face (n1) · 2 edge / decal, drawn when n1 or n2 faces the camera */
  function truck3d(n){
    const parts=[];const add=(w,f)=>{if(w>0)parts.push([w,f])};
    const Z3=[0,0,0];
    const P=(x,y,z,b,col=0,kind=0,p1=0,p2=0,n1=Z3,n2=n1,cull=0)=>[x,y,z,b,col,kind,p1,p2,n1[0],n1[1],n1[2],n2[0],n2[1],n2[2],cull];
    const len=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    // line: with normals it is an edge between two faces (or a decal on one face)
    const line=(a,b,br=1,k=1,col=0,n1,n2)=>add(len(a,b)*k,()=>{const t=R();
      return P(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,br,col,0,0,0,n1||Z3,n2||n1||Z3,n1?2:0)});
    const loop=(ps,br,k,col,nrm)=>ps.forEach((p,i)=>line(p,ps[(i+1)%ps.length],br,k,col,nrm));
    const quad=(a,b,c,d,nrm,br=.5,k=.5,col=0)=>add(len(a,b)*len(b,c)*k,()=>{const u=R(),v=R(),q=[0,1,2].map(i=>(a[i]*(1-u)+b[i]*u)*(1-v)+(d[i]*(1-u)+c[i]*u)*v);
      return P(q[0],q[1],q[2],br,col,0,0,0,nrm,nrm,1)});
    // clockwise side-profile polygon [x,y] extruded across z
    function prism(poly,z0,z1,ek=1,fk=.5,col=0){
      const m=poly.length,nz0=[0,0,-1],nz1=[0,0,1],nrm=[];
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      for(let i=0;i<m;i++){const p=poly[i],q=poly[(i+1)%m],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);nrm.push([-dy/l,dx/l,0])}
      for(let i=0;i<m;i++){const p=poly[i],q=poly[(i+1)%m],nn=nrm[i],np=nrm[(i+m-1)%m];
        x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);
        line([p[0],p[1],z0],[q[0],q[1],z0],1,ek,col,nn,nz0);line([p[0],p[1],z1],[q[0],q[1],z1],1,ek,col,nn,nz1);
        line([p[0],p[1],z0],[p[0],p[1],z1],1,ek,col,nn,np);
        quad([p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1],nn,.5,fk,col);
      }
      const inside=(x,y)=>{let c=false;for(let i=0,j=m-1;i<m;j=i++){const a=poly[i],d=poly[j];if((a[1]>y)!==(d[1]>y)&&x<(d[0]-a[0])*(y-a[1])/(d[1]-a[1])+a[0])c=!c}return c};
      for(const [z,nn] of [[z0,nz0],[z1,nz1]])add((x1-x0)*(y1-y0)*fk*.8,()=>{for(let k=0;k<30;k++){const x=rnd(x0,x1),y=rnd(y0,y1);if(inside(x,y))return P(x,y,z,.5,col,0,0,0,nn,nn,1)}return P(poly[0][0],poly[0][1],z,.5,col,0,0,0,nn,nn,1)});
    }
    const box=(x0,x1,y0,y1,z0,z1,ek,fk,col)=>prism([[x0,y0],[x0,y1],[x1,y1],[x1,y0]],z0,z1,ek,fk,col);
    // wheel: only the outward face is ever seen; spins at draw time
    function wheel(cx,cy,cz,r,w,s){
      const zo=cz+s*w/2,zi=cz-s*w/2,nn=[0,0,s];
      const pt=(z,rad,ang,b,col,cull)=>P(cx,cy,z,b,col,1,rad,ang,nn,nn,cull);
      add(5.2*r,()=>pt(zo,r,R()*6.283,1,0,2));                               // tyre edge
      add(3.4*r,()=>pt(zo,r*rnd(.6,1),R()*6.283,.3,0,2));                    // sidewall
      add(2.6*r,()=>pt(zo+s*.02,r*.58,R()*6.283,1,4,2));                     // rim
      add(.9*r,()=>pt(zo+s*.03,r*rnd(0,.16),R()*6.283,1,4,2));               // hub cap
      add(3*r,()=>pt(zo+s*.02,r*rnd(.16,.58),((R()*6)|0)*1.0472,.9,4,2));    // six spokes
      add(3*r*w/.3,()=>pt(rnd(zi,zo),r,R()*6.283,.3,0,0));                   // tread
    }
    const tube=(a,b,r,ax,br,k,col=0)=>add(len(a,b)*6.283*r*k,()=>{const t=R(),an=R()*6.283,u=Math.cos(an),v=Math.sin(an),p=[0,1,2].map(i=>a[i]+(b[i]-a[i])*t);
      const nn=ax==='x'?[0,u,v]:[u,0,v];if(ax==='x'){p[1]+=u*r;p[2]+=v*r}else{p[0]+=u*r;p[2]+=v*r}
      return P(p[0],p[1],p[2],br,col,0,0,0,nn,nn,1)});
    const disc=(c,r,nrm,br,k,col=0)=>add(3.14*r*r*k+6.283*r*k*.3,()=>{const a=R()*6.283,q=R()<.5?r:r*Math.sqrt(R());
      return P(c[0],c[1]+Math.cos(a)*q,c[2]+Math.sin(a)*q,q===r?1:br,col,0,0,0,nrm,nrm,2)});
    const lamp=(c,r,col,w,nrm,br=1.6)=>add(w,()=>{const a=R()*6.283,q=r*Math.sqrt(R());
      const p=nrm[0]?[c[0],c[1]+Math.sin(a)*q,c[2]+Math.cos(a)*q]:nrm[1]?[c[0]+Math.sin(a)*q,c[1],c[2]+Math.cos(a)*q]:[c[0]+Math.cos(a)*q,c[1]+Math.sin(a)*q,c[2]];
      return P(p[0],p[1],p[2],br,col,3,0,0,nrm,nrm,2)});
    const FX=[1,0,0],UP=[0,1,0];

    // ---- trailer ----
    box(-5.8,2.3,.98,3.25,-.82,.82,1.1,.42);
    for(const s of [-1,1]){
      const z=.826*s,ns=[0,0,s];
      for(let x=-5.5;x<2.2;x+=.31)line([x,1.02,z],[x,3.2,z],.42,.5,0,ns);            // corrugation
      line([-5.8,1.0,z],[2.3,1.0,z],1,1.2,4,ns);line([-5.8,3.22,z],[2.3,3.22,z],1,1.2,4,ns); // rails
      for(let x=-5.4;x<2.3;x+=1.5)lamp([x,1.0,z],.035,3,.5,ns);                       // side markers
      lamp([-5.72,1.0,z],.04,2,.5,ns);
      line([.9,.06,.5*s],[.9,.98,.5*s],.8,1);line([.74,.06,.5*s],[1.06,.06,.5*s],.8,1);     // landing gear
      quad([-5.35,.1,.42*s],[-5.35,.1,.8*s],[-5.35,.82,.8*s],[-5.35,.82,.42*s],[-1,0,0],.5,.9); // mud flap
      // side skirt
      quad([-2.9,.42,.8*s],[.6,.42,.8*s],[.6,.98,.8*s],[-2.9,.98,.8*s],ns,.42,.5);
      loop([[-2.9,.42,z],[.6,.42,z],[.6,.98,z],[-2.9,.98,z]],.9,.8,0,ns);
      for(const x of [-4.75,-3.6])wheel(x,.46,.6*s,.46,.42,s);
    }
    // ---- tractor: frame rails, drive + steer axles ----
    for(const s of [-1,1]){
      const ns=[0,0,s];
      line([.9,.62,.44*s],[4.7,.62,.44*s],.6,.8);
      for(const x of [1.35,2.45])wheel(x,.46,.6*s,.46,.42,s);
      wheel(5.2,.46,.68*s,.46,.3,s);
      // rear fenders over the drive axles
      add(1.6,()=>{const x=rnd(.8,3.0);return P(x,.98,rnd(.38,.84)*s,.45,0,0,0,0,UP,UP,1)});
      line([.8,.98,.84*s],[3.0,.98,.84*s],1,1,0,UP,ns);
      // front fender arch
      add(1.5,()=>{const a=R()*3.1416;return P(5.2+Math.cos(a)*.6,.46+Math.sin(a)*.6,.84*s,1,0,0,0,0,ns,[Math.cos(a),Math.sin(a),0],2)});
      add(1.3,()=>{const a=R()*3.1416,nn=[Math.cos(a),Math.sin(a),0];return P(5.2+nn[0]*.6,.46+nn[1]*.6,rnd(.6,.84)*s,.5,0,0,0,0,nn,nn,1)});
      // door, side window, sleeper window, grab handle, steps
      const zc=.806*s;
      loop([[3.78,2.05,zc],[3.78,2.7,zc],[4.28,2.7,zc],[4.6,2.05,zc]],1,1.2,4,ns);
      quad([3.78,2.05,zc],[3.78,2.7,zc],[4.28,2.7,zc],[4.6,2.05,zc],ns,.22,.9,4);
      loop([[3.72,.95,zc],[3.72,2.86,zc],[4.64,2.86,zc],[4.64,.95,zc]],.55,.6,0,ns);
      loop([[3.08,2.15,zc],[3.08,2.62,zc],[3.52,2.62,zc],[3.52,2.15,zc]],.9,1,4,ns);
      line([3.62,1.5,zc],[3.62,2.5,zc],1,1,4,ns);
      for(const y of [.5,.78])line([3.75,y,.84*s],[4.55,y,.84*s],.9,1,4,ns,UP);
      // mirror + arms
      box(4.58,4.64,2.0,2.56,Math.min(1.0*s,1.1*s),Math.max(1.0*s,1.1*s),1,2,4);
      line([4.5,2.48,.8*s],[4.6,2.48,1.0*s],.8,1,4);line([4.5,2.08,.8*s],[4.6,2.08,1.0*s],.8,1,4);
      // chrome exhaust stack + fuel tank
      tube([2.72,1.0,.74*s],[2.72,3.8,.74*s],.08,'y',1,2.6,4);
      tube([3.0,.74,.7*s],[4.25,.74,.7*s],.27,'x',.75,1.1,4);
      disc([4.25,.74,.7*s],.27,FX,.4,1.2,4);
      for(const x of [3.3,3.95])add(.5,()=>{const a=R()*6.283;return P(x,.74+Math.cos(a)*.275,.7*s+Math.sin(a)*.275,1,0,0,0,0,[0,Math.cos(a),Math.sin(a)],undefined,1)});
      // lights
      lamp([6.045,1.12,.66*s],.115,1,3.4,FX,1.9);
      loop([[6.045,.96,.5*s],[6.045,1.28,.5*s],[6.045,1.28,.82*s],[6.045,.96,.82*s]],1,1.2,4,FX);
      lamp([6.21,.6,.5*s],.05,3,.8,FX);
      lamp([5.3,1.5,.606*s],.035,3,.4,ns);
      // windshield half: frame + glass
      loop([[4.34,2.72,.05*s],[4.34,2.72,.7*s],[4.66,2.06,.7*s],[4.66,2.06,.05*s]],1,1.3,4,[.9,.44,0]);
      quad([4.34,2.72,.05*s],[4.34,2.72,.7*s],[4.66,2.06,.7*s],[4.66,2.06,.05*s],[.9,.44,0],.2,1.1,4);
      // hood crease
      line([4.72,1.99,.3*s],[5.9,1.77,.3*s],.7,.8,0,[.18,.98,0]);
    }
    for(const z of [-.5,-.25,0,.25,.5])lamp([4.12,3.33,z],.035,3,.35,UP);
    // sleeper + cab with roof fairing, hood, grille, bumper
    prism([[2.85,.78],[2.85,3.0],[3.15,3.32],[3.95,3.32],[4.3,2.8],[4.7,1.98],[4.7,.78]],-.8,.8,1.2,.48);
    prism([[4.7,.78],[4.7,1.98],[5.9,1.76],[6.02,1.6],[6.02,.78]],-.6,.6,1.2,.48);
    for(let z=-.4;z<=.401;z+=.08)line([6.04,.86,z],[6.04,1.58,z],1,1.2,4,FX);
    loop([[6.04,.84,-.44],[6.04,1.6,-.44],[6.04,1.6,.44],[6.04,.84,.44]],1,1.5,4,FX);
    box(6.02,6.2,.42,.8,-.86,.86,1.2,1.1,4);
    // rear doors (seen only if the camera swings behind)
    line([-5.81,.98,0],[-5.81,3.25,0],.8,.8,0,[-1,0,0]);
    for(const z of [-.64,.64])lamp([-5.81,1.12,z],.08,2,1,[-1,0,0]);

    // ---- lettering on both trailer sides ----
    const TW=900,TH=96,tx=pixels(TW,TH,x=>{x.font='600 70px Inter, "Space Grotesk", sans-serif';x.textAlign='center';x.textBaseline='middle';
      try{x.letterSpacing='14px'}catch(e){} x.fillText('UNITED HUB',TW/2,TH/2+2)});
    const tp=tx.fill.concat(tx.edge),XA=-4.95,XL=6.4;
    const body=parts.reduce((a,p)=>a+p[0],0);
    if(tp.length)for(const [s,wgt] of [[-1,.085],[1,.03]])add(body*wgt,()=>{const p=tp[(R()*tp.length)|0],u=(p[0]+R()*2)/TW,v=(TH/2-p[1]-R()*2)/TW;
      return P(s<0?XA+u*XL:XA+XL-u*XL,2.12+v*XL,.832*s,1,4,0,0,0,[0,0,s],[0,0,s],2)});

    // ---- atmosphere: beams, light pool, road, wind, smoke ----
    for(const s of [-1,1]){
      add(body*.022,()=>{const t=Math.pow(R(),.7),a=R()*6.283,r=(.1+t*1.1)*Math.sqrt(R());
        return P(6.1+t*5,1.12-t*.8+Math.sin(a)*r*.5,.66*s+Math.cos(a)*r,Math.pow(1-t,1.6)*.5,1,3)});
      add(body*.03,()=>{const t=Math.pow(R(),.8),a=R()*6.283,r=Math.sqrt(R());
        return P(7.4+t*4.5+Math.sin(a)*r*.9,0,.66*s+Math.cos(a)*r*(.5+t*1.2),(1-t)*.6,1,3)});
      add(body*.012,()=>P(2.72,3.8,.74*s,.5,4,5,rnd(-.5,.5),R()));
    }
    for(const z of [-1.75,1.75])add(body*.03,()=>{let x;do{x=rnd(-ROAD,ROAD)}while((((x+ROAD)/1.6)|0)%2);return P(x,0,z+rnd(-.05,.05),.95,4,2)});
    for(const z of [-3.5,3.5])add(body*.025,()=>P(rnd(-ROAD,ROAD),0,z,.5,0,2));
    add(body*.05,()=>P(rnd(-ROAD,ROAD),0,rnd(-3.5,3.5),.2,0,2));
    add(body*.03,()=>{const s=R()<.5?-1:1;return P(rnd(-ROAD,ROAD),rnd(.3,3.9),s*rnd(1.15,2.9),.3,0,4)});

    const tot=parts.reduce((a,p)=>a+p[0],0),out=new Float32Array(n*ST);
    for(let i=0;i<n;i++){let q=R()*tot,k=0;while(k<parts.length-1&&q>parts[k][0]){q-=parts[k][0];k++}out.set(parts[k][1](),i*ST)}
    return out;
  }

  let P=[],T1,T2,G=[];
  // per-frame draw lists, bucketed by colour and alpha so fillStyle changes ~50 times, not N times
  const px=new Float32Array(N),py=new Float32Array(N),ps=new Float32Array(N),pb=new Uint8Array(N),ord=new Uint32Array(N),cnt=new Uint32Array(NC*NL+1);
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
    const p=prog,light=root.dataset.theme==='light',pal=light?PAL.light:PAL.dark,gain=light?1.3:1;
    const S=Math.min(W*.82,H*1.55),cx=W/2,cy=H*.44;
    const cr=Math.cos(rot),sr=Math.sin(rot),tilt=.35,ct=Math.cos(tilt),st=Math.sin(tilt),Rg=Math.min(W,H)*.30;
    // truck camera: front three-quarter view, slowly swinging, orbiting a little with scroll
    const yaw=.9+Math.sin(t*.00035)*.15+(p-.2)*.55,pit=-.25,cY=Math.cos(yaw),sY=Math.sin(yaw),cP=Math.cos(pit),sP=Math.sin(pit);
    const dX=-sY*cP,dY=sP,dZ=cY*cP;                         // direction away from the camera, in truck space
    const U=S/(mobile?8.2:12.2),ty0=cy-H*(mobile?.04:.08);
    const wang=t*.0085,road=t*.0039,bob=Math.sin(t*.006)*.012;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation=light?'source-over':'lighter';

    const kt=local(p,.06,.22,.6)*(1-local(p,.36,.50,.1));   // how assembled the truck is
    if(kt>.02){
      // glow on the road under the truck
      const gz=-1.6*sP,gf=1/(1+gz*PERSP),gy=ty0+1.6*cP*U*gf,gr=U*7.5;
      ctx.save();ctx.translate(cx,gy);ctx.scale(1,.3);
      const gg=ctx.createRadialGradient(0,0,0,0,0,gr),gc=pal[0];
      gg.addColorStop(0,`rgba(${gc},${(light?.10:.16)*kt})`);gg.addColorStop(1,`rgba(${gc},0)`);
      ctx.fillStyle=gg;ctx.fillRect(-gr,-gr,gr*2,gr*2);ctx.restore();
      // headlight flares
      for(const s of [-1,1]){
        const X3=6.08*cY+.66*s*sY,Z3=-6.08*sY+.66*s*cY,Yp=(1.12-1.6)*cP-Z3*sP,Zp=(1.12-1.6)*sP+Z3*cP,f=1/(1+Zp*PERSP);
        const fx=cx+X3*U*f,fy=ty0-Yp*U*f,fr=U*1.7*f,g=ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
        const c=light?'255,176,48':'214,255,238',a=(light?.5:.45)*kt*(.9+.1*Math.sin(t*.02+s));
        g.addColorStop(0,`rgba(${c},${a})`);g.addColorStop(.22,`rgba(${c},${a*.35})`);g.addColorStop(1,`rgba(${c},0)`);
        ctx.fillStyle=g;ctx.fillRect(fx-fr,fy-fr,fr*2,fr*2);
        // horizontal lens streak
        if(!light){const sg=ctx.createLinearGradient(fx-fr*1.1,0,fx+fr*1.1,0);sg.addColorStop(0,`rgba(${c},0)`);sg.addColorStop(.5,`rgba(${c},${a*.55})`);sg.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=sg;ctx.fillRect(fx-fr*1.1,fy-.6,fr*2.2,1.2)}
      }
    }

    cnt.fill(0);
    for(let i=0;i<N;i++){
      const q=P[i],b=T2[i],g=G[i],o=i*ST;
      const k1=local(p,.06,.22,q.d),k2=local(p,.36,.50,q.d),k3=local(p,.64,.78,q.d);
      const sx=q.s[0]+Math.sin(t*.0003*q.w+q.ph)*.02,sy=q.s[1]+Math.cos(t*.00035*q.w+q.ph)*.02;
      let x=sx*W*1.1+cx,y=sy*H*1.6+cy,al=q.s[2]*.5,sz=1.1,col=0;
      if(k1>0&&k2<1){
        let ax=T1[o],ay=T1[o+1],az=T1[o+2],ab=T1[o+3];const kind=T1[o+5],cull=T1[o+14];
        if(kind===1){const an=T1[o+7]-wang,r=T1[o+6];ax+=Math.cos(an)*r;ay+=Math.sin(an)*r+bob*.4}
        else if(kind===2){ax=((ax-road)%(2*ROAD)+2*ROAD)%(2*ROAD)-ROAD;ab*=1-Math.pow(Math.abs(ax)/ROAD,2)}
        else if(kind===4){ax=((ax-road*2.6*q.w)%(2*ROAD)+2*ROAD)%(2*ROAD)-ROAD;ab*=1-Math.pow(Math.abs(ax)/ROAD,2)}
        else if(kind===5){const u=(t*.00045+T1[o+7])%1;ax-=u*u*3.2;ay+=u*1.1;az+=T1[o+6]*u;ab*=(1-u)*Math.min(1,u*8)}
        else{ay+=bob;if(kind===3)ab*=.65+.35*Math.sin(t*.004+q.ph)}
        if(cull){
          const d1=T1[o+8]*dX+T1[o+9]*dY+T1[o+10]*dZ;
          if(cull===1)ab*=d1>0?.03:.34+.66*-d1;
          else if(d1>.02&&T1[o+11]*dX+T1[o+12]*dY+T1[o+13]*dZ>.02)ab*=.03;
        }
        const X3=ax*cY+az*sY,Z3=-ax*sY+az*cY,Yp=(ay-1.6)*cP-Z3*sP,Zp=(ay-1.6)*sP+Z3*cP;
        const f=1/(1+Zp*PERSP),tx=cx+X3*U*f,ty=ty0-Yp*U*f;
        const ta=ab*(.42+.58*clamp(.6-Zp*.16,0,1));
        const c=T1[o+4];
        x+=(tx-x)*k1;y+=(ty-y)*k1;al+=(ta-al)*k1;sz+=((kind===3&&cull?3:kind>=2?1.4:1.7)*f-sz)*k1;
        if(k1>.5&&k2<.5)col=c;
      }
      if(k2>0){const ox=cx+b[0]*S*.9,oy=cy+b[1]*S*.9;x+=(ox-x)*k2;y+=(oy-y)*k2;al+=(b[2]-al)*k2;sz+=(1.4-sz)*k2}
      if(k3>0){
        const x2=g[0]*cr+g[2]*sr,z2=-g[0]*sr+g[2]*cr,y3=g[1]*ct-z2*st,z3=g[1]*st+z2*ct;
        const gx=cx+x2*Rg,gy=cy-y3*Rg,gal=(z3<0?.06:(.35+.75*z3))*g[3];
        x+=(gx-x)*k3;y+=(gy-y)*k3;al+=(gal-al)*k3;
      }
      const A=al*(.75+.25*Math.sin(t*.003+q.ph))*gain;
      let lv=A>=1?NL:Math.ceil(A*NL);
      if(lv<1||(lv===1&&A<.04)){pb[i]=255;continue}
      const bk=col*NL+lv-1;pb[i]=bk;cnt[bk]++;px[i]=x;py[i]=y;ps[i]=sz;
    }
    // counting sort into buckets, then draw each bucket with one fillStyle
    let acc=0;for(let k=0;k<NC*NL;k++){const c=cnt[k];cnt[k]=acc;acc+=c}
    const startOf=cnt.slice(0,NC*NL);
    for(let i=0;i<N;i++){const bk=pb[i];if(bk!==255)ord[cnt[bk]++]=i}
    for(let k=0;k<NC*NL;k++){
      const a=startOf[k],e=cnt[k];if(e===a)continue;
      const c=pal[(k/NL)|0],A=((k%NL)+1)/NL;
      ctx.fillStyle=`rgba(${c},${A})`;
      for(let j=a;j<e;j++){const i=ord[j];ctx.fillRect(px[i],py[i],ps[i],ps[i])}
      if(A>.5&&!light){ctx.fillStyle=`rgba(${c},${A*.07})`;for(let j=a;j<e;j++){const i=ord[j],s=ps[i];ctx.fillRect(px[i]-2,py[i]-2,s+4,s+4)}}
    }
    ctx.globalCompositeOperation='source-over';
    const st2=p<.06?0:p<.34?1:p<.62?2:3;
    caps.forEach((c,i)=>c.classList.toggle('on',i===st2&&(i===0||(p>.18&&p<.34)||(p>.46&&p<.62)||p>.74)));
    hud.forEach((h,i)=>h.classList.toggle('on',i+1===st2));
  }

  resize();addEventListener('resize',resize);
  const fonts=document.fonts?Promise.race([Promise.all([document.fonts.ready,document.fonts.load('600 70px Inter'),document.fonts.load('600 300px "Space Grotesk"')]),new Promise(r=>setTimeout(r,2500))]).catch(()=>{}):Promise.resolve();
  fonts.then(()=>{build();requestAnimationFrame(frame)});
})();
