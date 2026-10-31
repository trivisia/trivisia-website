// Trivisia Interiors: page interactions
(() => {
  const WA = '917841013750';
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const mbar = document.getElementById('mbar');
  document.getElementById('yr').textContent = new Date().getFullYear();

  // Nav state + mobile bar
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    mbar.classList.toggle('show', y > window.innerHeight * .8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  // In-page links scroll via JS so they work everywhere (local files, previews, embedded views)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (id && !target) return;
    e.preventDefault();
    if (!id) return; // bare "#" placeholder links do nothing
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
    if (!target || id === 'home') scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (id === 'contact') setTimeout(() => target.querySelector('input')?.focus({ preventScroll: true }), 800);
    try { history.replaceState(null, '', '#' + id); } catch {}
  });

  // Active link highlight
  const links = [...document.querySelectorAll('.menu a')];
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'services', 'portfolio', 'why', 'contact'].forEach(id => spy.observe(document.getElementById(id)));

  // Scroll reveal
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // 3D tilt on concept cards (pointer devices only)
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.concept').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateY(${(x - .5) * 10}deg) rotateX(${(.5 - y) * 8}deg) translateY(-6px)`;
        card.style.setProperty('--gx', x * 100 + '%');
        card.style.setProperty('--gy', y * 100 + '%');
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  // Services tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('on', x === t));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.dataset.p === t.dataset.t));
  }));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
  });

  // Lead forms
  // Set LEAD_ENDPOINT to a form backend (Web3Forms, Formspree, Google Apps Script...) to receive leads
  // by email/sheet. Left empty, each lead opens WhatsApp with all details prefilled.
  const LEAD_ENDPOINT = '';
  const LEAD_EXTRA = {}; // e.g. { access_key: 'your-web3forms-key' }

  const rules = {
    name: v => v.length >= 2 || 'Please enter your full name',
    phone: v => /^(?:\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s\-()]/g, '').replace(/^0/, '')) || 'Enter a valid 10-digit mobile number',
    type: v => !!v || 'Please choose a property type',
    city: v => v.length >= 2 || 'Please enter your city'
  };
  const setErr = (f, msg) => {
    const box = f.parentElement;
    box.classList.toggle('err', !!msg);
    let m = box.querySelector('.emsg');
    if (msg && !m) { m = document.createElement('small'); m.className = 'emsg'; m.id = f.name + '-' + Math.random().toString(36).slice(2, 7); box.append(m); f.setAttribute('aria-describedby', m.id); }
    if (m) m.textContent = msg || '';
    f.setAttribute('aria-invalid', !!msg);
  };
  const waLink = d => `https://wa.me/${WA}?text=${encodeURIComponent(
    `Hi Trivisia Interiors, I'd like a free estimate & design consultation.\n\n` +
    `Name: ${d.name}\nPhone: ${d.phone}\nProperty Type: ${d.type}\nLocation: ${d.city}` +
    (d.msg ? `\nRequirements: ${d.msg}` : ''))}`;

  document.querySelectorAll('.form').forEach(form => {
    const card = form.closest('.lead-card');
    const okText = card.querySelector('.form-ok p');
    const btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      let first = null;
      Object.entries(rules).forEach(([n, test]) => {
        const f = form.elements[n], r = test(f.value.trim());
        setErr(f, r === true ? '' : r);
        if (r !== true && !first) first = f;
      });
      if (first) { first.focus(); return; }
      const d = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));

      if (!LEAD_ENDPOINT) {
        window.open(waLink(d), '_blank', 'noopener');
        card.classList.add('sent');
        return;
      }
      btn.disabled = true;
      const label = btn.firstChild.textContent;
      btn.firstChild.textContent = 'Sending… ';
      try {
        const res = await fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...LEAD_EXTRA, subject: `New lead: ${d.type} in ${d.city}`, source: location.href, ...d })
        });
        if (!res.ok) throw new Error(res.status);
        okText.innerHTML = 'Your request has reached our design team. We\'ll call you within one working day. Want a faster reply?';
      } catch {
        okText.innerHTML = 'We couldn\'t send the form just now. Tap below to send your details to us on WhatsApp instead.';
      }
      const wa = document.createElement('a');
      wa.className = 'btn btn-gold'; wa.target = '_blank'; wa.rel = 'noopener'; wa.href = waLink(d);
      wa.textContent = 'Continue on WhatsApp';
      card.querySelector('.form-ok .btn')?.remove();
      okText.after(wa);
      card.classList.add('sent');
      btn.disabled = false; btn.firstChild.textContent = label;
    });
    form.addEventListener('input', e => { if (e.target.parentElement.classList.contains('err')) setErr(e.target, ''); });
    form.addEventListener('change', e => { if (e.target.tagName === 'SELECT') setErr(e.target, ''); });
  });

  // Concept detail modal
  const concepts = [
    { tag: 'Concept 01 · Residential', type: 'Residential', img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80',
      title: 'Luxury Residential Living',
      desc: 'A living room built around layered ambient lighting, bespoke furniture and tactile materials. Calm and airy by day, warm and dramatic by night.',
      stats: [['350–600', 'sq.ft'], ['6–8 wks', 'Timeline'], ['3-Layer', 'Lighting']],
      list: ['Cove, accent and task lighting on separate scenes', 'Custom sofa, TV wall and veneer panelling', 'Italian marble or premium vitrified flooring', 'Curated decor, drapes and art styling'] },
    { tag: 'Concept 02 · Commercial', type: 'Commercial', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
      title: 'Smart & Minimalist Workspace',
      desc: 'A modern corporate office balancing open collaboration with quiet focus zones, designed for ergonomics, acoustics and a strong brand first impression.',
      stats: [['1,500+', 'sq.ft'], ['8–12 wks', 'Timeline'], ['Acoustic', 'Panelling']],
      list: ['Ergonomic workstations and glass-partition cabins', 'Acoustic ceiling baffles and wall panels', 'Smart, sensor-based lighting and HVAC planning', 'Branded reception, boardroom and breakout areas'] },
    { tag: 'Concept 03 · Modular', type: 'Residential', img: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1600&q=80',
      title: 'Architectural Kitchen & Modular Spaces',
      desc: 'A functional, space-saving modular kitchen with high-end finishes and storage planned around everyday Indian cooking.',
      stats: [['80–200', 'sq.ft'], ['3–5 wks', 'Timeline'], ['Soft-close', 'Hardware']],
      list: ['L, U, parallel or island layouts planned to the work triangle', 'Soft-close drawers, tall units and corner solutions', 'Quartz countertops and anti-fingerprint finishes', 'Chimney, hob and appliance integration'] }
  ];
  const cm = document.getElementById('cm');
  let current = null, opener = null;
  const ico = id => `<svg><use href="#${id}"/></svg>`;
  const openConcept = (i, from) => {
    const c = concepts[i]; current = c; opener = from;
    document.getElementById('cm-img').style.backgroundImage = `url('${c.img}')`;
    document.getElementById('cm-img').setAttribute('aria-label', c.title);
    document.getElementById('cm-tag').textContent = c.tag;
    document.getElementById('cm-title').textContent = c.title;
    document.getElementById('cm-desc').textContent = c.desc;
    document.getElementById('cm-stats').innerHTML = c.stats.map(([b, s]) => `<div><b>${b}</b>${s}</div>`).join('');
    document.getElementById('cm-list').innerHTML = c.list.map(t => `<li>${ico('check')}${t}</li>`).join('');
    cm.showModal();
  };
  document.querySelectorAll('.concept[data-c]').forEach(card => {
    card.addEventListener('click', () => openConcept(+card.dataset.c, card));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openConcept(+card.dataset.c, card); } });
  });
  document.getElementById('cm-x').addEventListener('click', () => cm.close());
  cm.addEventListener('click', e => { if (e.target === cm) cm.close(); });
  cm.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  document.getElementById('cm-cta').addEventListener('click', () => {
    const form = document.querySelector('#contact .form');
    form.elements.type.value = current.type;
    const msg = form.elements.msg;
    if (!msg.value.trim()) msg.value = `I'm interested in the "${current.title}" concept.`;
    opener = null;
    cm.close();
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 700);
  });

  // Number counters roll up when visible
  const cio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.to, t0 = performance.now(), dur = 1800;
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  if (!reduce) document.querySelectorAll('[data-to]').forEach(el => { el.textContent = '0'; cio.observe(el); });

  // Before / after sliders (Services tabs + Transformations). Each sweeps once on first view to show it moves.
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const sweepIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { sweepIO.unobserve(e.target); setTimeout(() => e.target.sweep(), 300); }
  }), { threshold: .55 });
  document.querySelectorAll('.ba').forEach(b => {
    const r = b.querySelector('input');
    let raf = 0;
    const set = v => { r.value = v; b.style.setProperty('--pos', v + '%'); };
    const stop = () => { cancelAnimationFrame(raf); b.dataset.touched = 1; };
    r.addEventListener('input', () => { stop(); b.style.setProperty('--pos', r.value + '%'); });
    r.addEventListener('pointerdown', stop);
    b.sweep = () => {
      if (reduce || b.dataset.touched) return;
      const stops = [50, 90, 10, 50], seg = 1100, t0 = performance.now();
      const tick = now => {
        const p = (now - t0) / seg, i = Math.floor(p);
        if (i >= stops.length - 1) return set(50);
        set(stops[i] + (stops[i + 1] - stops[i]) * ease(p - i));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    sweepIO.observe(b);
  });
  const ba = document.getElementById('ba');
  const baAfter = ba.querySelector('.after'), baBefore = ba.querySelector('.before img');
  const roomChips = document.querySelectorAll('#ba-rooms .chip');
  roomChips.forEach(chip => chip.addEventListener('click', () => {
    roomChips.forEach(c => { c.classList.toggle('on', c === chip); c.setAttribute('aria-pressed', c === chip); });
    const { name, after, before } = chip.dataset;
    baAfter.src = after; baAfter.alt = `${name} after the Trivisia makeover`;
    baBefore.src = before || after; baBefore.alt = `${name} before the makeover`;
    baBefore.parentElement.classList.toggle('ph', !before);
    delete ba.dataset.touched; ba.sweep();
  }));

  // Project gallery: filters + full-screen lightbox
  const gItems = [...document.querySelectorAll('.g-item')];
  const gFilters = document.querySelectorAll('#g-filters .chip');
  gFilters.forEach(f => f.addEventListener('click', () => {
    gFilters.forEach(x => { x.classList.toggle('on', x === f); x.setAttribute('aria-pressed', x === f); });
    gItems.forEach(it => it.classList.toggle('hide', f.dataset.f !== 'all' && it.dataset.cat !== f.dataset.f));
  }));
  const lb = document.getElementById('lb'), lbImg = document.getElementById('lb-img');
  let lbList = [], lbI = 0;
  const showLb = () => {
    const it = lbList[lbI], img = it.querySelector('img');
    lbImg.src = img.src.replace(/w=\d+/, 'w=1800').replace(/q=\d+/, 'q=85');
    lbImg.alt = img.alt;
    document.getElementById('lb-cap').innerHTML = it.querySelector('.cap').innerHTML;
    document.getElementById('lb-count').textContent = `${lbI + 1} / ${lbList.length}`;
  };
  const stepLb = d => { lbI = (lbI + d + lbList.length) % lbList.length; showLb(); };
  gItems.forEach(it => it.addEventListener('click', () => {
    lbList = gItems.filter(x => !x.classList.contains('hide'));
    lbI = lbList.indexOf(it);
    showLb();
    lb.showModal();
  }));
  document.getElementById('lb-prev').addEventListener('click', () => stepLb(-1));
  document.getElementById('lb-next').addEventListener('click', () => stepLb(1));
  document.getElementById('lb-x').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') stepLb(-1); if (e.key === 'ArrowRight') stepLb(1); });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (tx !== null && Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1);
    tx = null;
  });

  // Video walkthroughs: muted hover preview, full player with sound on click
  const reels = [...document.querySelectorAll('.reel')];
  const reelRow = document.getElementById('reel-row');
  const startOf = r => +r.dataset.start || 0;
  // Checked per event (not by media query) so touchscreen laptops with a mouse still get previews
  reels.forEach(r => {
    const v = r.querySelector('video');
    let hovering = false;
    r.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      hovering = true;
      if (!v.src) { v.src = r.dataset.src + '#t=' + startOf(r); r.classList.add('loading'); }
      v.play().then(() => { if (hovering) r.classList.add('live'); else v.pause(); }).catch(() => {});
    });
    r.addEventListener('pointerleave', () => { hovering = false; v.pause(); r.classList.remove('live'); });
    v.addEventListener('playing', () => r.classList.remove('loading'));
    v.addEventListener('timeupdate', () => r.style.setProperty('--prog', (v.currentTime / v.duration * 100 || 0) + '%'));
  });
  const vp = document.getElementById('vp'), vpVideo = document.getElementById('vp-video');
  let vpI = 0;
  const showVp = () => {
    const r = reels[vpI];
    vpVideo.src = r.dataset.src + '#t=' + startOf(r);
    vpVideo.poster = r.querySelector('img').src;
    document.getElementById('vp-cap').innerHTML = `<b>${r.querySelector('.reel-cap b').innerHTML}</b><span>${r.querySelector('.reel-cap span').innerHTML}</span>`;
    vpVideo.play().catch(() => {});
  };
  reels.forEach((r, i) => r.addEventListener('click', () => {
    r.querySelector('video').pause(); r.classList.remove('live');
    vpI = i; vp.showModal(); showVp();
  }));
  const stepVp = d => { vpI = (vpI + d + reels.length) % reels.length; showVp(); };
  document.getElementById('vp-prev').addEventListener('click', () => stepVp(-1));
  document.getElementById('vp-next').addEventListener('click', () => stepVp(1));
  document.getElementById('vp-x').addEventListener('click', () => vp.close());
  vp.addEventListener('click', e => { if (e.target === vp || e.target.tagName === 'FIGURE') vp.close(); });
  vp.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') stepVp(-1); if (e.key === 'ArrowRight') stepVp(1); });
  vp.addEventListener('close', () => { vpVideo.pause(); vpVideo.removeAttribute('src'); vpVideo.load(); });
  const reelStep = () => reels[1].offsetLeft - reels[0].offsetLeft;
  document.getElementById('reel-prev').addEventListener('click', () => reelRow.scrollBy({ left: -reelStep(), behavior: reduce ? 'auto' : 'smooth' }));
  document.getElementById('reel-next').addEventListener('click', () => {
    const atEnd = reelRow.scrollLeft + reelRow.clientWidth >= reelRow.scrollWidth - 4;
    reelRow.scrollTo({ left: atEnd ? 0 : reelRow.scrollLeft + reelStep(), behavior: reduce ? 'auto' : 'smooth' });
  });

  // Reviews carousel
  const track = document.getElementById('rev-track'), cards = [...track.children], dotsBox = document.getElementById('rev-dots');
  let pages = 1;
  const cardW = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const idx = () => Math.min(Math.round(track.scrollLeft / cardW()), pages - 1);
  const go = i => track.scrollTo({ left: ((i % pages + pages) % pages) * cardW(), behavior: reduce ? 'auto' : 'smooth' });
  const syncDots = () => [...dotsBox.children].forEach((b, i) => b.classList.toggle('on', i === idx()));
  const buildDots = () => {
    pages = Math.max(1, cards.length - Math.round(track.clientWidth / cardW()) + 1);
    dotsBox.innerHTML = Array.from({ length: pages }, (_, i) => `<button type="button" aria-label="Show review ${i + 1}"></button>`).join('');
    [...dotsBox.children].forEach((b, i) => b.addEventListener('click', () => go(i)));
    syncDots();
  };
  buildDots();
  addEventListener('resize', buildDots);
  track.addEventListener('scroll', () => requestAnimationFrame(syncDots), { passive: true });
  document.getElementById('rev-prev').addEventListener('click', () => go(idx() - 1));
  document.getElementById('rev-next').addEventListener('click', () => go(idx() + 1));
  let paused = false, revVisible = false;
  const revSec = document.getElementById('reviews');
  ['mouseenter', 'focusin', 'touchstart'].forEach(ev => revSec.addEventListener(ev, () => { paused = true; }, { passive: true }));
  ['mouseleave', 'focusout'].forEach(ev => revSec.addEventListener(ev, () => { paused = false; }));
  new IntersectionObserver(([e]) => { revVisible = e.isIntersecting; }).observe(revSec);
  if (!reduce) setInterval(() => { if (!paused && revVisible && !document.hidden) go(idx() + 1); }, 5000);
})();
