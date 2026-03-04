import { EventBus, GameEventType } from '../engine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  life: number;     // remaining ms
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  constructor(eventBus: EventBus) {
    eventBus.on(GameEventType.HARD_DROP_IMPACT, (payload) => {
      this.spawnImpactParticles(payload.column, payload.row, payload.distance);
    });
    eventBus.on(GameEventType.LINE_CLEAR, (payload) => {
      this.spawnLineClearParticles(payload.rows);
    });
  }

  private spawnImpactParticles(col: number, row: number, distance: number): void {
    const count = Math.min(distance * 3, 20);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: col, y: row,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        alpha: 1, size: 2 + Math.random() * 2,
        color: '#FFFFFF',
        life: 300 + Math.random() * 200,
        maxLife: 500,
      });
    }
  }

  private spawnLineClearParticles(rows: number[]): void {
    for (const row of rows) {
      for (let i = 0; i < 15; i++) {
        this.particles.push({
          x: Math.random() * 10, y: row,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 4,
          alpha: 1, size: 1.5 + Math.random() * 2,
          color: '#FFFFFF',
          life: 400 + Math.random() * 200,
          maxLife: 600,
        });
      }
    }
  }

  update(deltaMs: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      const dt = deltaMs / 1000;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 10 * dt; // gravity
      p.life -= deltaMs;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cellSize: number): void {
    // Visible offset: row 20 maps to screen y=0
    const visibleOffset = 20;
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      const px = p.x * cellSize;
      const py = (p.y - visibleOffset) * cellSize;
      ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  hasParticles(): boolean {
    return this.particles.length > 0;
  }
}
