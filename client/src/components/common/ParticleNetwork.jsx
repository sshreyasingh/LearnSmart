import { useEffect, useRef } from 'react';

const PALETTES = [
  ['rgba(99, 102, 241, OPACITY)', 'rgba(168, 85, 247, OPACITY)', 'rgba(236, 72, 153, OPACITY)'],
  ['rgba(16, 185, 129, OPACITY)', 'rgba(20, 184, 166, OPACITY)', 'rgba(6, 182, 212, OPACITY)'],
  ['rgba(245, 158, 11, OPACITY)', 'rgba(239, 68, 68, OPACITY)', 'rgba(217, 70, 239, OPACITY)'],
  ['rgba(59, 130, 246, OPACITY)', 'rgba(139, 92, 246, OPACITY)', 'rgba(244, 114, 182, OPACITY)'],
];

const PALETTE_DURATION = 7000;

export default function ParticleNetwork() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(0);
  const currentPaletteRef = useRef(0);
  const transitionRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    let w, h;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const particleCount = Math.min(90, Math.floor((w * h) / 10000));
    const mouse = { x: null, y: null, radius: 160 };

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2.2 + 0.5;
        this.opacity = Math.random() * 0.7 + 0.3;
        this.colorIdx = Math.floor(Math.random() * 3);
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -30) this.x = w + 30;
        if (this.x > w + 30) this.x = -30;
        if (this.y < -30) this.y = h + 30;
        if (this.y > h + 30) this.y = -30;

        if (mouse.x != null && mouse.y != null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.vx += (dx / dist) * force * 0.04;
            this.vy += (dy / dist) * force * 0.04;
          }
        }
        this.vx *= 0.999;
        this.vy *= 0.999;
      }
      getColor(palette) {
        return palette[this.colorIdx].replace('OPACITY', this.opacity.toFixed(2));
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => { mouse.x = null; mouse.y = null; };
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const maxDist = 140;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      const totalCycle = PALETTE_DURATION * PALETTES.length;
      const cyclePosition = elapsed % totalCycle;
      const paletteIdx = Math.floor(cyclePosition / PALETTE_DURATION) % PALETTES.length;
      const nextPaletteIdx = (paletteIdx + 1) % PALETTES.length;
      const transitionProgress = (cyclePosition % PALETTE_DURATION) / PALETTE_DURATION;

      currentPaletteRef.current = paletteIdx;
      transitionRef.current = transitionProgress;

      const fromPalette = PALETTES[paletteIdx];
      const toPalette = PALETTES[nextPaletteIdx];

      const blended = fromPalette.map((c, i) => {
        const base = c.replace(', OPACITY)', '');
        const to = toPalette[i].replace(', OPACITY)', '');
        return { base, to };
      });

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update();

        const fromColor = blended[p.colorIdx].base;
        const toColor = blended[p.colorIdx].to;
        const r = fromColor.match(/[\d.]+/g).map(Number);
        const t = toColor.match(/[\d.]+/g).map(Number);
        const cr = Math.round(r[0] + (t[0] - r[0]) * transitionProgress);
        const cg = Math.round(r[1] + (t[1] - r[1]) * transitionProgress);
        const cb = Math.round(r[2] + (t[2] - r[2]) * transitionProgress);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.opacity})`;
        ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, 0.4)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineOpacity = (1 - dist / maxDist) * 0.2;
            const midR = Math.round((cr + t[0]) / 2);
            const midG = Math.round((cg + t[1]) / 2);
            const midB = Math.round((cb + t[2]) / 2);

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            const gradient = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
            gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${lineOpacity})`);
            gradient.addColorStop(1, `rgba(${midR}, ${midG}, ${midB}, ${lineOpacity * 0.5})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
