import { useEffect, useRef } from 'react';
import { PieceType, RotationState } from '../engine';
import { getBlocks } from '../engine/Piece';
import { drawBlock } from '../renderer/BlockRenderer';
import { PIECE_COLORS, BOARD_COLORS } from '../renderer/colors';

const CELL_SIZE = 24;
const MAX_PIECES = 15;
const SPAWN_INTERVAL_MIN = 1500; // ms
const SPAWN_INTERVAL_MAX = 2500;
const SPEED_MIN = 20; // px/sec
const SPEED_MAX = 50;
const ALPHA = 0.18;

const PIECE_TYPES = Object.values(PieceType);
const ROTATIONS = [RotationState.SPAWN, RotationState.RIGHT, RotationState.FLIP, RotationState.LEFT];

interface FallingPiece {
  type: PieceType;
  rotation: RotationState;
  x: number;
  y: number;
  speed: number;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function MenuBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const pieces: FallingPiece[] = [];
    let nextSpawnTime = randomRange(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
    let spawnTimer = nextSpawnTime * 0.5; // spawn first piece sooner
    let lastTime = 0;
    let rafId = 0;

    function spawnPiece() {
      if (pieces.length >= MAX_PIECES) return;
      const type = randomItem(PIECE_TYPES);
      const rotation = randomItem(ROTATIONS);
      const blocks = getBlocks(type, rotation);
      const maxX = Math.max(...blocks.map((b) => b.x));
      const pieceWidth = (maxX + 1) * CELL_SIZE;
      pieces.push({
        type,
        rotation,
        x: Math.random() * (width - pieceWidth),
        y: -4 * CELL_SIZE,
        speed: randomRange(SPEED_MIN, SPEED_MAX),
      });
    }

    function tick(time: number) {
      if (lastTime === 0) lastTime = time;
      const dt = Math.min(time - lastTime, 250) / 1000; // seconds
      lastTime = time;

      // Spawn logic
      spawnTimer += dt * 1000;
      if (spawnTimer >= nextSpawnTime) {
        spawnPiece();
        spawnTimer = 0;
        nextSpawnTime = randomRange(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
      }

      // Clear
      ctx.fillStyle = BOARD_COLORS.background;
      ctx.fillRect(0, 0, width, height);

      // Update & draw
      ctx.globalAlpha = ALPHA;
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]!;
        p.y += p.speed * dt;

        // Remove if fully below viewport
        if (p.y > height) {
          pieces.splice(i, 1);
          continue;
        }

        const blocks = getBlocks(p.type, p.rotation);
        const color = PIECE_COLORS[p.type];
        for (const block of blocks) {
          drawBlock(ctx, p.x + block.x * CELL_SIZE, p.y + block.y * CELL_SIZE, CELL_SIZE, color);
        }
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;

      // Cull pieces fully off-screen after resize
      for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i]!.y > height) {
          pieces.splice(i, 1);
        }
      }
    }

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
