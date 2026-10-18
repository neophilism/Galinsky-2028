(() => {
  // All flag elements, including the fifty stars, are particles. No external
  // scripts, WebGL, personal data, motion controls, or continuous work offscreen.
  const canvas = document.querySelector('.flag-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const WANDER_SECONDS = 2.7;
  const FORM_SECONDS = 4.1;
  const ROWS = 39;
  const COLS = 66;
  const particles = [];
  const noise = seed => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return value - Math.floor(value);
  };

  function addParticle(u, v, color, seed, kind = 'fabric') {
    particles.push({
      u, v, color, seed, kind,
      x: noise(seed + 11) * 0.96 + 0.02,
      y: noise(seed + 31) * 0.84 + 0.08,
      vx: (noise(seed + 53) - .5) * .28,
      vy: (noise(seed + 79) - .5) * .24
    });
  }

  // Deliberately open dot-weave so the portrait remains prominent in front.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const canton = col < 26 && row < 21;
      if ((row + col) % 2 && !canton) continue;
      const red = Math.floor(row / 3) % 2 === 0;
      addParticle(col / (COLS - 1), row / (ROWS - 1),
        canton ? '#0a3161' : red ? '#b31942' : '#a4b7ce', row * COLS + col);
    }
  }

  // Exactly 50 stars: alternating rows of six and five. Each star is drawn
  // by fifteen small WHITE DOTS, not by a solid polygon painted over the flag.
  for (let row = 0; row < 9; row++) {
    const count = row % 2 === 0 ? 6 : 5;
    for (let col = 0; col < count; col++) {
      const u = (col + (row % 2 === 0 ? .5 : 1)) / 6 * .378;
      const v = (row + .65) / 9 * .51;
      for (let k = 0; k < 10; k++) {
        const angle = -Math.PI / 2 + k * Math.PI / 5;
        const radius = k % 2 === 0 ? 1 : .44;
        addParticle(u + Math.cos(angle) * .0063 * radius,
          v + Math.sin(angle) * .0108 * radius,
          '#ffffff', 4000 + row * 400 + col * 25 + k, 'star');
      }
      for (let k = 0; k < 5; k++) {
        const angle = -Math.PI / 2 + k * Math.PI * 2 / 5;
        addParticle(u + Math.cos(angle) * .0063 * .58,
          v + Math.sin(angle) * .0108 * .58,
          '#ffffff', 5000 + row * 400 + col * 25 + k, 'star');
      }
    }
  }

  // Avoid continuous 60fps redraws for a wholly decorative background.
  // Prefer a lighter 15fps cadence at mobile widths; do not change the
  // documented offscreen, hidden-tab or reduced-motion stop conditions.
  const frameInterval = window.matchMedia('(max-width: 780px)').matches ? 1000 / 15 : 1000 / 30;
  let previousPaint = 0;
  let width = 1, height = 1, elapsed = 0, lastFrame = 0, handle = 0;
  let visible = true;
  // Persist visitors' preferences without depending on storage availability.
  const preferenceKey = 'g28-hero-motion-paused';
  let paused = false;
  try { paused = window.localStorage.getItem(preferenceKey) === 'true'; } catch {}
  const control = document.querySelector('#flag-motion-toggle');
  function updateControl() {
    if (!control) return;
    control.setAttribute('aria-pressed', String(paused));
    control.textContent = paused ? 'Resume flag animation' : 'Pause flag animation';
  }
  control?.addEventListener('click', () => {
    paused = !paused;
    try { window.localStorage.setItem(preferenceKey, String(paused)); } catch {}
    updateControl();
    synchronize();
  });
  updateControl();

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  }

  // Spatial buckets make dot collisions linear in normal conditions, rather
  // than comparing every particle with every other particle each frame.
  function wander(dt, time) {
    const diameter = 5;
    const buckets = new Map();
    const cell = 8;
    for (const particle of particles) {
      particle.vx += Math.sin(time * 1.7 + particle.seed * .93) * dt * .025;
      particle.vy += Math.cos(time * 1.4 + particle.seed * .71) * dt * .025;
      particle.vx *= 1 - dt * .07;
      particle.vy *= 1 - dt * .07;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.x < .015 || particle.x > .985) {
        particle.x = Math.max(.015, Math.min(.985, particle.x));
        particle.vx *= -.9;
      }
      if (particle.y < .04 || particle.y > .94) {
        particle.y = Math.max(.04, Math.min(.94, particle.y));
        particle.vy *= -.9;
      }
      const bx = Math.floor(particle.x * width / cell);
      const by = Math.floor(particle.y * height / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const others = buckets.get((bx + ox) + ',' + (by + oy));
          if (!others) continue;
          for (const other of others) {
            const dx = (particle.x - other.x) * width;
            const dy = (particle.y - other.y) * height;
            const d2 = dx * dx + dy * dy;
            if (d2 >= diameter * diameter) continue;
            const distance = Math.sqrt(d2) || .001;
            const push = (diameter - distance) * .32;
            const px = dx / distance * push / width;
            const py = dy / distance * push / height;
            particle.x += px;
            particle.y += py;
            other.x -= px;
            other.y -= py;
            const vx = particle.vx;
            particle.vx = other.vx * .84;
            other.vx = vx * .84;
          }
        }
      }
      const key = bx + ',' + by;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(particle);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const seconds = reducedMotion.matches ? WANDER_SECONDS + FORM_SECONDS : elapsed;
    const t = Math.min(1, Math.max(0, (seconds - WANDER_SECONDS) / FORM_SECONDS));
    const order = 1 - (1 - t) ** 3;
    const flagWidth = width * .94;
    const flagHeight = Math.min(height * .68, flagWidth * .526);
    const x0 = width * .02;
    const y0 = height * .13;
    const positions = new Array(particles.length);
    const phase = Math.max(0, seconds - WANDER_SECONDS);

    particles.forEach((p, i) => {
      const wave = Math.sin(p.u * 7 + phase * .58) *
        height * .021 * Math.sin(p.u * Math.PI * .75);
      const tx = x0 + p.u * flagWidth;
      const ty = y0 + p.v * flagHeight + wave;
      positions[i] = [
        p.x * width * (1 - order) + tx * order,
        p.y * height * (1 - order) + ty * order
      ];
    });

    // The fabric's quiet connections form only after the collision phase.
    if (order > .48) {
      ctx.lineWidth = .45;
      for (let i = 0; i < ROWS * COLS; i++) {
        // The sparse checkerboard makes index adjacency unreliable; instead
        // connect only naturally adjacent fabric particles.
        if (i >= particles.length - 1) break;
        const p = particles[i], q = particles[i + 1];
        if (!q || p.kind !== 'fabric' || q.kind !== 'fabric') break;
        if (Math.abs(p.u - q.u) > .027 || Math.abs(p.v - q.v) > .04) continue;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = .12 * order;
        ctx.beginPath();
        ctx.moveTo(...positions[i]);
        ctx.lineTo(...positions[i + 1]);
        ctx.stroke();
      }
    }
    particles.forEach((p, i) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.kind === 'star' ? .99 : p.color === '#0a3161' ? .85 :
        p.color === '#b31942' ? .82 : .31;
      ctx.beginPath();
      ctx.arc(positions[i][0], positions[i][1],
        p.kind === 'star' ? Math.max(.66, Math.min(1.28, width * .0015)) :
        p.color === '#a4b7ce' ? 1.15 : 1.9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    handle = 0;
    if (reducedMotion.matches || paused || !visible || document.hidden) {
      lastFrame = 0;
      draw();
      return;
    }
    if (previousPaint && now - previousPaint < frameInterval) {
      handle = requestAnimationFrame(tick);
      return;
    }
    previousPaint = now;
    const realDt = lastFrame ? (now - lastFrame) / 1000 : 0;
    const dt = Math.min(.04, realDt);
    lastFrame = now;
    elapsed += Math.min(.12, realDt);
    if (elapsed < WANDER_SECONDS) wander(dt, elapsed);
    draw();
    handle = requestAnimationFrame(tick);
  }

  function synchronize() {
    if (handle) cancelAnimationFrame(handle);
    handle = 0;
    lastFrame = 0;
    previousPaint = 0;
    draw();
    if (!reducedMotion.matches && !paused && visible && !document.hidden)
      handle = requestAnimationFrame(tick);
  }

  reducedMotion.addEventListener('change', synchronize);
  document.addEventListener('visibilitychange', synchronize);
  if ('IntersectionObserver' in window)
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      synchronize();
    }).observe(canvas);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  synchronize();
})();
