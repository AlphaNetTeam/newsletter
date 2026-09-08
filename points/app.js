(() => {
'use strict';

/* ── leaderboard — live marketplace stats ─────────────────── */
const boardRows = document.getElementById('board-rows');
const boardStatus = document.getElementById('board-status');
const pct = n => `${(Number(n) * 100).toFixed(2)}%`;
const signed = (n, el) => {
  el.classList.toggle('pos', n > 0);
  el.classList.toggle('neg', n < 0);
  el.textContent = pct(n);
};
if (boardRows) {
  fetch('/api/orderly/trade/mainRecentStat')
    .then(res => res.json())
    .then(payload => {
      const list = (payload.data || [])
        .slice()
        .sort((a, b) => b.roi30 - a.roi30)
        .slice(0, 7);
      if (!list.length) throw new Error('empty');
      const top = list[0];
      const dexStrat = document.getElementById('dex-strat');
      const dexMarket = document.getElementById('dex-market');
      const dexRoi = document.getElementById('dex-roi30');
      const dexSharpe = document.getElementById('dex-sharpe');
      if (dexStrat) dexStrat.textContent = top.strategy;
      if (dexMarket) dexMarket.textContent = top.symbol;
      if (dexRoi) {
        const n = Number(top.roi30);
        dexRoi.classList.toggle('pos', n > 0);
        dexRoi.classList.toggle('neg', n < 0);
        dexRoi.textContent = `${n > 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
      }
      if (dexSharpe) dexSharpe.textContent = String(top.sharpe);
      boardRows.replaceChildren();
      list.forEach((row, i) => {
        const el = document.createElement('div');
        const rank = i + 1;
        el.className = 'board-row' + (rank <= 3 ? ` top r${rank}` : '');
        const title = document.createElement('h3');
        title.textContent = row.strategy;
        const tick = document.createElement('span');
        tick.className = 'b-tick';
        tick.textContent = row.symbol;
        const nameWrap = document.createElement('div');
        nameWrap.append(title, tick);
        const strat = document.createElement('div');
        strat.className = 'b-strat';
        const rankEl = document.createElement('span');
        rankEl.className = 'b-rank mono';
        rankEl.textContent = String(rank).padStart(2, '0');
        strat.append(rankEl, nameWrap);
        const v30 = document.createElement('span');
        v30.className = 'b-val mono';
        signed(row.roi30, v30);
        const v60 = document.createElement('span');
        v60.className = 'b-val mono';
        signed(row.roi60, v60);
        const sharpe = document.createElement('span');
        sharpe.className = 'b-val mono';
        sharpe.textContent = String(row.sharpe);
        const win = document.createElement('span');
        win.className = 'b-val mono';
        win.textContent = pct(row.winRate);
        el.append(strat, v30, v60, sharpe, win);
        boardRows.appendChild(el);
      });
    })
    .catch(() => {
      if (boardStatus) boardStatus.textContent = 'Unable to load live performance.';
    });
}

/* ── partner application forms ────────────────────────────── */
const fillSelect = (sel, items) => {
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  });
};
document.querySelectorAll('select[data-fill="countries"]').forEach(sel => {
  if (typeof COUNTRIES !== 'undefined') fillSelect(sel, COUNTRIES);
});
document.querySelectorAll('select[data-fill="languages"]').forEach(sel => {
  if (typeof LANGUAGES !== 'undefined') fillSelect(sel, LANGUAGES);
});

const required = (val, label) => !String(val).trim() ? `Please fill in ${label}` : '';
const emailErr = val =>
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim()) ? 'Please enter a valid email address' : '';
const monthsErr = (val, label, optional) => {
  const trimmed = String(val).trim();
  if (!trimmed) return optional ? '' : `Please fill in ${label}`;
  if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0) return `${label} must be a positive number`;
  return '';
};
const urlErr = (val, label) => {
  const trimmed = String(val).trim();
  if (!trimmed) return '';
  if (!/^https?:\/\/.+/i.test(trimmed)) return `${label} must start with http:// or https://`;
  return '';
};
const formDataOf = form => Object.fromEntries(new FormData(form).entries());
const firstErr = (...errs) => errs.find(Boolean) || '';

const validateGuild = d => firstErr(
  required(d.name, 'Name'),
  required(d.wallet, 'AlphaNet Wallet Address'),
  emailErr(d.email),
  required(d.telegram, 'Telegram Handle'),
  monthsErr(d.use_age, 'AlphaNet User Age (months)'),
  required(d.country, 'Country'),
  required(d.occupation, 'Occupation'),
  required(d.guild_value, 'Guild Value Add/Specialization/Focus'),
  required(d.proposition, "Your Understanding of AlphaNet's Value Proposition"),
  urlErr(d.community_link, 'Community Link')
);
const validateEducator = d => firstErr(
  required(d.name, 'Name'),
  emailErr(d.email),
  required(d.x_handle, 'X Handle'),
  monthsErr(d.use_age, 'AlphaNet User Age (months)', true),
  required(d.country, 'Country'),
  required(d.language, 'Language'),
  urlErr(d.blog_link, 'Blog Link'),
  urlErr(d.community_link, 'Community Link')
);

const openOverlay = overlay => {
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
};
const closeOverlay = overlay => {
  overlay.hidden = true;
  if (![...document.querySelectorAll('.form-overlay')].some(el => !el.hidden))
    document.body.style.overflow = '';
};

const bindForm = (id, type, validate) => {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  const modal = overlay.querySelector('.form-modal');
  const form = overlay.querySelector('form');
  const errEl = overlay.querySelector('.form-error');
  const submitBtn = overlay.querySelector('.form-submit');
  const showErr = msg => {
    errEl.hidden = !msg;
    errEl.textContent = msg || '';
  };
  overlay.querySelectorAll('[data-close-form]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlay(overlay));
  });
  overlay.addEventListener('click', evt => {
    if (evt.target === overlay) closeOverlay(overlay);
  });
  form.addEventListener('submit', async evt => {
    evt.preventDefault();
    const data = formDataOf(form);
    const err = validate(data);
    if (err) { showErr(err); return; }
    showErr('');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    console.log('submiting', data)
    try {
      const res = await fetch(`/register-api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('fail');
      modal.classList.add('is-success');
    } catch {
      showErr('Submission failed, please try again');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  });
};

bindForm('form-guild', 'guild', validateGuild);
bindForm('form-educator', 'educator', validateEducator);

document.querySelectorAll('[data-open-form]').forEach(btn => {
  btn.addEventListener('click', () => {
    const overlay = document.getElementById(`form-${btn.dataset.openForm}`);
    if (overlay) openOverlay(overlay);
  });
});
document.addEventListener('keydown', evt => {
  if (evt.key !== 'Escape') return;
  document.querySelectorAll('.form-overlay:not([hidden])').forEach(closeOverlay);
});

})();
