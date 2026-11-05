// In-page layout checks. Returns a list of problems for the current screen.
module.exports = async function check(p, touch) {
  const at = async (pos) => p.evaluate(({ pos, touch }) => {
    const W = innerWidth, H = innerHeight, out = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return null; const dd = e.closest('details:not([open])'); if (dd && !e.closest('summary') && e !== dd) return null; return r; };
    const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + (e.textContent ? ' "' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 24) + '"' : '');
    const isFixed = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const ps = getComputedStyle(a).position; if (ps === 'fixed' || ps === 'sticky') return a; } return null; };
    const clipped = e => { for (let a = e.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' || cs.overflow === 'hidden' || cs.clipPath !== 'none') return a; } return null; };
    const modalSel = '[role=dialog],[aria-modal=true],#dailyPanel,#rareFind,#a11yPanel,.uiMenu,[role=menu],.fxStage,.biIntro,#cardDetails,#tradePicker';
    const inTop = e => !topModal || topModal.contains(e);
    const modals = [...document.querySelectorAll(modalSel)].filter(vis);
    // The pop-up actually on top: the one hit at its own centre, preferring the highest z-index.
    const z = e => { let m = 0; for (let a = e; a && a !== document.body; a = a.parentElement) { const v = parseInt(getComputedStyle(a).zIndex, 10); if (v > m) m = v; } return m; };
    const topModal = modals.filter(m => getComputedStyle(m).position === 'fixed' || isFixed(m)).sort((a, b) => z(a) - z(b)).pop() || modals[modals.length - 1];
    if (pos === 'top') {
      if (document.documentElement.scrollWidth > W + 1) out.push(['hscroll', `scrollWidth ${document.documentElement.scrollWidth} > ${W}`]);
      // Elements poking outside the viewport (not inside a clipping/scrolling box).
      const offs = [];
      for (const e of document.querySelectorAll('body *')) {
        if (!inTop(e)) continue;
        if (['SCRIPT', 'STYLE', 'svg', 'path'].includes(e.tagName) || e.closest('svg')) continue;
        const r = vis(e); if (!r) continue;
        if (r.right > W + 2 || r.left < -2) { if (clipped(e)) continue; if (isFixed(e) && getComputedStyle(e).pointerEvents === 'none') continue; offs.push(e); }
      }
      const topOffs = offs.filter(e => !offs.includes(e.parentElement));
      topOffs.slice(0, 6).forEach(e => { const r = e.getBoundingClientRect(); out.push(['offscreen', `${name(e)} [${Math.round(r.left)}..${Math.round(r.right)}]`]); });
      if (topOffs.length > 6) out.push(['offscreen', `+${topOffs.length - 6} more`]);
      // Pop-ups fully on screen with a close button in reach.
      for (const m of modals) {
        const r = m.getBoundingClientRect();
        const box = m.firstElementChild && getComputedStyle(m).position === 'fixed' && r.width >= W - 2 && r.height >= H - 2 ? m.firstElementChild : m;
        const rb = box.getBoundingClientRect();
        if (rb.left < -1 || rb.right > W + 1 || (rb.top < -1 && getComputedStyle(m).overflowY === 'visible') || (rb.bottom > H + 1 && getComputedStyle(m).overflowY === 'visible' && getComputedStyle(box).overflowY === 'visible')) out.push(['popup-off', `${name(m)} box ${Math.round(rb.left)},${Math.round(rb.top)} ${Math.round(rb.width)}x${Math.round(rb.height)}`]);
        const x = [...m.querySelectorAll('button')].find(b => /close|×|✕|done|ok|got it|back|later|continue|^x$/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent.trim()));
        if (x) { const xr = x.getBoundingClientRect(); if (xr.top < 0 || xr.bottom > H || xr.left < 0 || xr.right > W) out.push(['close-off', `${name(m)} close ${Math.round(xr.left)},${Math.round(xr.top)}`]); }
      }
    }
    // Interactive or text things covered by a fixed bar/button (only those that cannot be scrolled clear).
    const items = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [data-go], p, h1, h2, h3, li, label')].filter(e => !topModal || topModal.contains(e));
    const seen = new Set();
    for (const e of items) {
      const r = vis(e); if (!r) continue;
      if (r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) continue;
      if (isFixed(e)) continue;
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 6, r.top + r.height / 2], [r.right - 6, r.top + r.height / 2]];
      for (const [x, y] of pts) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const hit = document.elementFromPoint(x, y); if (!hit || e.contains(hit) || hit.contains(e)) continue;
        const f = isFixed(hit); if (!f || f.contains(e)) continue;
        if (hit.closest('.fxStage,.biIntro,.fxBurst,.fxCoinShower,#rareFind,.tradeDone,.uiCloudDlg')) continue; // pack reveal / boss intro animations are meant to cover the page
        if (topModal && topModal.contains(hit) && !topModal.contains(e)) continue;
        const fr = f.getBoundingClientRect(), upper = fr.top + fr.height / 2 < H / 2;
        const scrolls = document.documentElement.scrollHeight - H > 4;
        if (scrolls && ((pos === 'top' && !upper) || (pos === 'bottom' && upper))) continue;
        const k = name(f) + '>' + name(e); if (seen.has(k)) continue; seen.add(k);
        out.push(['covered', `${name(e)} under ${name(f)}`]); break;
      }
    }
    if (pos === 'top') {
      // Words cut off inside buttons and headings (text wider than its box).
      const cut = [];
      for (const e of document.querySelectorAll('button, h1, h2, h3, .button, [role=button]')) {
        if (!inTop(e) || e.closest('.mythCard,.uiX,.fxStage,[aria-hidden=true]')) continue;
        const r = vis(e); if (!r || !e.textContent.trim()) continue;
        const rr = e.getBoundingClientRect(), tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let over = 0;
        for (let t; (t = tw.nextNode());) { if (!t.textContent.trim() || t.parentElement.closest('[aria-hidden=true],.mythCard,.mythlingArt')) continue; { const pr = t.parentElement.getBoundingClientRect(); if (pr.width <= 1 || pr.height <= 1) continue; } /* screen-reader-only text */ const rg = document.createRange(); rg.selectNodeContents(t); for (const q of rg.getClientRects()) over = Math.max(over, rr.left - q.left, q.right - rr.right); }
        if (over > 2) cut.push(`${name(e)} text ${Math.round(over)}px past edge`);
      }
      if (cut.length) out.push(['text-cut', `${cut.length}: ` + cut.slice(0, 6).join(' | ')]);
    }
    if (touch && pos === 'top') {
      const small = [];
      for (const e of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, [role=button], [role=menuitem], [data-go], summary')) {
        if (!inTop(e) || e.closest('#rareFind')) continue;
        const r = vis(e); if (!r) continue; if (e.closest('[aria-hidden=true]') || e.closest('.mythCard') && !e.matches('button')) continue;
        let w = r.width, h = r.height; if (e.matches('input[type=radio],input[type=checkbox]')) { const l = e.closest('label'); if (l) { const lr = l.getBoundingClientRect(); w = lr.width; h = lr.height; } }
        // A small button still passes when a tap 20 px from its centre in each direction lands on it (a padded or pseudo-element tap area).
        if (Math.min(w, h) < 40 - 0.5 && w * h > 0 && !e.matches('input,select')) { const cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = 19.5; const pts = [[cx, cy - d], [cx, cy + d], [cx - d, cy], [cx + d, cy]]; if (pts.every(([x, y]) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const h2 = document.elementFromPoint(x, y); return h2 && (h2 === e || e.contains(h2)); })) continue; }
        if (Math.min(w, h) < 40 - 0.5 && w * h > 0) small.push(`${name(e)} ${Math.round(w)}x${Math.round(h)}`);
      }
      if (small.length) out.push(['small-tap', `${small.length}: ` + small.slice(0, 8).join(' | ')]);
    }
    return out;
  }, { pos, touch });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(150);
  const res = await at('top');
  const sh = await p.evaluate(() => { const m = document.documentElement.scrollHeight - innerHeight; if (m > 4) { scrollTo(0, m); return true; } return false; });
  if (sh) { await p.waitForTimeout(250); res.push(...await at('bottom')); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100); }
  return res;
};
