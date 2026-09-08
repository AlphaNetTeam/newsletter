/* ═══ ALPHANET — BLOG · filter + pagination + faq + subscribe ═══ */
(() => {
  const cards=[...document.querySelectorAll('#ins-list .ins-card')];
  const bar=document.querySelector('.ins-filters');
  const nav=document.getElementById('ins-pages');
  const articles=document.getElementById('articles');
  const PER_PAGE=9;                 /* 1 featured + 8 grid cards */
  let cat='ALL', page=1;

  const visible=()=>cards.filter(c=>cat==='ALL'||c.dataset.cat===cat);

  function render(){
    const vis=visible();
    const pages=Math.max(1,Math.ceil(vis.length/PER_PAGE));
    if(page>pages)page=pages;
    const slice=new Set(vis.slice((page-1)*PER_PAGE,page*PER_PAGE));
    cards.forEach(c=>{
      const show=slice.has(c);
      c.style.display=show?'':'none';
      c.classList.toggle('ins-card--feat',show&&page===1&&c===vis[0]);
    });
    nav.innerHTML='';
    if(pages>1){
      const mk=(label,pg,{on=false,off=false,aria}={})=>{
        const b=document.createElement('button');
        b.innerHTML=label;
        if(on)b.classList.add('on');
        if(off)b.disabled=true;
        b.setAttribute('aria-label',aria||('Page '+pg));
        if(!on&&!off)b.addEventListener('click',()=>{
          page=pg; render();
          articles.scrollIntoView({behavior:'smooth',block:'start'});
        });
        nav.appendChild(b);
      };
      mk('&#8592;',page-1,{off:page===1,aria:'Previous page'});
      for(let i=1;i<=pages;i++)mk(String(i),i,{on:i===page});
      mk('&#8594;',page+1,{off:page===pages,aria:'Next page'});
    }
  }

  if(bar&&cards.length){
    bar.addEventListener('click',e=>{
      const b=e.target.closest('button[data-cat]'); if(!b)return;
      bar.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
      cat=b.dataset.cat; page=1; render();
    });
  }
  render();


  /* ── faq section accordions ── */
  const secs=[...document.querySelectorAll('.ins-faq-sec')];
  secs.forEach(sec=>{
    const row=sec.querySelector('.ins-faq-row');
    row.addEventListener('click',()=>{
      const was=sec.classList.contains('open');
      secs.forEach(x=>{
        x.classList.remove('open');
        x.querySelector('.ins-faq-row').setAttribute('aria-expanded','false');
      });
      if(!was){
        sec.classList.add('open');
        row.setAttribute('aria-expanded','true');
      }
    });
  });

  /* ── subscribe form → same API as alphanet.global/blog ── */
  const form=document.getElementById('ins-sub-form');
  if(!form)return;
  const input=form.querySelector('input[type="email"]');
  const btn=form.querySelector('button');
  const msg=document.getElementById('ins-sub-msg');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=input.value.trim();
    msg.className='ins-form-msg mono';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      msg.textContent='ENTER A VALID EMAIL ADDRESS'; msg.classList.add('err'); return;
    }
    btn.disabled=true; btn.textContent='Subscribing…';
    msg.textContent='';
    try{
      /* the subscribe API has no CORS headers, so the response is opaque —
         a resolved promise means the request reached the server */
      await fetch('https://alphanet.global/api/subscribe',{
        method:'POST', mode:'no-cors',
        headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({email})
      });
      msg.textContent='YOU’RE ON THE LIST — WELCOME ABOARD';
      msg.classList.add('ok');
      form.reset();
    }catch(_){
      msg.textContent='NETWORK ERROR — PLEASE TRY AGAIN';
      msg.classList.add('err');
    }
    btn.disabled=false; btn.textContent='Subscribe';
  });
})();
