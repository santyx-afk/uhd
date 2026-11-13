/* United Hub — theme, language, globes, form */
(function(){
  /* ---- Company contact details. Fill these in when confirmed; empty values stay hidden. ---- */
  const CONTACT={
    phone:'',     // e.g. '+1 (000) 000-0000'
    email:'',     // e.g. 'info@unitedeldhub.com'
    address:''    // e.g. '123 Main St, City, ST 00000'
  };
  const TELEGRAM='https://t.me/unitedeldhub';

  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=(s,p)=>(p||document).querySelector(s),$$=(s,p)=>[...(p||document).querySelectorAll(s)];

  /* ---- contact details ---- */
  $$('[data-c]').forEach(el=>{
    const k=el.dataset.c,v=CONTACT[k];if(!v)return;
    el.hidden=false;
    const href=k==='phone'?'tel:'+v.replace(/[^\d+]/g,''):k==='email'?'mailto:'+v:null;
    const link=$('[data-c-link]',el),text=$('[data-c-text]',el);
    if(link){link.textContent=v;if(href)link.href=href}
    if(text)text.textContent=v;
    if(el.tagName==='A'&&href)el.href=href;
  });
  $('#yr').textContent=new Date().getFullYear();

  /* ---- theme ---- */
  const themeMeta=$('meta[name=theme-color]');
  function setTheme(t,save){
    root.dataset.theme=t;themeMeta.content=t==='light'?'#f3f6f4':'#05070d';
    if(save)store.set('uh-theme',t);
  }
  setTheme(root.dataset.theme||'dark');
  $('#theme').addEventListener('click',()=>setTheme(root.dataset.theme==='light'?'dark':'light',true));
  matchMedia('(prefers-color-scheme: light)').addEventListener('change',e=>{if(!store.get('uh-theme'))setTheme(e.matches?'light':'dark')});

  /* ---- language ---- */
  const I=window.UH_I18N,nodes=$$('[data-t]');
  nodes.forEach(n=>{n._en=n.innerHTML});
  let lang='en';
  const tr=k=>(I[lang]&&I[lang][k])||I.en[k]||'';
  function setLang(l,save){
    if(!I[l])l='en';lang=l;root.lang=l;
    nodes.forEach(n=>{const v=l!=='en'&&I[l][n.dataset.t];n.innerHTML=v||n._en});
    document.title=tr('_title');$('meta[name=description]').content=tr('_desc');
    $$('.lang button').forEach(b=>{const on=b.dataset.lang===l;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
    if(save)store.set('uh-lang',l);
  }
  const nav=(navigator.language||'en').slice(0,2).toLowerCase();
  setLang(store.get('uh-lang')||(I[nav]?nav:'en'));
  $$('.lang button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang,true)));

  /* ---- header + mobile menu ---- */
  const hdr=$('#hdr'),mnav=$('#mnav'),burger=$('#burger');
  const onScroll=()=>hdr.classList.toggle('scrolled',scrollY>20);
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  const menu=o=>{mnav.classList.toggle('open',o);burger.setAttribute('aria-expanded',o)};
  burger.addEventListener('click',()=>menu(!mnav.classList.contains('open')));
  $$('a',mnav).forEach(a=>a.addEventListener('click',()=>menu(false)));

  /* ---- reveal on scroll ---- */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
  $$('.reveal').forEach(el=>io.observe(el));

  /* ---- particle globes ---- */
  const rgb=()=>root.dataset.theme==='light'?'6,140,92':'46,229,157';
  function land(lat,lon){return Math.sin(lon*2.1+.5)*Math.cos(lat*2.7)+.6*Math.sin(lon*3.7-lat*2.2+1.3)+.4*Math.cos(lon*5.3+lat*4.1)+.3*Math.sin(lat*6+lon*1.3)}
  const N=16000,pts=[],ga=Math.PI*(3-Math.sqrt(5));
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<N;i++){
    const y=1-(i/(N-1))*2,r=Math.sqrt(1-y*y),th=ga*i,x=Math.cos(th)*r,z=Math.sin(th)*r;
    const isl=land(Math.asin(y),Math.atan2(z,x))>.35;
    if(!isl&&rnd()>.28)continue;
    pts.push([x,y,z,isl?1:0]);
  }
  const halo=[];for(let i=0;i<900;i++)halo.push([rnd()*Math.PI*2,1+Math.abs((rnd()+rnd()+rnd()-1.5)*.08),.15+rnd()*.5]);
  const globes=$$('canvas.globe').map(c=>({c,ctx:c.getContext('2d'),vis:false,rot:Math.random()*6}));
  const gio=new IntersectionObserver(es=>es.forEach(e=>{const g=globes.find(g=>g.c===e.target);if(g)g.vis=e.isIntersecting}),{rootMargin:'100px'});
  globes.forEach(g=>gio.observe(g.c));
  function size(g){const dpr=Math.min(devicePixelRatio||1,2),w=g.c.clientWidth;if(g.w!==w){g.w=w;g.c.width=w*dpr;g.c.height=w*dpr;g.dpr=dpr}}
  function draw(g){
    size(g);const RGB=rgb(),{ctx}=g,S=g.c.width,R=S*.42,cx=S/2,cy=S/2,tilt=.35,cr=Math.cos(g.rot),sr=Math.sin(g.rot),ct=Math.cos(tilt),st=Math.sin(tilt),d=g.dpr;
    ctx.clearRect(0,0,S,S);
    const grd=ctx.createRadialGradient(cx-R*.15,cy-R*.2,R*.1,cx,cy,R);
    grd.addColorStop(0,`rgba(${RGB},.10)`);grd.addColorStop(1,`rgba(${RGB},0)`);
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fill();
    ctx.shadowColor=`rgba(${RGB},.8)`;ctx.shadowBlur=18*d;ctx.strokeStyle=`rgba(${RGB},.45)`;ctx.lineWidth=2*d;
    ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.stroke();ctx.shadowBlur=0;
    for(const p of pts){
      const x2=p[0]*cr+p[2]*sr,z2=-p[0]*sr+p[2]*cr,y3=p[1]*ct-z2*st,z3=p[1]*st+z2*ct;
      if(z3<-.05)continue;
      const zz=Math.max(z3,0),b=(.45+.75*zz)*(p[3]?1:.4),s=(p[3]?2.2:1.1)*(.7+.5*zz)*d;
      ctx.fillStyle=`rgba(${RGB},${Math.min(1,b)})`;ctx.fillRect(cx+x2*R-s/2,cy-y3*R-s/2,s,s);
    }
    for(const h of halo){const a=h[0]+g.rot*.3;ctx.fillStyle=`rgba(${RGB},${h[2]})`;ctx.fillRect(cx+Math.cos(a)*R*h[1],cy+Math.sin(a)*R*h[1],1.2*d,1.2*d)}
  }

  /* ---- CTA particle bars (panel is always dark) ---- */
  const bc=$('#bars'),bx=bc.getContext('2d'),BR='46,229,157';let bp=null,bvis=false;
  new IntersectionObserver(es=>{bvis=es[0].isIntersecting}).observe(bc);
  function initBars(){const d=Math.min(devicePixelRatio||1,2);bc.width=bc.clientWidth*d;bc.height=bc.clientHeight*d;const W=bc.width,H=bc.height;if(!W)return;
    const spec=[[.08,.62,.30],[.22,.52,.30],[.36,.58,.22],[.50,.40,.28],[.64,.36,.22],[.78,.22,.30],[.92,.12,.26]];
    bp=spec.map(([x,t,h])=>{const X=x*W,T=t*H,HH=h*H,w=W*.045,n=Math.floor(HH*w/40),ps=[];for(let i=0;i<n;i++)ps.push([X+(Math.random()-.5)*w,T+Math.random()*HH,Math.random()]);return {X,T,HH,ps}})}
  function drawBars(t){if(!bp)return;const W=bc.width,H=bc.height,d=W/bc.clientWidth;bx.clearRect(0,0,W,H);
    for(const b of bp){bx.fillStyle=`rgba(${BR},.4)`;bx.fillRect(b.X-d/2,b.T-b.HH*.25,d,b.HH*1.5);
      for(const p of b.ps){const a=.35+.65*Math.abs(Math.sin(t/900+p[2]*9));bx.fillStyle=`rgba(${BR},${a})`;bx.fillRect(p[0],p[1],1.6*d,1.6*d)}}}
  initBars();addEventListener('resize',initBars);

  let last=0;
  function loop(t){
    const dt=Math.min(50,t-last);last=t;
    for(const g of globes){if(!g.vis&&g.w)continue;if(!reduce)g.rot+=dt*.00012;draw(g)}
    if(bvis||reduce)drawBars(t);
    if(!reduce)requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // when motion is reduced there is no loop, so redraw once on theme change
  new MutationObserver(()=>{if(reduce)requestAnimationFrame(loop)}).observe(root,{attributes:true,attributeFilter:['data-theme']});

  /* ---- demo clocks: one minute down every 6s ---- */
  const clocks=$$('[data-clock]');
  if(!reduce)setInterval(()=>clocks.forEach(el=>{const [h,m]=el.textContent.split(':').map(Number);let t=h*60+m;if(t>1)t--;el.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}),6000);

  /* ---- lead form ---- */
  const form=$('#lead'),ok=$('#ok'),btn=$('button[type=submit]',form);
  let plan='';
  $$('[data-plan]').forEach(a=>a.addEventListener('click',()=>{plan=a.dataset.plan}));
  function msg(text,err,link){
    ok.textContent=text;ok.classList.toggle('err',!!err);ok.classList.add('show');
    if(link){const a=document.createElement('a');a.href=TELEGRAM;a.target='_blank';a.rel='noopener';a.className='accent';a.textContent='t.me/unitedeldhub';ok.appendChild(a)}
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(form));
    if(!d.company.trim()||!d.contact.trim())return msg(tr('freq'),true);
    if(plan)d.trucks+=' · plan '+plan;
    d.lang=lang;
    const label=btn.innerHTML;btn.disabled=true;btn.textContent=tr('sending');
    try{
      const r=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
      if(!r.ok)throw new Error(r.status);
      msg(tr('fok'));btn.textContent=tr('sent');form.reset();
    }catch(err){
      msg(tr('ferr'),true,true);btn.disabled=false;btn.innerHTML=label;
    }
  });
})();
