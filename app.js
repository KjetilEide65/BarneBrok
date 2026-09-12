/* BarneBrøk – prototype «hel og halv»
   Én mat, to venner. Barnet trykker for å dele, drar bitene til vennene,
   og begge må få like mye før de spiser. Ingen tekst, bare stemme og lyd. */

(() => {
  const $ = (s) => document.querySelector(s);
  const scene = $('#scene');
  const foodEl = $('#food');
  const halves = { left: $('#halfL'), right: $('#halfR') };
  const friends = { A: $('#friendA'), B: $('#friendB') };
  const knife = $('#knife');

  const FOODS = [
    { kind: 'apple',  name: 'eplet' },
    { kind: 'orange', name: 'appelsinen' },
    { kind: 'cake',   name: 'kaken' },
  ];

  const state = {
    phase: 'idle',        // idle | whole | halves | eating | join
    round: 0,
    plates: { A: null, B: null },   // hvilken halvdel (left/right) ligger på hvilken tallerken
    spot: { left: 'home', right: 'home' }, // home | A | B
    idleTimer: null,
  };

  /* ------------------------------------------------------------------ */
  /* Lyd: alt er syntetisert, så prototypen trenger ingen lydfiler.       */
  let ctx = null;
  function audio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = null) {
    const c = audio(); const t = c.currentTime + when;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.3, when = 0, cutoff = 1200) {
    const c = audio(); const t = c.currentTime + when;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  const sfx = {
    cut()     { noise(0.14, 0.4, 0, 3500); tone(900, 0.18, 'triangle', 0.15, 0, 250); },
    pick()    { tone(500, 0.08, 'sine', 0.15, 0, 850); },
    drop()    { tone(340, 0.14, 'sine', 0.22, 0, 200); },
    nope()    { tone(330, 0.18, 'square', 0.06); tone(262, 0.28, 'square', 0.06, 0.2); },
    chomp()   { noise(0.1, 0.35, 0, 700); tone(170, 0.1, 'sine', 0.18, 0, 110); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.16, i * 0.14)); tone(1047, 0.6, 'triangle', 0.14, 0.6); },
    join()    { tone(400, 0.12, 'sine', 0.15, 0, 620); tone(620, 0.18, 'sine', 0.15, 0.12, 900); },
  };

  /* ------------------------------------------------------------------ */
  /* Stemme: nettbrettets talesyntese på norsk.                           */
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^(nb|no|nn)/i.test(v.lang)) || vs.find(v => /norsk|norwegian/i.test(v.name)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }
  function say(text, delay = 0) {
    if (!('speechSynthesis' in window)) return;
    setTimeout(() => {
      const vs = speechSynthesis.getVoices();
      if (vs.length && !voice) { console.info('Ingen norsk stemme funnet, hopper over:', text); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nb-NO'; if (voice) u.voice = voice;
      u.rate = 0.9; u.pitch = 1.1;
      speechSynthesis.speak(u);
    }, delay);
  }

  /* ------------------------------------------------------------------ */
  /* Grafikk: mat og venner tegnes som SVG rett i koden.                  */
  let uid = 0;
  function foodSVG(kind, part) {
    const id = 'c' + (++uid);
    const clip = part === 'whole' ? '' :
      `<clipPath id="${id}"><rect x="${part === 'left' ? 0 : 50}" y="-10" width="50" height="120"/></clipPath>`;
    const g = part === 'whole' ? '<g>' : `<g clip-path="url(#${id})">`;
    let body = '';
    if (kind === 'apple') {
      const skin = 'M50 20 C 32 6, 8 22, 10 50 C 12 78, 30 96, 50 90 C 70 96, 88 78, 90 50 C 92 22, 68 6, 50 20 Z';
      body += `<path d="${skin}" fill="#e3342f"/>`;
      body += `<path d="${skin}" fill="#ff8a80" opacity=".35" transform="translate(-6 -6) scale(.6)" style="transform-origin:50% 50%"/>`;
      if (part !== 'whole') {
        body += `<g transform="translate(50 52) scale(.84) translate(-50 -52)"><path d="${skin}" fill="#fff3c4"/></g>`;
        body += `<ellipse cx="45" cy="52" rx="3.5" ry="6" fill="#4a2b12" transform="rotate(-15 45 52)"/>`;
        body += `<ellipse cx="55" cy="52" rx="3.5" ry="6" fill="#4a2b12" transform="rotate(15 55 52)"/>`;
      }
      body += `<path d="M50 20 C 52 12, 54 8, 57 3" stroke="#5b3a1e" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
      body += `<path d="M53 13 C 59 4, 70 5, 73 12 C 66 17, 57 17, 53 13 Z" fill="#3ba55d"/>`;
    } else if (kind === 'orange') {
      body += `<circle cx="50" cy="52" r="41" fill="#ff9f1c"/>`;
      body += `<circle cx="38" cy="40" r="10" fill="#ffc35c" opacity=".6"/>`;
      if (part !== 'whole') {
        body += `<circle cx="50" cy="52" r="36" fill="#fff4d6"/><circle cx="50" cy="52" r="32" fill="#ffcf5c"/>`;
        for (let a = 0; a < 360; a += 45) {
          const r = a * Math.PI / 180;
          body += `<line x1="50" y1="52" x2="${50 + 32 * Math.cos(r)}" y2="${52 + 32 * Math.sin(r)}" stroke="#fff4d6" stroke-width="2.5"/>`;
        }
      }
      body += `<path d="M50 11 C 54 6, 60 6, 62 10 C 58 13, 53 13, 50 11 Z" fill="#3ba55d"/>`;
    } else { // cake
      body += `<ellipse cx="50" cy="60" rx="42" ry="30" fill="#8b5a2b"/>`;
      body += `<rect x="8" y="42" width="84" height="18" fill="#8b5a2b"/>`;
      body += `<ellipse cx="50" cy="42" rx="42" ry="30" fill="#f6a5c0"/>`;
      body += `<ellipse cx="50" cy="42" rx="34" ry="22" fill="#ffd1e0"/>`;
      if (part !== 'whole') {
        body += `<rect x="46" y="20" width="8" height="70" fill="#f1e0c6"/>`;
        body += `<rect x="46" y="55" width="8" height="8" fill="#c4622d"/>`;
      }
      const sprinkles = [[30, 36, '#3ba55d'], [58, 30, '#3b82f6'], [70, 46, '#ffd60a'], [40, 52, '#e3342f'], [62, 56, '#3ba55d'], [26, 48, '#3b82f6']];
      sprinkles.forEach(([x, y, c], i) => body += `<rect x="${x}" y="${y}" width="6" height="2.6" rx="1.3" fill="${c}" transform="rotate(${i * 50} ${x} ${y})"/>`);
      body += `<circle cx="50" cy="30" r="7" fill="#d21f3c"/><path d="M50 24 C 51 16, 56 12, 60 10" stroke="#3b7a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
    // Halvdelene får en halvbred viewBox, så boksens midtpunkt er midt på biten.
    const vb = part === 'whole' ? '0 0 100 100' : part === 'left' ? '0 0 50 100' : '50 0 50 100';
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${clip}${g}${body}</g></svg>`;
  }

  function bearSVG() {
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <g class="head">
        <circle cx="28" cy="34" r="17" fill="#a5682a"/><circle cx="28" cy="34" r="9" fill="#e0b47a"/>
        <circle cx="92" cy="34" r="17" fill="#a5682a"/><circle cx="92" cy="34" r="9" fill="#e0b47a"/>
        <circle cx="60" cy="66" r="42" fill="#a5682a"/>
        <ellipse cx="60" cy="80" rx="20" ry="14" fill="#e0b47a"/>
        <ellipse cx="60" cy="73" rx="7" ry="5" fill="#3b2416"/>
        <circle class="eye" cx="45" cy="58" r="4.5" fill="#222"/><circle class="eye" cx="75" cy="58" r="4.5" fill="#222"/>
        <circle cx="46.5" cy="56.5" r="1.4" fill="#fff"/><circle cx="76.5" cy="56.5" r="1.4" fill="#fff"/>
        <path class="mouth mouth-neutral" d="M52 85 Q60 89 68 85" stroke="#3b2416" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path class="mouth mouth-happy" d="M49 82 Q60 96 71 82 Z" fill="#5a2d1a"/>
        <path class="mouth mouth-sad" d="M52 90 Q60 82 68 90" stroke="#3b2416" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse class="mouth mouth-chew" cx="60" cy="87" rx="9" ry="6" fill="#5a2d1a"/>
        <circle cx="34" cy="72" r="6" fill="#ff8a80" opacity=".5"/><circle cx="86" cy="72" r="6" fill="#ff8a80" opacity=".5"/>
      </g></svg>`;
  }
  function rabbitSVG() {
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <g class="head">
        <ellipse cx="44" cy="26" rx="10" ry="27" fill="#f2f2f2" transform="rotate(-8 44 26)"/>
        <ellipse cx="44" cy="28" rx="5" ry="19" fill="#f7b7c4" transform="rotate(-8 44 28)"/>
        <ellipse cx="76" cy="26" rx="10" ry="27" fill="#f2f2f2" transform="rotate(8 76 26)"/>
        <ellipse cx="76" cy="28" rx="5" ry="19" fill="#f7b7c4" transform="rotate(8 76 28)"/>
        <circle cx="60" cy="70" r="38" fill="#f2f2f2"/>
        <circle class="eye" cx="46" cy="64" r="4.5" fill="#222"/><circle class="eye" cx="74" cy="64" r="4.5" fill="#222"/>
        <circle cx="47.5" cy="62.5" r="1.4" fill="#fff"/><circle cx="75.5" cy="62.5" r="1.4" fill="#fff"/>
        <path d="M55 76 L65 76 L60 82 Z" fill="#f28c9f"/>
        <g stroke="#bbb" stroke-width="1.6" stroke-linecap="round">
          <line x1="28" y1="76" x2="48" y2="79"/><line x1="28" y1="84" x2="48" y2="82"/>
          <line x1="92" y1="76" x2="72" y2="79"/><line x1="92" y1="84" x2="72" y2="82"/>
        </g>
        <path class="mouth mouth-neutral" d="M53 88 Q60 92 67 88" stroke="#555" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path class="mouth mouth-happy" d="M50 86 Q60 100 70 86 Z" fill="#c2455f"/>
        <path class="mouth mouth-sad" d="M53 94 Q60 86 67 94" stroke="#555" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse class="mouth mouth-chew" cx="60" cy="90" rx="8" ry="6" fill="#c2455f"/>
        <rect x="56" y="86" width="8" height="6" rx="1.5" fill="#fff" stroke="#ddd" stroke-width="1"/>
        <circle cx="34" cy="78" r="6" fill="#f7b7c4" opacity=".7"/><circle cx="86" cy="78" r="6" fill="#f7b7c4" opacity=".7"/>
      </g></svg>`;
  }
  friends.A.querySelector('.body').innerHTML = bearSVG();
  friends.B.querySelector('.body').innerHTML = rabbitSVG();

  /* ------------------------------------------------------------------ */
  /* Plassering                                                            */
  const px = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  // Midtpunktet for maten regnes fra scenen, ikke fra mat-elementet,
  // fordi det er skjult mens kniven kutter.
  function foodCenter() {
    const r = scene.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.4, w: halves.left.getBoundingClientRect().width || 0 };
  }
  function homeFor(side) {
    const f = foodCenter(); const gap = f.w * 0.7;   // f.w er bredden på en halv bit
    return { x: f.x + (side === 'left' ? -gap : gap), y: f.y };
  }
  function plateFor(key) {
    const p = px(friends[key].querySelector('.plate'));
    return { x: p.x, y: p.y - p.h * 0.35 };
  }
  function place(el, pt) { el.style.left = pt.x + 'px'; el.style.top = pt.y + 'px'; }
  function layout() {
    for (const side of ['left', 'right']) {
      const s = state.spot[side];
      if (halves[side].classList.contains('dragging')) continue;
      halves[side].classList.toggle('onplate', s !== 'home');
      place(halves[side], s === 'home' ? homeFor(side) : plateFor(s));
    }
  }
  window.addEventListener('resize', layout);

  function setFace(key, face) { friends[key].dataset.face = face; }
  const nameOf = (key) => friends[key].dataset.name;
  const capOf = (key) => friends[key].dataset.cap;

  /* ------------------------------------------------------------------ */
  /* Runder                                                                */
  function setPhase(p) { state.phase = p; scene.dataset.phase = p; resetIdle(); }

  function startRound(first) {
    const food = FOODS[state.round % FOODS.length];
    state.plates = { A: null, B: null };
    state.spot = { left: 'home', right: 'home' };
    setFace('A', 'neutral'); setFace('B', 'neutral');
    foodEl.innerHTML = foodSVG(food.kind, 'whole');
    halves.left.innerHTML = foodSVG(food.kind, 'left');
    halves.right.innerHTML = foodSVG(food.kind, 'right');
    for (const h of Object.values(halves)) h.classList.remove('eaten', 'show', 'nope', 'onplate');

    if (first) {
      setPhase('whole');
      say(`Hei! Bamsen og kaninen er sultne. Kan du dele ${food.name} så begge får like mye?`, 300);
      return;
    }
    // «To halve blir en hel»: de nye halvdelene glir sammen til en hel mat.
    setPhase('join');
    foodEl.style.opacity = '0';
    const f = foodCenter();
    place(halves.left, { x: -f.w, y: f.y }); place(halves.right, { x: window.innerWidth + f.w, y: f.y });
    halves.left.classList.add('show'); halves.right.classList.add('show');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      place(halves.left, { x: f.x, y: f.y }); place(halves.right, { x: f.x, y: f.y });
    }));
    setTimeout(() => {
      sfx.join();
      halves.left.classList.remove('show'); halves.right.classList.remove('show');
      foodEl.style.opacity = '1';
      say(`To halve blir en hel! Kan du dele ${food.name} så begge får like mye?`, 200);
      setPhase('whole');
    }, 700);
  }

  function cut() {
    if (state.phase !== 'whole') return;
    setPhase('cutting');
    knife.classList.remove('chop'); void knife.offsetWidth; knife.classList.add('chop');
    setTimeout(() => {
      sfx.cut();
      const f = foodCenter();
      place(halves.left, { x: f.x, y: f.y }); place(halves.right, { x: f.x, y: f.y });
      halves.left.classList.add('show'); halves.right.classList.add('show');
      setPhase('halves');
      requestAnimationFrame(() => requestAnimationFrame(layout));
      say('Snitt! Nå er det to halve. Gi en bit til hver.', 300);
    }, 330);
  }
  foodEl.addEventListener('pointerup', (e) => { e.preventDefault(); cut(); });

  /* Dra og slipp */
  let drag = null;
  for (const side of ['left', 'right']) {
    const el = halves[side];
    el.addEventListener('pointerdown', (e) => {
      if (state.phase !== 'halves' || drag) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      drag = { side, id: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
      // Løftes den fra en tallerken, blir tallerkenen tom igjen.
      const from = state.spot[side];
      if (from !== 'home') { state.plates[from] = null; setFace(from, 'neutral'); }
      el.classList.add('dragging'); el.classList.remove('nope', 'onplate');
      sfx.pick(); resetIdle();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      place(el, { x: e.clientX - drag.dx, y: e.clientY - drag.dy });
      const over = plateUnder(e.clientX, e.clientY);
      friends.A.classList.toggle('target', over === 'A');
      friends.B.classList.toggle('target', over === 'B');
    });
    const finish = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      el.classList.remove('dragging');
      friends.A.classList.remove('target'); friends.B.classList.remove('target');
      const over = plateUnder(e.clientX, e.clientY);
      const s = drag.side; drag = null;
      dropOn(s, over);
    };
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  }

  function plateUnder(x, y) {
    for (const key of ['A', 'B']) {
      const p = px(friends[key].querySelector('.plate'));
      const fr = px(friends[key]);
      // Hele vennen + tallerkenen teller som treffsone. Små hender er upresise.
      const within = x > fr.x - fr.w * 0.75 && x < fr.x + fr.w * 0.75 && y > fr.y - fr.h * 0.7 && y < p.y + p.h;
      if (within) return key;
    }
    return null;
  }

  function dropOn(side, key) {
    if (!key) { state.spot[side] = 'home'; layout(); return; }
    const other = key === 'A' ? 'B' : 'A';
    if (state.plates[key]) {
      // Samme venn har allerede en bit. Den andre blir lei seg, biten spretter tilbake.
      sfx.nope();
      state.spot[side] = 'home'; layout();
      halves[side].classList.add('nope');
      setFace(other, 'sad');
      say(`Å nei, ${nameOf(other)} fikk ingenting! Kan du gi en bit til ${nameOf(other)}?`, 200);
      return;
    }
    state.plates[key] = side; state.spot[side] = key;
    halves[side].classList.add('onplate');
    place(halves[side], plateFor(key));
    sfx.drop(); setFace(key, 'happy');
    if (state.plates[other]) { eat(); }
    else { setFace(other, 'neutral'); say(`${capOf(key)} fikk en halv. Og ${nameOf(other)}?`, 150); }
  }

  function eat() {
    setPhase('eating');
    say('Begge fikk halvparten! Like mye!', 200);
    setFace('A', 'chew'); setFace('B', 'chew');
    [0, 380, 760, 1140].forEach(t => setTimeout(sfx.chomp, t));
    setTimeout(() => { halves.left.classList.add('eaten'); halves.right.classList.add('eaten'); }, 300);
    setTimeout(() => {
      setFace('A', 'happy'); setFace('B', 'happy');
      sfx.fanfare(); confetti();
      say('Mmm! Takk for maten!', 300);
    }, 1500);
    setTimeout(() => { state.round++; startRound(false); }, 4200);
  }

  function confetti() {
    const box = $('#confetti'); box.innerHTML = '';
    const colors = ['#e3342f', '#ffd60a', '#3ba55d', '#3b82f6', '#f6a5c0', '#ff9f1c'];
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDuration = (2 + Math.random() * 1.5) + 's';
      s.style.animationDelay = (Math.random() * 0.6) + 's';
      s.style.borderRadius = Math.random() > .5 ? '50%' : '.4vmin';
      box.appendChild(s);
    }
    setTimeout(() => (box.innerHTML = ''), 4000);
  }

  /* Hint når barnet blir stille lenge */
  function resetIdle() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(hint, 12000);
  }
  function hint() {
    if (state.phase === 'whole') {
      foodEl.classList.remove('nudge'); void foodEl.offsetWidth; foodEl.classList.add('nudge');
      const food = FOODS[state.round % FOODS.length];
      say(`Trykk på ${food.name} for å dele det i to.`);
    } else if (state.phase === 'halves') {
      const free = ['A', 'B'].filter(k => !state.plates[k]);
      free.forEach(k => friends[k].classList.add('target'));
      setTimeout(() => free.forEach(k => friends[k].classList.remove('target')), 1500);
      say('Dra en bit til hver av vennene.');
    }
    resetIdle();
  }
  scene.addEventListener('pointerdown', resetIdle);

  /* Start og voksenmodus */
  $('#startBtn').addEventListener('click', () => {
    audio(); pickVoice();
    $('#start').classList.add('hidden');
    startRound(true);
  });
  $('#infoBtn').addEventListener('click', () => { $('#info').classList.remove('hidden'); if ('speechSynthesis' in window) speechSynthesis.cancel(); });
  $('#infoClose').addEventListener('click', () => { $('#info').classList.add('hidden'); resetIdle(); });
})();
