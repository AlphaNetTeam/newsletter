/* ═══ AlphaNet Markets — renderer ═══
   Data: per-asset JSON in assets/data/ (baked fallback). Strategy stats refresh live from
   the production API (recentStat). Hash routing: markets.html#ETH */
(async () => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ── formatting ── */
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const fmtDate = t => { const d = new Date(t); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const fmtAxisPrice = v => {
    if (v >= 10000) return '$' + (v / 1000).toFixed(2) + 'K';
    if (v >= 1000)  return '$' + (v / 1000).toFixed(2) + 'K';
    if (v >= 100)   return '$' + Math.round(v).toLocaleString('en-US');
    if (v >= 1)     return '$' + v.toFixed(2);
    if (v >= 0.1)   return '$' + v.toFixed(3);
    if (v >= 0.01)  return '$' + v.toFixed(4);
    return '$' + v.toFixed(4);
  };
  const fmtVol = v => Math.round(v * 100) + '%';
  const isNeg = s => String(s).trim().startsWith('-');

  /* ── SVG chart builder (pixel-accurate viewBox, rebuilt on resize) ── */
  function chart(svg, pts, o) {
    const w = Math.max(320, Math.round(svg.parentElement.clientWidth));
    const h = o.h;
    const P = { l: 10, r: 16, t: 18, b: 26 };
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.height = h + 'px';
    const iw = w - P.l - P.r, ih = h - P.t - P.b;
    const vs = pts.map(p => p.v), ts = pts.map(p => p.t);
    let mn = Math.min(...vs), mx = Math.max(...vs), ticks = null;
    if (o.zeroMin) {
      // nice 5-step axis anchored at 0 (0..4*step), matching the live site's vol axis
      const STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150];
      const raw = (Math.max(...vs) * 100) / 4;
      const step = STEPS.find(x => x >= raw) || 150;
      mn = 0; mx = (4 * step) / 100;
      ticks = [0, 1, 2, 3, 4].map(i => (i * step) / 100);
    }
    if (mn === mx) { mn -= 1; mx += 1; }
    if (!ticks) { const pad = (mx - mn) * 0.06; mn -= pad; mx += pad; }
    const X = t => P.l + (t - ts[0]) / (ts[ts.length - 1] - ts[0] || 1) * iw;
    const Y = v => P.t + (1 - (v - mn) / (mx - mn)) * ih;
    const gid = o.id;

    let s = `<defs>
      <linearGradient id="${gid}-line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/>
      </linearGradient>
      <linearGradient id="${gid}-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${o.c2}" stop-opacity=".22"/><stop offset="1" stop-color="${o.c2}" stop-opacity="0"/>
      </linearGradient>
    </defs>`;

    // horizontal gridlines + y labels
    const tickVals = ticks || [0, 1, 2, 3].map(i => mn + (mx - mn) * i / 3);
    for (const v of tickVals) {
      const y = Y(v).toFixed(1);
      s += `<line x1="${P.l}" y1="${y}" x2="${w - P.r}" y2="${y}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
      s += `<text x="${P.l + 2}" y="${y - 5}" fill="#7C8494" font-size="10.5" font-family="IBM Plex Mono,monospace" letter-spacing=".04em">${o.fmtY(v)}</text>`;
    }
    // x labels
    const nX = 5;
    for (let i = 0; i < nX; i++) {
      const t = ts[0] + (ts[ts.length - 1] - ts[0]) * i / (nX - 1);
      const anchor = i === 0 ? 'start' : (i === nX - 1 ? 'end' : 'middle');
      const x = i === 0 ? P.l : (i === nX - 1 ? w - P.r : P.l + iw * i / (nX - 1));
      s += `<text x="${x}" y="${h - 8}" text-anchor="${anchor}" fill="#3A3F4B" font-size="10.5" font-family="IBM Plex Mono,monospace" letter-spacing=".08em">${fmtDate(t)}</text>`;
    }
    // area + line
    const line = pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ',' + Y(p.v).toFixed(1)).join(' ');
    const area = line + ` L${X(ts[ts.length - 1]).toFixed(1)},${h - P.b} L${P.l},${h - P.b} Z`;
    s += `<path d="${area}" fill="url(#${gid}-area)"/>`;
    s += `<path d="${line}" fill="none" stroke="url(#${gid}-line)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    // last point pulse
    const lx = X(ts[ts.length - 1]).toFixed(1), ly = Y(vs[vs.length - 1]).toFixed(1);
    s += `<circle cx="${lx}" cy="${ly}" fill="${o.c2}" opacity=".5"><animate attributeName="r" values="4;11;4" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".45;0;.45" dur="2.4s" repeatCount="indefinite"/></circle>`;
    s += `<circle cx="${lx}" cy="${ly}" r="3.4" fill="${o.c2}"/>`;
    svg.innerHTML = s;
  }

  /* ── data: per-asset JSON, fetched on demand & cached ── */
  const cache = {};
  let META = null; // { order:[...], meta:{SYM:{name}} }
  async function loadMeta() {
    if (!META) META = await fetch('assets/data/meta.json').then(r => r.json());
    return META;
  }
  async function loadAsset(sym) {
    if (!cache[sym]) cache[sym] = await fetch(`assets/data/${sym}.json`).then(r => r.json());
    return cache[sym];
  }
  // idle prefetch of the rest so switching feels instant
  function prefetchRest() {
    const go = () => META.order.reduce((p, s) => p.then(() => loadAsset(s)), Promise.resolve());
    ('requestIdleCallback' in window) ? requestIdleCallback(() => go(), { timeout: 4000 }) : setTimeout(go, 2500);
  }

  /* ── live 90D correlations from Hyperliquid daily closes (SPX = xyz:SP500, XAU = xyz:GOLD) ── */
  let HL_LR = null; // { coin: {timestamp: logReturn} }
  async function fetchCorr() {
    try {
      const end = Date.now(), start = end - 92 * 86400e3;
      const coins = META.order.concat(['xyz:SP500', 'xyz:GOLD']);
      const res = await Promise.all(coins.map(c =>
        fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'candleSnapshot', req: { coin: c, interval: '1d', startTime: start, endTime: end } }),
        }).then(r => r.json())));
      if (res.some(r => !Array.isArray(r) || r.length < 30)) return false;
      HL_LR = {};
      coins.forEach((c, i) => {
        const lr = {};
        for (let j = 1; j < res[i].length; j++) {
          const p = +res[i][j - 1].c, q = +res[i][j].c;
          if (p > 0) lr[+res[i][j].t] = Math.log(q / p);
        }
        HL_LR[c] = lr;
      });
      return true;
    } catch (e) { return false; }
  }
  const LEG = s => (s === 'SPX' ? 'xyz:SP500' : (s === 'XAU' ? 'xyz:GOLD' : s));
  function corr90(a, b) {
    const A = HL_LR[a], B = HL_LR[b];
    if (!A || !B) return null;
    const common = Object.keys(A).filter(t => t in B).map(Number).sort((x, y) => x - y).slice(-90);
    if (common.length < 10) return null;
    const xs = common.map(t => A[t]), ys = common.map(t => B[t]);
    const n = xs.length, mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
    let cov = 0, vx = 0, vy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; cov += dx * dy; vx += dx * dx; vy += dy * dy; }
    return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : null;
  }

  /* ── live strategy stats from the production API (baked JSON stays the fallback) ── */
  let LIVE = null; // { all: {SYM:{name:entry}}, d30: {SYM:{name:entry}} }
  const API_BASES = ['', 'https://alphanet.phoenix.global'];
  async function fetchLive() {
    for (const base of API_BASES) {
      try {
        const [ra, r3] = await Promise.all([
          fetch(`${base}/api/orderly/trade/recentStat?t=all`).then(r => r.json()),
          fetch(`${base}/api/orderly/trade/recentStat?t=30`).then(r => r.json()),
        ]);
        if (!Array.isArray(ra.data) || !Array.isArray(r3.data)) continue;
        const idx = L => {
          const m = {};
          L.forEach(e => {
            const s = e.symbol.replace(/^PERP_/, '').replace(/_USDC$/, '');
            (m[s] = m[s] || {})[e.strategy] = e;
          });
          return m;
        };
        LIVE = { all: idx(ra.data), d30: idx(r3.data) };
        return true;
      } catch (e) { /* try next base */ }
    }
    return false;
  }
  const pct1 = v => (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
  const sparkFromDsl = dsl => {
    const vs = (dsl || []).map(p => Number(p.pnl));
    if (vs.length < 2) return null;
    let mn = Math.min(...vs), mx = Math.max(...vs);
    if (mn === mx) { mn -= 1; mx += 1; }
    return vs.map((v, i) => `${(1 + i * 88 / (vs.length - 1)).toFixed(1)},${(2 + (1 - (v - mn) / (mx - mn)) * 26).toFixed(1)}`).join(' ');
  };
  // overlay live API stats onto the baked dataset (table + equity curves + drawdown panel)
  function mergeLive(sym, a) {
    const A = LIVE && LIVE.all[sym], D = LIVE && LIVE.d30[sym];
    if (!A) return { strategies: a.strategies, sparks: a.sparks, drawdowns: a.drawdowns };
    const strategies = a.strategies.map(st => {
      const e = A[st.name], e3 = D && D[st.name];
      if (!e) return st;
      return Object.assign({}, st, {
        badges: e.tag ? e.tag.split(',').map(t => t.trim()).filter(Boolean) : st.badges,
        type: e.strategyType || st.type,
        roi: e3 ? pct1(e3.totalReturn) : st.roi,
        sharpe: String(e.sharpeRatio != null ? e.sharpeRatio : st.sharpe),
        maxDD: (e.maxDrawDown * 100).toFixed(2) + '%',
        winRate: (e.winRate * 100).toFixed(1) + '%',
        capacity: BigInt(e.actualCapacity || 0) < BigInt(e.maxCapacity || 0) ? 'OPEN' : 'FULL',
      });
    });
    const sparks = a.strategies.map((st, i) => {
      const e3 = D && D[st.name];
      return (e3 && sparkFromDsl(e3.dailyStatList)) || (a.sparks && a.sparks[i]) || '';
    });
    const drawdowns = a.drawdowns.map(dd => {
      const e = A[dd.name];
      return e ? Object.assign({}, dd, { v: (e.maxDrawDown * 100).toFixed(2) + '%' }) : dd;
    });
    return { strategies, sparks, drawdowns };
  }

  /* ── state ── */
  let current = null, days = 0, renderSeq = 0;
  async function show(sym) {
    const seq = ++renderSeq;
    const a = await loadAsset(sym);
    if (seq !== renderSeq) return; // a newer switch superseded this one
    render(sym, a);
  }

  /* ── renderers ── */
  function renderPriceChart(a) {
    let pts = a.price;
    if (days > 0) {
      const cut = pts[pts.length - 1].t - days * 86400e3;
      pts = pts.filter(p => p.t >= cut);
      if (pts.length < 2) pts = a.price.slice(-2);
    }
    chart($('mk-price-chart'), pts, { h: 300, c1: '#3D6FE8', c2: '#22D3EE', fmtY: fmtAxisPrice, id: 'mkp' });
  }
  function renderVolChart(a) {
    chart($('mk-vol-chart'), a.vol, { h: 260, c1: '#6D43C7', c2: '#C2A6FF', fmtY: fmtVol, id: 'mkv', zeroMin: true });
  }

  function render(sym, a) {
    if (!a) return;
    current = sym;
    document.title = `${sym} Trading Strategies & Live Market Data | AlphaNet`;
    document.querySelector('meta[name="description"]')
      .setAttribute('content', `Compare automated ${sym} trading strategies. View live ${sym} price, current funding rate, open interest, 30-day historical volatility, Sharpe ratio and drawdown data.`);

    // dropdown button + options
    $('mk-select-name').textContent = sym;
    $('mk-select-sym').textContent = '';
    document.querySelectorAll('#mk-select-menu .mk-opt').forEach(b => {
      b.classList.toggle('on', b.dataset.sym === sym);
      b.setAttribute('aria-selected', b.dataset.sym === sym ? 'true' : 'false');
    });

    // headings
    $('mk-h1').innerHTML = `${esc(sym)} Trading Strategies, Funding Rate &amp; Open Interest`;
    $('mk-intro-p').textContent = `Compare systematic ${sym} trading strategies. Track the current ${sym} funding rate, perpetual futures open interest, 30-day historical volatility, Sharpe ratio and maximum drawdown in one place.`;
    $('mk-h2-sym').textContent = sym;
    $('mk-metrics-sym').textContent = sym;
    $('mk-perf-sym').textContent = sym;
    $('mk-vol-sym').textContent = sym;
    $('mk-chart-pair').textContent = sym;
    $('mk-latest').textContent = a.latest;
    $('mk-about-name').textContent = sym;
    $('mk-news-sym').textContent = sym;
    $('mk-strat-sym').textContent = sym;
    $('mk-faq-sym').textContent = sym;

    // price
    renderPriceChart(a);

    // metrics
    const m = a.metrics;
    $('mk-metrics').innerHTML = [
      [`${sym} FUNDING RATE`, m.funding, true],
      [`${sym} OPEN INTEREST`, m.oi],
      [`${sym} 30-DAY VOLATILITY`, m.vol30],
      [`${sym} 24H VOLUME`, m.vol24],
      [`${sym} 24H LIQUIDATION`, m.liq24],
      [`${sym} LONG/SHORT RATIO`, m.lsRatio],
    ].map(([k, v, col]) => `<div class="mk-kv-row"><span>${k}</span><span class="${col ? (isNeg(v) ? 'mk-neg' : 'mk-pos') : ''}">${esc(v)}</span></div>`).join('');

    // correlations
    $('mk-corr').innerHTML = a.correlations.map(c => {
      const lv = HL_LR ? corr90(sym, LEG(c.sym)) : null;
      const cv = lv == null ? c.v : lv.toFixed(2);
      const pct = Math.round(parseFloat(cv) * 100);
      return `<div class="mk-corr-row mono"><span class="mk-corr-sym">${esc(c.sym)}</span>
        <span class="mk-corr-track"><i style="width:${pct}%"></i></span>
        <span class="mk-corr-v">${esc(cv)}</span></div>`;
    }).join('');

    // perf strip
    const p = a.perf;
    $('mk-perf').innerHTML = [
      ['1 MONTH', p.m1, true], ['YEAR TO DATE', p.ytd, true], ['1 YEAR', p.y1, true],
      ['ALL-TIME HIGH', p.ath, false], ['12M LOW', p.low12, false],
    ].map(([k, v, col]) => `<div class="mk-perf-cell"><span class="mk-perf-k">${k}</span>
      <span class="mk-perf-v ${col ? (isNeg(v) ? 'mk-neg' : 'mk-pos') : ''}">${esc(v)}</span></div>`).join('');

    // about
    $('mk-about-1').textContent = a.about[0] || '';
    $('mk-about-2').textContent = a.about[1] || '';
    $('mk-drivers').innerHTML = a.drivers.map((d, i) => `
      <div class="cap">
        <span class="cap-n mono">/0${i + 1}</span>
        <h3>${esc(d.title)}</h3>
        <p>${esc(d.desc)}</p>
      </div>`).join('');

    // news
    $('mk-news').innerHTML = a.news.length
      ? a.news.map(n => `<a class="res-row mk-news-row" href="${esc(n.url)}" target="_blank" rel="noopener">
          <span class="mk-news-meta mono">${esc(n.meta)}</span>
          <span class="mk-news-title">${esc(n.title)}</span>
          <span class="btn-arrow">↗</span></a>`).join('')
      : `<div class="mk-empty mono">NO DEDICATED HEADLINES FOR ${esc(sym)} RIGHT NOW — RATHER THAN PAD THIS OUT WITH UNRELATED GENERAL CRYPTO NEWS, NOTHING IS SHOWN. CHECK BACK LATER.</div>`;

    // strategies table
    const mrg = mergeLive(sym, a);
    $('mk-tbody').innerHTML = mrg.strategies.map((st, i) => {
      const neg = isNeg(st.roi);
      const badges = st.badges.map(b => `<span class="mk-chip mono mk-chip-${b === 'POPULAR' ? 'violet' : 'blue'}">${esc(b)}</span>`).join('');
      const spark = mrg.sparks && mrg.sparks[i]
        ? `<svg width="90" height="30" viewBox="0 0 90 30" aria-hidden="true"><polyline points="${a.sparks[i]}" fill="none" stroke="${neg ? '#F87171' : '#22D3EE'}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`
        : '';
      const cap = st.capacity === 'OPEN'
        ? `<span class="mk-chip mono mk-chip-mint">OPEN</span>`
        : `<span class="mk-chip mono mk-chip-violet">${esc(st.capacity)}</span>`;
      return `<tr>
        <td><div class="mk-st-name">${esc(st.name)}</div><div class="mk-st-badges">${badges}</div></td>
        <td class="mk-dim">${esc(st.type)}</td>
        <td class="${neg ? 'mk-neg' : 'mk-pos'}">${esc(st.roi)}</td>
        <td>${esc(st.sharpe)}</td>
        <td class="mk-dim">${esc(st.maxDD)}</td>
        <td class="mk-dim">${esc(st.winRate)}</td>
        <td>${spark}</td>
        <td>${cap}</td>
        <td><a class="mk-details mono" href="https://trade.alphanet.global/strategies" target="_blank" rel="noopener">Details<span class="btn-arrow">↗</span></a></td>
      </tr>`;
    }).join('');

    // detail cards
    $('mk-cards').innerHTML = a.detailCards.map((c, i) => {
      const biasCls = /SHORT/i.test(c.bias) ? 'violet' : (/LONG/i.test(c.bias) ? 'cyan' : 'blue');
      return `<div class="cap">
        <span class="cap-n mono">/0${i + 1}</span>
        <h3>${esc(c.name)}</h3>
        <span class="mk-chip mono mk-chip-${biasCls} mk-bias">${esc(c.bias)}</span>
        <p>${esc(c.desc)}</p>
      </div>`;
    }).join('');

    // volatility
    renderVolChart(a);
    const vs = a.volStats;
    $('mk-volstats').innerHTML = [
      ['CURRENT', vs.current], ['12M HIGH', vs.high12], ['12M LOW', vs.low12], ['VS BTC', vs.vsBtc],
    ].map(([k, v]) => `<div class="mk-volstat"><span class="mk-perf-k">${k}</span><span class="mk-perf-v">${esc(v)}</span></div>`).join('');

    // drawdowns
    const maxV = Math.max(...mrg.drawdowns.map(d => parseFloat(d.v)));
    $('mk-dd').innerHTML = mrg.drawdowns.map(d => {
      const v = parseFloat(d.v);
      const hold = /holding/i.test(d.name);
      return `<div class="mk-dd-row mono">
        <span class="mk-dd-name">${esc(d.name)}</span>
        <span class="mk-dd-track"><i class="${hold ? 'mk-dd-hold' : ''}" style="width:${(v / maxV * 100).toFixed(1)}%"></i></span>
        <span class="mk-dd-v ${hold ? 'mk-neg' : ''}">${esc(d.v)}</span></div>`;
    }).join('');

    // faq (dataset + two standard questions)
    const extraFaq = [
      { q: `How do automated ${sym} trading strategies work?`,
        a: `The model trades the ${sym} perpetual long, short or flat — direction, size and timing all set from market data. Capital stays in your own account.` },
      { q: `What do ${sym} funding rate and open interest indicate?`,
        a: `Positive funding means crowded longs paying shorts; negative means the reverse. Open interest is the total outstanding contracts on the ${sym} perpetual.` },
    ];
    $('mk-faq').innerHTML = a.faq.concat(extraFaq).map(f => `
      <div class="mk-faq-cell"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join('');
  }

  /* ── init: asset dropdown ── */
  const sel = $('mk-select'), selBtn = $('mk-select-btn'), menu = $('mk-select-menu');
  const fromHash = () => {
    const h = location.hash.replace('#', '').toUpperCase();
    return META.order.includes(h) ? h : null;
  };
  await loadMeta();
  menu.innerHTML = META.order.map(s =>
    `<button type="button" role="option" class="mk-opt" data-sym="${s}">
       <span class="mk-opt-name">${s}</span>
       <span class="mk-opt-sym mono">${META.meta[s].name}</span>
     </button>`).join('');
  const closeMenu = () => { sel.classList.remove('open'); menu.hidden = true; selBtn.setAttribute('aria-expanded', 'false'); };
  const openMenu = () => { sel.classList.add('open'); menu.hidden = false; selBtn.setAttribute('aria-expanded', 'true'); };
  selBtn.addEventListener('click', e => { e.stopPropagation(); menu.hidden ? openMenu() : closeMenu(); });
  menu.addEventListener('click', e => {
    const b = e.target.closest('.mk-opt');
    if (!b) return;
    history.replaceState(null, '', '#' + b.dataset.sym);
    show(b.dataset.sym);
    closeMenu();
  });
  document.addEventListener('click', e => { if (!sel.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ── range toggles ── */
  $('mk-ranges').addEventListener('click', e => {
    const b = e.target.closest('button[data-days]');
    if (!b) return;
    days = Number(b.dataset.days);
    document.querySelectorAll('#mk-ranges button').forEach(x => x.classList.toggle('on', x === b));
    renderPriceChart(cache[current]);
  });

  /* ── hash routing (#BTC … #PENGU; section anchors ignored) ── */
  window.addEventListener('hashchange', () => { const s = fromHash(); if (s && s !== current) show(s); });

  /* ── resize ── */
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (current) { renderPriceChart(cache[current]); renderVolChart(cache[current]); } }, 160);
  });

  await show(fromHash() || 'BTC');
  prefetchRest();
  fetchLive().then(ok => { if (ok && current) render(current, cache[current]); });
  fetchCorr().then(ok => { if (ok && current) render(current, cache[current]); });
})();
