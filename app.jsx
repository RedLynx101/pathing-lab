import React, { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════
//  SCENARIO DATA
// ══════════════════════════════════════════════════════════════

const SCENARIOS = [
  {
    name: "CORRIDOR SQUEEZE", desc: "Narrow passage navigation",
    obstacles: [{ x: 0.5, y: 0.2, r: 0.12 }, { x: 0.5, y: 0.8, r: 0.12 }, { x: 0.2, y: 0.5, r: 0.08 }, { x: 0.8, y: 0.5, r: 0.08 }],
    agents: [{ sx: 0.08, sy: 0.08 }, { sx: 0.08, sy: 0.92 }, { sx: 0.92, sy: 0.08 }],
    goal: { x: 0.92, y: 0.92 },
  },
  {
    name: "GAUNTLET RUN", desc: "Dense obstacle avoidance",
    obstacles: [{ x: 0.25, y: 0.3, r: 0.07 }, { x: 0.4, y: 0.55, r: 0.09 }, { x: 0.55, y: 0.25, r: 0.06 }, { x: 0.7, y: 0.5, r: 0.08 }, { x: 0.35, y: 0.78, r: 0.07 }, { x: 0.6, y: 0.75, r: 0.08 }, { x: 0.15, y: 0.55, r: 0.05 }, { x: 0.85, y: 0.3, r: 0.06 }],
    agents: [{ sx: 0.05, sy: 0.5 }, { sx: 0.05, sy: 0.3 }, { sx: 0.05, sy: 0.7 }, { sx: 0.05, sy: 0.9 }],
    goal: { x: 0.95, y: 0.5 },
  },
  {
    name: "SPIRAL TRAP", desc: "Local minima escape",
    obstacles: [{ x: 0.5, y: 0.35, r: 0.18 }, { x: 0.3, y: 0.65, r: 0.1 }, { x: 0.7, y: 0.65, r: 0.1 }, { x: 0.5, y: 0.85, r: 0.06 }],
    agents: [{ sx: 0.1, sy: 0.1 }, { sx: 0.9, sy: 0.1 }, { sx: 0.5, sy: 0.05 }],
    goal: { x: 0.5, y: 0.7 },
  },
  {
    name: "CONVERGENCE", desc: "Multi-agent convergence",
    obstacles: [{ x: 0.5, y: 0.5, r: 0.15 }, { x: 0.25, y: 0.25, r: 0.08 }, { x: 0.75, y: 0.25, r: 0.08 }, { x: 0.25, y: 0.75, r: 0.08 }, { x: 0.75, y: 0.75, r: 0.08 }],
    agents: [{ sx: 0.05, sy: 0.05 }, { sx: 0.95, sy: 0.05 }, { sx: 0.05, sy: 0.95 }, { sx: 0.95, sy: 0.95 }, { sx: 0.5, sy: 0.05 }, { sx: 0.05, sy: 0.5 }],
    goal: { x: 0.5, y: 0.95 },
  },
  {
    name: "MAZE CHANNEL", desc: "Wall-based routing",
    obstacles: [{ x: 0.3, y: 0.0, r: 0.06 }, { x: 0.3, y: 0.15, r: 0.06 }, { x: 0.3, y: 0.3, r: 0.06 }, { x: 0.3, y: 0.45, r: 0.06 }, { x: 0.65, y: 0.55, r: 0.06 }, { x: 0.65, y: 0.7, r: 0.06 }, { x: 0.65, y: 0.85, r: 0.06 }, { x: 0.65, y: 1.0, r: 0.06 }],
    agents: [{ sx: 0.08, sy: 0.15 }, { sx: 0.08, sy: 0.5 }, { sx: 0.08, sy: 0.85 }],
    goal: { x: 0.92, y: 0.5 },
  },
  {
    name: "SCATTER FIELD", desc: "Micro-obstacle diffusion",
    obstacles: [{ x: 0.2, y: 0.2, r: 0.04 }, { x: 0.35, y: 0.15, r: 0.04 }, { x: 0.5, y: 0.25, r: 0.04 }, { x: 0.65, y: 0.18, r: 0.04 }, { x: 0.8, y: 0.22, r: 0.04 }, { x: 0.15, y: 0.4, r: 0.04 }, { x: 0.3, y: 0.45, r: 0.05 }, { x: 0.5, y: 0.5, r: 0.06 }, { x: 0.7, y: 0.42, r: 0.04 }, { x: 0.85, y: 0.48, r: 0.04 }, { x: 0.25, y: 0.7, r: 0.04 }, { x: 0.45, y: 0.72, r: 0.05 }, { x: 0.6, y: 0.68, r: 0.04 }, { x: 0.78, y: 0.75, r: 0.04 }],
    agents: [{ sx: 0.05, sy: 0.05 }, { sx: 0.5, sy: 0.05 }, { sx: 0.95, sy: 0.05 }, { sx: 0.05, sy: 0.95 }, { sx: 0.95, sy: 0.95 }],
    goal: { x: 0.5, y: 0.95 },
  },
];

const mkGrid = (fn) => { const g = Array.from({ length: 40 }, () => Array(40).fill(0)); fn(g); return g; };

const WAVE_SCENARIOS = [
  {
    name: "SIMPLE MAZE", desc: "BFS wavefront expansion",
    grid: mkGrid(g => {
      for (let i = 5; i < 30; i++) g[i][12] = 1;
      for (let i = 10; i < 35; i++) g[i][24] = 1;
      for (let i = 12; i < 25; i++) g[20][i] = 1;
    }),
    start: { r: 3, c: 3 }, goal: { r: 36, c: 36 },
  },
  {
    name: "ISLAND HOP", desc: "Navigating around clusters",
    grid: mkGrid(g => {
      const blocks = [[6,6,6,6],[6,18,5,5],[18,6,5,8],[18,22,6,6],[28,10,5,5],[10,30,4,4],[28,28,6,6],[14,14,3,3]];
      for (const [r,c,h,w] of blocks) for (let dr=0;dr<h;dr++) for (let dc=0;dc<w;dc++) if(r+dr<40&&c+dc<40) g[r+dr][c+dc]=1;
    }),
    start: { r: 2, c: 2 }, goal: { r: 37, c: 37 },
  },
  {
    name: "TIGHT CORRIDOR", desc: "Single-cell width passages",
    grid: mkGrid(g => {
      for (let c=0;c<32;c++) g[10][c]=1; g[10][16]=0;
      for (let c=8;c<40;c++) g[20][c]=1; g[20][24]=0;
      for (let c=0;c<32;c++) g[30][c]=1; g[30][8]=0;
    }),
    start: { r: 5, c: 5 }, goal: { r: 35, c: 35 },
  },
  {
    name: "SPIRAL MAZE", desc: "Concentric barrier layers",
    grid: mkGrid(g => {
      for (let i=5;i<35;i++){g[5][i]=1;g[i][5]=1;g[34][i]=1;g[i][34]=1;}
      g[5][30]=0;g[5][31]=0;
      for (let i=11;i<29;i++){g[11][i]=1;g[i][11]=1;g[28][i]=1;g[i][28]=1;}
      g[28][14]=0;g[28][15]=0;
      for (let i=17;i<23;i++){g[17][i]=1;g[i][17]=1;g[22][i]=1;g[i][22]=1;}
      g[17][20]=0;
    }),
    start: { r: 2, c: 2 }, goal: { r: 20, c: 20 },
  },
];

const RRT_SCENARIOS = [
  {
    name: "OPEN FIELD", desc: "Baseline tree expansion",
    obstacles: [{ x: 0.5, y: 0.5, r: 0.12 }],
    start: { x: 0.08, y: 0.08 }, goal: { x: 0.92, y: 0.92 },
  },
  {
    name: "NARROW PASSAGE", desc: "Probabilistic gap threading",
    obstacles: [
      { x: 0.5, y: 0.15, r: 0.13 }, { x: 0.5, y: 0.85, r: 0.13 },
      { x: 0.5, y: 0.38, r: 0.06 }, { x: 0.5, y: 0.62, r: 0.06 },
    ],
    start: { x: 0.08, y: 0.5 }, goal: { x: 0.92, y: 0.5 },
  },
  {
    name: "DENSE SCATTER", desc: "Many small obstacles",
    obstacles: [
      { x: 0.2, y: 0.2, r: 0.06 }, { x: 0.4, y: 0.15, r: 0.05 },
      { x: 0.6, y: 0.25, r: 0.06 }, { x: 0.8, y: 0.18, r: 0.05 },
      { x: 0.15, y: 0.45, r: 0.05 }, { x: 0.35, y: 0.5, r: 0.07 },
      { x: 0.55, y: 0.45, r: 0.05 }, { x: 0.75, y: 0.55, r: 0.06 },
      { x: 0.25, y: 0.75, r: 0.06 }, { x: 0.5, y: 0.7, r: 0.05 },
      { x: 0.7, y: 0.8, r: 0.06 }, { x: 0.9, y: 0.65, r: 0.04 },
    ],
    start: { x: 0.05, y: 0.05 }, goal: { x: 0.95, y: 0.95 },
  },
  {
    name: "WALL GAP", desc: "Finding the opening",
    obstacles: [
      { x: 0.45, y: 0.0, r: 0.06 }, { x: 0.45, y: 0.12, r: 0.06 },
      { x: 0.45, y: 0.24, r: 0.06 }, { x: 0.45, y: 0.36, r: 0.06 },
      { x: 0.45, y: 0.64, r: 0.06 }, { x: 0.45, y: 0.76, r: 0.06 },
      { x: 0.45, y: 0.88, r: 0.06 }, { x: 0.45, y: 1.0, r: 0.06 },
    ],
    start: { x: 0.1, y: 0.5 }, goal: { x: 0.9, y: 0.5 },
  },
  {
    name: "CORRIDOR MAZE", desc: "Double wall navigation",
    obstacles: [
      { x: 0.3, y: 0.0, r: 0.055 }, { x: 0.3, y: 0.12, r: 0.055 },
      { x: 0.3, y: 0.24, r: 0.055 }, { x: 0.3, y: 0.36, r: 0.055 },
      { x: 0.3, y: 0.48, r: 0.055 },
      { x: 0.65, y: 0.52, r: 0.055 }, { x: 0.65, y: 0.64, r: 0.055 },
      { x: 0.65, y: 0.76, r: 0.055 }, { x: 0.65, y: 0.88, r: 0.055 },
      { x: 0.65, y: 1.0, r: 0.055 },
    ],
    start: { x: 0.08, y: 0.5 }, goal: { x: 0.92, y: 0.5 },
  },
  {
    name: "ENCLOSURE", desc: "Escape and reach goal",
    obstacles: [
      { x: 0.22, y: 0.22, r: 0.07 }, { x: 0.22, y: 0.36, r: 0.07 },
      { x: 0.36, y: 0.22, r: 0.07 }, { x: 0.36, y: 0.36, r: 0.07 },
      { x: 0.29, y: 0.15, r: 0.05 }, { x: 0.15, y: 0.29, r: 0.05 },
    ],
    start: { x: 0.29, y: 0.29 }, goal: { x: 0.9, y: 0.9 },
  },
];

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

const AGENT_COLORS = ["#00f0ff","#ff3366","#33ff99","#ffaa00","#aa66ff","#ff6644"];
const SPEED_LABELS = ["0.25x","0.5x","1x","2x","4x"];
const SPEED_VALUES = [0.25, 0.5, 1, 2, 4];

const PF_DEFAULT_PARAMS = {
  kAtt: 2.5, kRep: 0.0042, kRepPotential: 0.0032, repRange: 0.13,
  backwardScaleMin: 0.05, backwardScaleNearPower: 3.0,
  minForwardBase: 0.12, minForwardGain: 0.24, collisionZone: 0.018,
  tangentialGain: 3.5, forceCap: 0.8, damping: 0.7,
  stepScale: 0.012, forceStep: 0.012,
  baseNoise: 0.002, stuckNoiseGain: 0.012,
  stuckVelThreshold: 0.003, progressEps: 0.0005, stuckWarmupSteps: 50,
};

// ══════════════════════════════════════════════════════════════
//  POTENTIAL FIELD MATH
// ══════════════════════════════════════════════════════════════

function computePotential(x, y, goal, obstacles, params) {
  const dx = goal.x - x, dy = goal.y - y;
  let U = dx * dx + dy * dy;
  const kRep = params.kRepPotential, rho0 = params.repRange;
  for (const obs of obstacles) {
    const odx = x - obs.x, ody = y - obs.y;
    const rho = Math.max(Math.sqrt(odx*odx + ody*ody) - obs.r, 0.001);
    if (rho < rho0) U += 0.5 * kRep * (1/rho - 1/rho0) ** 2;
  }
  return U;
}

function computeForce(x, y, goal, obstacles, stuckFactor, params) {
  const kAtt = params.kAtt;
  let fx = kAtt * (goal.x - x), fy = kAtt * (goal.y - y);
  const kRep = params.kRep, rho0 = params.repRange;
  const gMag = Math.hypot(goal.x - x, goal.y - y);
  const gUx = gMag > 0.0001 ? (goal.x - x) / gMag : 0;
  const gUy = gMag > 0.0001 ? (goal.y - y) / gMag : 0;
  let minRho = Infinity;
  for (const obs of obstacles) {
    const odx = x - obs.x, ody = y - obs.y;
    const distC = Math.max(Math.sqrt(odx*odx + ody*ody), 0.0001);
    const rho = Math.max(distC - obs.r, 0.002);
    if (rho < minRho) minRho = rho;
    if (rho < rho0) {
      const mag = kRep * (1/rho - 1/rho0) / (rho*rho);
      let rx = mag * (odx / distC), ry = mag * (ody / distC);
      const alongGoal = rx * gUx + ry * gUy;
      if (alongGoal < 0 && gMag > 0.0001) {
        const nearFactor = Math.max(0, Math.min(1, (rho0 - rho) / rho0));
        const backwardScale = params.backwardScaleMin +
          (1 - params.backwardScaleMin) * Math.pow(nearFactor, params.backwardScaleNearPower);
        const lateralX = rx - alongGoal * gUx, lateralY = ry - alongGoal * gUy;
        rx = lateralX + (alongGoal * backwardScale) * gUx;
        ry = lateralY + (alongGoal * backwardScale) * gUy;
      }
      fx += rx; fy += ry;
    }
  }
  if (gMag > 0.0001 && Number.isFinite(minRho) && minRho < rho0) {
    const proximity = Math.max(0, Math.min(1, (rho0 - minRho) / rho0));
    const currentForward = fx * gUx + fy * gUy;
    const minForward = params.minForwardBase + params.minForwardGain * proximity;
    if (currentForward < minForward && minRho > params.collisionZone) {
      fx += gUx * (minForward - currentForward);
      fy += gUy * (minForward - currentForward);
    }
  }
  if (stuckFactor && stuckFactor > 0) {
    const gDx = goal.x - x, gDy = goal.y - y;
    if (gMag > 0.001) {
      const tangStr = stuckFactor * params.tangentialGain;
      fx += (-gDy / gMag) * tangStr;
      fy += (gDx / gMag) * tangStr;
    }
  }
  const fMag = Math.sqrt(fx*fx + fy*fy);
  if (fMag > params.forceCap) { fx = fx/fMag*params.forceCap; fy = fy/fMag*params.forceCap; }
  return { fx, fy };
}

// ══════════════════════════════════════════════════════════════
//  POTENTIAL FIELD CANVAS
// ══════════════════════════════════════════════════════════════

function PFCanvas({ scenario, size, running, speed, onStats, params }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const fieldRef = useRef(null);

  const init = useCallback(() => {
    stateRef.current = {
      agents: scenario.agents.map((a, i) => ({
        x: a.sx, y: a.sy, trail: [{ x: a.sx, y: a.sy }],
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        reached: false, vx: 0, vy: 0, steps: 0, finishedTrail: null,
        stuckCount: 0, prevDist: Infinity,
      })),
      time: 0,
    };
    fieldRef.current = null;
  }, [scenario]);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = size, h = size;
    canvas.width = w; canvas.height = h;

    const buildField = () => {
      const fc = document.createElement("canvas");
      fc.width = w; fc.height = h;
      const fCtx = fc.getContext("2d");
      const res = 3, nCols = Math.ceil(w/res), nRows = Math.ceil(h/res);
      const imgData = fCtx.createImageData(w, h);
      let minU = Infinity, maxU = -Infinity;
      const pots = new Float32Array(nCols * nRows);
      for (let gy=0; gy<nRows; gy++) for (let gx=0; gx<nCols; gx++) {
        const u = computePotential(gx/nCols, gy/nRows, scenario.goal, scenario.obstacles, params);
        pots[gy*nCols+gx] = u;
        if (u < minU) minU = u; if (u > maxU) maxU = u;
      }
      for (let gy=0; gy<nRows; gy++) for (let gx=0; gx<nCols; gx++) {
        const t = Math.pow(Math.min((pots[gy*nCols+gx]-minU)/(maxU-minU+0.001),1), 0.4);
        const r = Math.floor(8 + t*25), g = Math.floor(14 + (1-t)*40 + t*8), b = Math.floor(22 + (1-t)*55 + t*15);
        const px = gx*res, py = gy*res;
        for (let dy=0; dy<res && py+dy<h; dy++) for (let dx=0; dx<res && px+dx<w; dx++) {
          const idx = ((py+dy)*w+(px+dx))*4;
          imgData.data[idx]=r; imgData.data[idx+1]=g; imgData.data[idx+2]=b; imgData.data[idx+3]=255;
        }
      }
      fCtx.putImageData(imgData, 0, 0);
      const sp = 28; fCtx.lineWidth = 1;
      for (let px=sp/2; px<w; px+=sp) for (let py=sp/2; py<h; py+=sp) {
        const { fx, fy } = computeForce(px/w, py/h, scenario.goal, scenario.obstacles, 0, params);
        const mag = Math.sqrt(fx*fx+fy*fy); if (mag < 0.01) continue;
        const len = Math.min(mag*14, sp*0.45), dX=fx/mag, dY=fy/mag;
        const alpha = Math.min(0.15+mag*0.25, 0.45);
        fCtx.strokeStyle = "rgba(100,180,220,"+alpha+")"; fCtx.beginPath();
        fCtx.moveTo(px-dX*len*0.5, py-dY*len*0.5);
        const ex=px+dX*len*0.5, ey=py+dY*len*0.5;
        fCtx.lineTo(ex, ey); fCtx.stroke();
        fCtx.fillStyle = "rgba(100,180,220,"+alpha+")"; fCtx.beginPath();
        fCtx.moveTo(ex, ey);
        fCtx.lineTo(ex-dX*2.5+dY*1.5, ey-dY*2.5-dX*1.5);
        fCtx.lineTo(ex-dX*2.5-dY*1.5, ey-dY*2.5+dX*1.5); fCtx.fill();
      }
      return fc;
    };

    const draw = () => {
      if (!fieldRef.current) fieldRef.current = buildField();
      ctx.drawImage(fieldRef.current, 0, 0);
      for (const obs of scenario.obstacles) {
        const ox=obs.x*w, oy=obs.y*h, or2=obs.r*w;
        const grad = ctx.createRadialGradient(ox,oy,or2*0.2,ox,oy,or2);
        grad.addColorStop(0,"rgba(255,60,60,0.7)"); grad.addColorStop(0.6,"rgba(180,30,30,0.5)"); grad.addColorStop(1,"rgba(100,15,15,0.1)");
        ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(ox,oy,or2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(255,80,80,0.6)"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(ox,oy,or2,0,Math.PI*2); ctx.stroke();
      }
      const gx=scenario.goal.x*w, gy=scenario.goal.y*h, pulse=8+Math.sin(Date.now()*0.004)*3;
      const gGrad = ctx.createRadialGradient(gx,gy,2,gx,gy,pulse);
      gGrad.addColorStop(0,"rgba(50,255,150,0.9)"); gGrad.addColorStop(0.5,"rgba(50,255,150,0.3)"); gGrad.addColorStop(1,"rgba(50,255,150,0)");
      ctx.fillStyle=gGrad; ctx.beginPath(); ctx.arc(gx,gy,pulse,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#32ff96"; ctx.beginPath(); ctx.arc(gx,gy,4,0,Math.PI*2); ctx.fill();

      const state = stateRef.current;
      if (!state) { animRef.current = requestAnimationFrame(draw); return; }

      if (running) {
        const substeps = Math.max(1, Math.round(speed));
        for (let s=0; s<substeps; s++) {
          state.time += 0.012;
          for (const agent of state.agents) {
            if (agent.reached) continue;
            const curDist = Math.hypot(agent.x-scenario.goal.x, agent.y-scenario.goal.y);
            const vel = Math.hypot(agent.vx, agent.vy);
            if (vel < params.stuckVelThreshold && agent.steps > params.stuckWarmupSteps) {
              agent.stuckCount = Math.min(agent.stuckCount + 1, 300);
            } else if (curDist < agent.prevDist - params.progressEps) {
              agent.stuckCount = Math.max(0, agent.stuckCount - 3);
            }
            agent.prevDist = curDist;
            const stuckFactor = Math.min(agent.stuckCount / 80, 1.0);
            const { fx, fy } = computeForce(agent.x, agent.y, scenario.goal, scenario.obstacles, stuckFactor, params);
            agent.vx = agent.vx * params.damping + fx * params.forceStep;
            agent.vy = agent.vy * params.damping + fy * params.forceStep;
            const noise = params.baseNoise + stuckFactor * params.stuckNoiseGain;
            agent.vx += (Math.random()-0.5)*noise;
            agent.vy += (Math.random()-0.5)*noise;
            agent.x = Math.max(0, Math.min(1, agent.x + agent.vx * params.stepScale));
            agent.y = Math.max(0, Math.min(1, agent.y + agent.vy * params.stepScale));
            agent.steps++;
            agent.trail.push({ x: agent.x, y: agent.y });
            if (agent.trail.length > 3000) agent.trail.shift();
            if (curDist < 0.025) { agent.reached = true; agent.finishedTrail = [...agent.trail]; }
          }
        }
      }

      for (const agent of state.agents) {
        const trail = agent.finishedTrail || agent.trail;
        if (trail.length < 2) continue;
        if (agent.finishedTrail) {
          ctx.strokeStyle = agent.color; ctx.lineWidth = 2.5;
          ctx.shadowColor = agent.color; ctx.shadowBlur = 5; ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.moveTo(trail[0].x*w, trail[0].y*h);
          for (let i=1; i<trail.length; i+=2) ctx.lineTo(trail[i].x*w, trail[i].y*h);
          ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        } else {
          ctx.lineWidth = 1.5;
          for (let i=1; i<trail.length; i++) {
            const alpha = (i/trail.length)*0.65;
            ctx.strokeStyle = agent.color + Math.floor(alpha*255).toString(16).padStart(2,"0");
            ctx.beginPath(); ctx.moveTo(trail[i-1].x*w, trail[i-1].y*h);
            ctx.lineTo(trail[i].x*w, trail[i].y*h); ctx.stroke();
          }
        }
      }

      for (const agent of state.agents) {
        const ax=agent.x*w, ay=agent.y*h;
        const glow = ctx.createRadialGradient(ax,ay,1,ax,ay,10);
        glow.addColorStop(0, agent.color); glow.addColorStop(1, agent.color+"00");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ax,ay,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = agent.reached ? "#32ff96" : agent.color;
        ctx.shadowColor = agent.color; ctx.shadowBlur = agent.reached ? 12 : 6;
        ctx.beginPath(); ctx.arc(ax,ay, agent.reached ? 5 : 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        if (agent.reached) {
          ctx.font = "bold 8px monospace"; ctx.fillStyle = agent.color;
          ctx.globalAlpha = 0.75; ctx.fillText(agent.steps+" steps", ax + 8, ay - 4); ctx.globalAlpha = 1;
        }
      }

      const reached = state.agents.filter(a => a.reached).length;
      if (onStats) onStats({ reached, total: state.agents.length, time: state.time, allDone: reached === state.agents.length });
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size, running, speed, scenario, onStats, params]);

  return <canvas ref={canvasRef} style={{ width: size, height: size, borderRadius: 6, border: "1px solid rgba(100,180,220,0.12)" }} />;
}

// ══════════════════════════════════════════════════════════════
//  WAVEFRONT CANVAS
// ══════════════════════════════════════════════════════════════

function WaveCanvas({ scenario, size, running, speed, onStats }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const rows = scenario.grid.length, cols = scenario.grid[0].length;

  const init = useCallback(() => {
    const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
    dist[scenario.goal.r][scenario.goal.c] = 0;
    stateRef.current = {
      dist, parent,
      queue: [{ r: scenario.goal.r, c: scenario.goal.c }],
      done: false, path: null, maxDist: 0,
      frontier: [{ r: scenario.goal.r, c: scenario.goal.c }],
      cellsVisited: 1, frameAcc: 0,
    };
  }, [scenario, rows, cols]);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = size, h = size;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    const cellW = w/cols, cellH = h/rows;

    const draw = () => {
      const st = stateRef.current;
      if (!st) { animRef.current = requestAnimationFrame(draw); return; }
      if (running && !st.done) {
        st.frameAcc += speed * 0.4;
        const steps = Math.floor(st.frameAcc);
        st.frameAcc -= steps;
        for (let s=0; s<steps; s++) {
          if (st.queue.length === 0) {
            st.done = true;
            let cr=scenario.start.r, cc=scenario.start.c;
            if (st.dist[cr][cc] >= 0) {
              const path = [{r:cr,c:cc}];
              while (cr!==scenario.goal.r || cc!==scenario.goal.c) {
                const p = st.parent[cr][cc]; if(!p) break;
                cr=p.r; cc=p.c; path.push({r:cr,c:cc});
              }
              st.path = path;
            }
            break;
          }
          const next = [];
          for (const {r,c} of st.queue) {
            for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
              const nr=r+dr, nc=c+dc;
              if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
              if (scenario.grid[nr][nc]===1||st.dist[nr][nc]>=0) continue;
              st.dist[nr][nc] = st.dist[r][c]+1;
              st.parent[nr][nc] = {r,c};
              if (st.dist[nr][nc] > st.maxDist) st.maxDist = st.dist[nr][nc];
              next.push({r:nr,c:nc});
              st.cellsVisited++;
            }
          }
          st.frontier = st.queue;
          st.queue = next;
        }
      }
      ctx.fillStyle = "#080e14"; ctx.fillRect(0,0,w,h);
      const maxD = Math.max(st.maxDist, 1);
      for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
        const x=c*cellW, y=r*cellH;
        if (scenario.grid[r][c]===1) { ctx.fillStyle = "rgba(255,60,60,0.45)"; ctx.fillRect(x+0.5, y+0.5, cellW-1, cellH-1); continue; }
        if (st.dist[r][c] >= 0) {
          const t = st.dist[r][c]/maxD;
          ctx.fillStyle = "rgb("+Math.floor(10+t*20)+","+Math.floor(50+(1-t)*80)+","+Math.floor(80+(1-t)*120)+")";
          ctx.fillRect(x+0.5, y+0.5, cellW-1, cellH-1);
        }
      }
      if (!st.done && st.frontier) {
        ctx.fillStyle = "rgba(0,240,255,0.45)";
        for (const {r,c} of st.frontier) ctx.fillRect(c*cellW, r*cellH, cellW, cellH);
      }
      if (st.path) {
        ctx.strokeStyle = "#32ff96"; ctx.lineWidth = 3;
        ctx.shadowColor = "#32ff96"; ctx.shadowBlur = 8; ctx.beginPath();
        ctx.moveTo(st.path[0].c*cellW+cellW/2, st.path[0].r*cellH+cellH/2);
        for (let i=1; i<st.path.length; i++) ctx.lineTo(st.path[i].c*cellW+cellW/2, st.path[i].r*cellH+cellH/2);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      const drawMarker = (row, col, color) => {
        const cx=col*cellW+cellW/2, cy=row*cellH+cellH/2;
        const p=6+Math.sin(Date.now()*0.005)*2;
        const g = ctx.createRadialGradient(cx,cy,2,cx,cy,p);
        g.addColorStop(0,color); g.addColorStop(1,color+"00");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,p,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=color; ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
      };
      drawMarker(scenario.start.r, scenario.start.c, "#00f0ff");
      drawMarker(scenario.goal.r, scenario.goal.c, "#32ff96");
      ctx.strokeStyle = "rgba(100,180,220,0.04)"; ctx.lineWidth = 0.5;
      for (let r=0;r<=rows;r++){ctx.beginPath();ctx.moveTo(0,r*cellH);ctx.lineTo(w,r*cellH);ctx.stroke();}
      for (let c=0;c<=cols;c++){ctx.beginPath();ctx.moveTo(c*cellW,0);ctx.lineTo(c*cellW,h);ctx.stroke();}
      if (onStats) onStats({ done: st.done, pathLen: st.path ? st.path.length : null, cellsVisited: st.cellsVisited });
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size, running, speed, scenario, rows, cols, onStats]);

  return <canvas ref={canvasRef} style={{ width: size, height: size, borderRadius: 6, border: "1px solid rgba(100,180,220,0.12)" }} />;
}

// ══════════════════════════════════════════════════════════════
//  RRT CANVAS
// ══════════════════════════════════════════════════════════════

function rrtCollisionFree(x1, y1, x2, y2, obstacles, margin) {
  const steps = Math.max(8, Math.ceil(Math.hypot(x2-x1, y2-y1) / 0.005));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + (x2-x1)*t, py = y1 + (y2-y1)*t;
    for (const obs of obstacles) {
      if (Math.hypot(px-obs.x, py-obs.y) < obs.r + margin) return false;
    }
  }
  return true;
}

function RRTCanvas({ scenario, size, running, speed, onStats }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);

  const stepSize = 0.04;
  const goalBias = 0.08;
  const goalRadius = 0.035;
  const margin = 0.008;
  const maxNodes = 4000;

  const init = useCallback(() => {
    stateRef.current = {
      nodes: [{ x: scenario.start.x, y: scenario.start.y, parent: -1 }],
      done: false,
      path: null,
      frameAcc: 0,
    };
  }, [scenario]);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = size, h = size;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      const st = stateRef.current;
      if (!st) { animRef.current = requestAnimationFrame(draw); return; }

      if (running && !st.done && st.nodes.length < maxNodes) {
        st.frameAcc += speed * 2.5;
        const steps = Math.max(1, Math.floor(st.frameAcc));
        st.frameAcc -= steps;

        for (let s = 0; s < steps; s++) {
          if (st.done || st.nodes.length >= maxNodes) break;

          // Sample random point (with goal bias)
          let sx, sy;
          if (Math.random() < goalBias) {
            sx = scenario.goal.x; sy = scenario.goal.y;
          } else {
            sx = Math.random(); sy = Math.random();
          }

          // Find nearest node
          let bestIdx = 0, bestDist = Infinity;
          for (let i = 0; i < st.nodes.length; i++) {
            const d = Math.hypot(st.nodes[i].x - sx, st.nodes[i].y - sy);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          }
          const nearest = st.nodes[bestIdx];

          // Steer toward sample
          const dist = Math.hypot(sx - nearest.x, sy - nearest.y);
          const step = Math.min(stepSize, dist);
          const nx = nearest.x + (sx - nearest.x) / dist * step;
          const ny = nearest.y + (sy - nearest.y) / dist * step;

          if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
          if (!rrtCollisionFree(nearest.x, nearest.y, nx, ny, scenario.obstacles, margin)) continue;

          const newIdx = st.nodes.length;
          st.nodes.push({ x: nx, y: ny, parent: bestIdx });

          // Check if goal reached
          if (Math.hypot(nx - scenario.goal.x, ny - scenario.goal.y) < goalRadius) {
            // Trace path
            const path = [];
            let ci = newIdx;
            while (ci !== -1) {
              path.unshift(st.nodes[ci]);
              ci = st.nodes[ci].parent;
            }
            st.path = path;
            st.done = true;
          }
        }
      }

      // Draw background
      ctx.fillStyle = "#080e14";
      ctx.fillRect(0, 0, w, h);

      // Draw obstacles
      for (const obs of scenario.obstacles) {
        const ox = obs.x*w, oy = obs.y*h, or2 = obs.r*w;
        const grad = ctx.createRadialGradient(ox, oy, or2*0.2, ox, oy, or2);
        grad.addColorStop(0, "rgba(255,60,60,0.7)");
        grad.addColorStop(0.6, "rgba(180,30,30,0.5)");
        grad.addColorStop(1, "rgba(100,15,15,0.1)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(ox, oy, or2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,80,0.6)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ox, oy, or2, 0, Math.PI*2); ctx.stroke();
      }

      // Draw tree edges
      ctx.lineWidth = 0.8;
      for (let i = 1; i < st.nodes.length; i++) {
        const node = st.nodes[i];
        const parent = st.nodes[node.parent];
        const alpha = Math.min(0.15 + (i / st.nodes.length) * 0.2, 0.35);
        ctx.strokeStyle = "rgba(0,180,200," + alpha + ")";
        ctx.beginPath();
        ctx.moveTo(parent.x * w, parent.y * h);
        ctx.lineTo(node.x * w, node.y * h);
        ctx.stroke();
      }

      // Draw path
      if (st.path) {
        ctx.strokeStyle = "#32ff96"; ctx.lineWidth = 3;
        ctx.shadowColor = "#32ff96"; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(st.path[0].x * w, st.path[0].y * h);
        for (let i = 1; i < st.path.length; i++) {
          ctx.lineTo(st.path[i].x * w, st.path[i].y * h);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw goal
      const gx = scenario.goal.x*w, gy = scenario.goal.y*h;
      const pulse = 8 + Math.sin(Date.now()*0.004)*3;
      const gGrad = ctx.createRadialGradient(gx, gy, 2, gx, gy, pulse);
      gGrad.addColorStop(0, "rgba(50,255,150,0.9)");
      gGrad.addColorStop(0.5, "rgba(50,255,150,0.3)");
      gGrad.addColorStop(1, "rgba(50,255,150,0)");
      ctx.fillStyle = gGrad; ctx.beginPath(); ctx.arc(gx, gy, pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#32ff96"; ctx.beginPath(); ctx.arc(gx, gy, 4, 0, Math.PI*2); ctx.fill();

      // Draw start
      const sx = scenario.start.x*w, sy = scenario.start.y*h;
      const sGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, 8);
      sGrad.addColorStop(0, "rgba(0,240,255,0.9)");
      sGrad.addColorStop(0.5, "rgba(0,240,255,0.3)");
      sGrad.addColorStop(1, "rgba(0,240,255,0)");
      ctx.fillStyle = sGrad; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#00f0ff"; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2); ctx.fill();

      if (onStats) onStats({
        done: st.done,
        nodes: st.nodes.length,
        pathLen: st.path ? st.path.length : null,
      });
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size, running, speed, scenario, onStats]);

  return <canvas ref={canvasRef} style={{ width: size, height: size, borderRadius: 6, border: "1px solid rgba(100,180,220,0.12)" }} />;
}

// ══════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════

export default function App() {
  const [tab, setTab] = useState("potential");
  const [running, setRunning] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [resetKey, setResetKey] = useState(0);
  const [pfStats, setPfStats] = useState({});
  const [wfStats, setWfStats] = useState({});
  const [rrtStats, setRrtStats] = useState({});
  const [showInfo, setShowInfo] = useState(false);
  const [showTuning, setShowTuning] = useState(false);
  const [pfParams, setPfParams] = useState(PF_DEFAULT_PARAMS);

  const speed = SPEED_VALUES[speedIdx];
  const size = 220;

  const handlePfStats = useCallback((idx) => (s) => setPfStats(p => ({...p,[idx]:s})), []);
  const handleWfStats = useCallback((idx) => (s) => setWfStats(p => ({...p,[idx]:s})), []);
  const handleRrtStats = useCallback((idx) => (s) => setRrtStats(p => ({...p,[idx]:s})), []);

  const doReset = () => {
    setRunning(false); setPfStats({}); setWfStats({}); setRrtStats({});
    setResetKey(k => k+1);
    setTimeout(() => setRunning(true), 60);
  };
  const resetPfParams = () => {
    setPfParams(PF_DEFAULT_PARAMS); setPfStats({});
    setResetKey(k => k+1);
  };
  const setParam = (key, value) => setPfParams(p => ({ ...p, [key]: value }));

  const switchTab = (t) => {
    setTab(t); setPfStats({}); setWfStats({}); setRrtStats({});
    setResetKey(k => k+1);
  };

  const btnBase = { fontFamily: "'JetBrains Mono',monospace", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" };

  const paramControls = [
    { key: "kAtt", label: "Attraction", min: 0.5, max: 5, step: 0.05 },
    { key: "kRep", label: "Repulsion", min: 0.0005, max: 0.012, step: 0.0001 },
    { key: "kRepPotential", label: "Repulsion Heatmap", min: 0.0005, max: 0.012, step: 0.0001 },
    { key: "repRange", label: "Repulsion Range", min: 0.05, max: 0.3, step: 0.005 },
    { key: "backwardScaleMin", label: "Backward Damp", min: 0, max: 0.4, step: 0.01 },
    { key: "minForwardBase", label: "Forward Bias Base", min: 0, max: 0.4, step: 0.01 },
    { key: "minForwardGain", label: "Forward Bias Near Obst.", min: 0, max: 0.5, step: 0.01 },
    { key: "tangentialGain", label: "Tangential Escape", min: 0, max: 6, step: 0.05 },
    { key: "forceCap", label: "Max Force", min: 0.2, max: 1.8, step: 0.02 },
    { key: "damping", label: "Velocity Damping", min: 0.4, max: 0.95, step: 0.01 },
    { key: "baseNoise", label: "Base Noise", min: 0, max: 0.02, step: 0.0005 },
    { key: "stuckNoiseGain", label: "Stuck Noise Boost", min: 0, max: 0.03, step: 0.0005 },
  ];

  const subtitles = {
    potential: "Artificial Potential Fields \u00b7 Multi-Agent Parallel Navigation \u00b7 Persistent Path Visualization",
    wavefront: "Wavefront / BFS Expansion \u00b7 Grid-Based Shortest Path \u00b7 Optimal Routing",
    rrt: "Rapidly-exploring Random Trees \u00b7 Sampling-Based Planning \u00b7 Probabilistic Completeness",
  };

  const tabDef = [
    { id: "potential", label: "POTENTIAL FIELDS", color: "#00f0ff" },
    { id: "wavefront", label: "WAVEFRONT / BFS", color: "#aa66ff" },
    { id: "rrt", label: "RRT", color: "#ffaa00" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #060a10 0%, #0a1018 40%, #0c1420 100%)",
      color: "#c8dce8",
      fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace",
      padding: "20px 16px", boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: running ? "#32ff96" : "#ff3366",
            boxShadow: running ? "0 0 12px #32ff96" : "0 0 12px #ff3366",
            transition: "all 0.3s",
          }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: "#e8f0f8" }}>
            PATH PLANNING LABORATORY
          </h1>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 10, letterSpacing: "0.15em", color: "#3a5a6e", textTransform: "uppercase" }}>
          {subtitles[tab]}
        </p>

        {/* TABS */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 12,
          padding: 4, background: "rgba(100,180,220,0.02)",
          borderRadius: 6, border: "1px solid rgba(100,180,220,0.06)", width: "fit-content",
        }}>
          {tabDef.map(td => (
            <button key={td.id} onClick={() => switchTab(td.id)}
              style={{
                ...btnBase, padding: "8px 20px", fontSize: 10, borderRadius: 4, letterSpacing: "0.1em",
                background: tab===td.id ? td.color+"1a" : "transparent",
                border: tab===td.id ? "1px solid "+td.color+"40" : "1px solid transparent",
                color: tab===td.id ? td.color : "#4a6a80",
                fontWeight: tab===td.id ? 600 : 400,
              }}>
              {td.label}
            </button>
          ))}
        </div>

        {/* CONTROLS */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14,
          padding: "10px 14px",
          background: "rgba(100,180,220,0.03)",
          border: "1px solid rgba(100,180,220,0.08)",
          borderRadius: 6,
        }}>
          <button onClick={() => setRunning(!running)}
            style={{
              ...btnBase, padding: "7px 16px", fontSize: 10, letterSpacing: "0.1em", borderRadius: 4,
              background: running ? "rgba(255,51,102,0.1)" : "rgba(50,255,150,0.1)",
              border: running ? "1px solid rgba(255,51,102,0.3)" : "1px solid rgba(50,255,150,0.3)",
              color: running ? "#ff3366" : "#32ff96", fontWeight: 600,
            }}>
            {running ? "\u23f8 PAUSE" : "\u25b6 RUN"}
          </button>
          <button onClick={doReset} style={{
            ...btnBase, padding: "7px 16px", fontSize: 10, letterSpacing: "0.1em", borderRadius: 4,
            background: "rgba(100,180,220,0.04)", border: "1px solid rgba(100,180,220,0.14)", color: "#5a7a8e",
          }}>
            {"\u21bb"} RESET
          </button>

          <div style={{ width: 1, height: 20, background: "rgba(100,180,220,0.1)", margin: "0 4px" }} />
          <span style={{ fontSize: 9, color: "#4a6a80", letterSpacing: "0.1em" }}>SPEED</span>
          {SPEED_LABELS.map((label, i) => (
            <button key={i} onClick={() => setSpeedIdx(i)} style={{
              ...btnBase, padding: "5px 10px", fontSize: 9, minWidth: 36, borderRadius: 4, letterSpacing: "0.08em",
              background: speedIdx===i ? "rgba(255,170,0,0.12)" : "rgba(255,170,0,0.02)",
              border: speedIdx===i ? "1px solid rgba(255,170,0,0.35)" : "1px solid rgba(100,180,220,0.08)",
              color: speedIdx===i ? "#ffaa00" : "#4a6a80",
              fontWeight: speedIdx===i ? 600 : 400,
            }}>
              {label}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <button onClick={() => setShowInfo(!showInfo)} style={{
            ...btnBase, padding: "7px 14px", fontSize: 10, letterSpacing: "0.1em", borderRadius: 4,
            background: showInfo ? "rgba(100,180,220,0.1)" : "rgba(100,180,220,0.04)",
            border: showInfo ? "1px solid rgba(100,180,220,0.3)" : "1px solid rgba(100,180,220,0.14)",
            color: showInfo ? "#8ab4cc" : "#4a6a80",
          }}>
            {showInfo ? "\u2715 HIDE INFO" : "\u2139 INFO"}
          </button>
        </div>

        {/* INFO */}
        {showInfo && (
          <div style={{
            marginBottom: 14, padding: "14px 18px",
            background: "rgba(100,180,220,0.04)",
            border: "1px solid rgba(100,180,220,0.1)",
            borderRadius: 6, fontSize: 11.5, lineHeight: 1.75, color: "#8aa8bc",
          }}>
            {tab === "potential" && (<>
              <strong style={{ color: "#c8dce8" }}>Artificial Potential Fields</strong>{" \u2014 "}Agents follow{" "}
              <em>F(q) = {"\u2212"}{"\u2207"}U(q)</em> where{" "}
              <span style={{ color: "#32ff96" }}>U<sub>att</sub></span> = quadratic pull toward goal and{" "}
              <span style={{ color: "#ff3366" }}>U<sub>rep</sub></span> = inverse-distance repulsion.
              Completed paths persist as solid color-coded trails with step counts. Noise injection helps escape local minima.
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 4, fontSize: 11, color: "#6a9ab0" }}>
                U(q) = {"\u00bd"}k<sub>att</sub>{"\u2016"}q {"\u2212"} q<sub>goal</sub>{"\u2016\u00b2"} + {"\u03a3 \u00bd"}k<sub>rep</sub>(1/{"\u03c1"} {"\u2212"} 1/{"\u03c1\u2080"}){"\u00b2"}
                {"  \u2502  "}F(q) = {"\u2212\u2207"}U(q){"  \u2502  "}{"\u03c1"} = surface distance
              </div>
            </>)}
            {tab === "wavefront" && (<>
              <strong style={{ color: "#c8dce8" }}>Wavefront / BFS</strong>{" \u2014 "}Breadth-first search expands from the{" "}
              <span style={{ color: "#32ff96" }}>goal</span> in concentric wavefronts.
              The <span style={{ color: "#00f0ff" }}>cyan frontier</span> shows the active expansion edge.
              Once the <span style={{ color: "#00f0ff" }}>start</span> is reached, the shortest path is traced back via parent pointers.
              Guarantees optimality on uniform-cost grids.
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 4, fontSize: 11, color: "#6a9ab0" }}>
                dist(n) = dist(curr) + 1{"  \u2502  "}4-connected{"  \u2502  "}O(V + E) complexity
              </div>
            </>)}
            {tab === "rrt" && (<>
              <strong style={{ color: "#c8dce8" }}>Rapidly-exploring Random Trees (RRT)</strong>{" \u2014 "}A sampling-based planner
              that incrementally builds a space-filling tree from the{" "}
              <span style={{ color: "#00f0ff" }}>start</span> toward the{" "}
              <span style={{ color: "#32ff96" }}>goal</span>.
              Each iteration samples a random point, finds the nearest tree node, and extends toward the sample
              if the path is collision-free. Goal bias steers exploration. Probabilistically complete.
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 4, fontSize: 11, color: "#6a9ab0" }}>
                q<sub>rand</sub> {"\u2192"} nearest(T, q<sub>rand</sub>) {"\u2192"} steer {"\u2192"} collision check {"\u2192"} extend
                {"  \u2502  "}step = 0.04{"  \u2502  "}goal bias = 8%
              </div>
            </>)}
          </div>
        )}

        {/* SCENARIO GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(" + (tab==="wavefront" ? 280 : 260) + "px, 1fr))",
          gap: 14,
        }}>
          {tab === "potential" && SCENARIOS.map((sc, idx) => (
            <div key={"pf-"+idx+"-"+resetKey} style={{
              background: "rgba(8,16,24,0.85)", border: "1px solid rgba(100,180,220,0.08)",
              borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#c8dce8" }}>{sc.name}</div>
                  <div style={{ fontSize: 9, color: "#3a5a6e", letterSpacing: "0.08em", marginTop: 2 }}>{sc.desc}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 9 }}>
                  {pfStats[idx] && <>
                    <span style={{ color: pfStats[idx].reached === pfStats[idx].total ? "#32ff96" : "#ffaa00", fontWeight: 600 }}>
                      {pfStats[idx].reached}
                    </span>
                    <span style={{ color: "#3a5a6e" }}>/{pfStats[idx].total}</span>
                    {pfStats[idx].allDone && <span style={{ color: "#32ff96", marginLeft: 4 }}>{"\u2713"}</span>}
                  </>}
                </div>
              </div>
              <PFCanvas scenario={sc} size={size} running={running} speed={speed} onStats={handlePfStats(idx)} params={pfParams} />
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {sc.agents.map((_, ai) => (
                  <div key={ai} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 8 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: AGENT_COLORS[ai % AGENT_COLORS.length],
                      boxShadow: pfStats[idx] && pfStats[idx].reached > ai ? "0 0 5px "+AGENT_COLORS[ai % AGENT_COLORS.length] : "none",
                      border: pfStats[idx] && pfStats[idx].reached > ai ? "1px solid #32ff96" : "1px solid transparent",
                    }} />
                    <span style={{ color: AGENT_COLORS[ai % AGENT_COLORS.length], opacity: 0.7 }}>A{ai+1}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {tab === "wavefront" && WAVE_SCENARIOS.map((sc, idx) => (
            <div key={"wf-"+idx+"-"+resetKey} style={{
              background: "rgba(8,16,24,0.85)", border: "1px solid rgba(100,180,220,0.08)",
              borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#c8dce8" }}>{sc.name}</div>
                  <div style={{ fontSize: 9, color: "#3a5a6e", letterSpacing: "0.08em", marginTop: 2 }}>{sc.desc}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 9 }}>
                  {wfStats[idx] && (<>
                    {wfStats[idx].done
                      ? <span style={{ color: "#32ff96" }}>{"\u2713"} {wfStats[idx].pathLen} steps</span>
                      : <span style={{ color: "#00f0ff" }}>{wfStats[idx].cellsVisited} visited</span>
                    }
                  </>)}
                </div>
              </div>
              <WaveCanvas scenario={sc} size={size} running={running} speed={speed} onStats={handleWfStats(idx)} />
            </div>
          ))}

          {tab === "rrt" && RRT_SCENARIOS.map((sc, idx) => (
            <div key={"rrt-"+idx+"-"+resetKey} style={{
              background: "rgba(8,16,24,0.85)", border: "1px solid rgba(100,180,220,0.08)",
              borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#c8dce8" }}>{sc.name}</div>
                  <div style={{ fontSize: 9, color: "#3a5a6e", letterSpacing: "0.08em", marginTop: 2 }}>{sc.desc}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 9 }}>
                  {rrtStats[idx] && (<>
                    {rrtStats[idx].done
                      ? <span style={{ color: "#32ff96" }}>{"\u2713"} {rrtStats[idx].pathLen} nodes</span>
                      : <span style={{ color: "#ffaa00" }}>{rrtStats[idx].nodes} sampled</span>
                    }
                  </>)}
                </div>
              </div>
              <RRTCanvas scenario={sc} size={size} running={running} speed={speed} onStats={handleRrtStats(idx)} />
            </div>
          ))}
        </div>

        {/* LEGEND */}
        <div style={{ marginTop: 18, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", fontSize: 9, color: "#3a5a6e" }}>
          {tab === "potential" && (<>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32ff96", boxShadow: "0 0 6px #32ff96" }} /> Goal
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff3366", boxShadow: "0 0 6px #ff3366" }} /> Obstacle
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 2.5, borderRadius: 2, background: "linear-gradient(90deg, #00f0ff22, #00f0ff)" }} /> Active trail
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 2.5, borderRadius: 2, background: "#00f0ff", boxShadow: "0 0 4px #00f0ff" }} /> Completed path
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, background: "rgba(100,180,220,0.2)", borderRadius: 1 }} /> Force vectors
            </span>
          </>)}
          {tab === "wavefront" && (<>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00f0ff", boxShadow: "0 0 6px #00f0ff" }} /> Start
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32ff96", boxShadow: "0 0 6px #32ff96" }} /> Goal
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, background: "rgba(255,60,60,0.45)", borderRadius: 1 }} /> Wall
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, background: "rgba(0,240,255,0.45)", borderRadius: 1 }} /> Frontier
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 2.5, borderRadius: 2, background: "#32ff96", boxShadow: "0 0 4px #32ff96" }} /> Optimal path
            </span>
          </>)}
          {tab === "rrt" && (<>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00f0ff", boxShadow: "0 0 6px #00f0ff" }} /> Start
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32ff96", boxShadow: "0 0 6px #32ff96" }} /> Goal
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff3366", boxShadow: "0 0 6px #ff3366" }} /> Obstacle
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 2.5, borderRadius: 2, background: "rgba(0,180,200,0.35)" }} /> Tree edge
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 2.5, borderRadius: 2, background: "#32ff96", boxShadow: "0 0 4px #32ff96" }} /> Solution path
            </span>
          </>)}
        </div>

        {/* TUNING PANEL (collapsible, bottom) */}
        {tab === "potential" && (
          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => setShowTuning(!showTuning)}
              style={{
                ...btnBase, width: "100%", padding: "10px 14px", fontSize: 10, letterSpacing: "0.12em",
                borderRadius: showTuning ? "6px 6px 0 0" : 6,
                background: "rgba(100,180,220,0.03)",
                border: "1px solid rgba(100,180,220,0.08)",
                borderBottom: showTuning ? "none" : "1px solid rgba(100,180,220,0.08)",
                color: "#8ab4cc", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{
                display: "inline-block", transition: "transform 0.2s",
                transform: showTuning ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: 12,
              }}>{"\u25b6"}</span>
              POTENTIAL FIELD TUNING
              <span style={{ flex: 1 }} />
              {showTuning && (
                <span
                  onClick={(e) => { e.stopPropagation(); resetPfParams(); }}
                  style={{
                    ...btnBase, padding: "4px 10px", fontSize: 9, letterSpacing: "0.08em", borderRadius: 4,
                    background: "rgba(100,180,220,0.06)", border: "1px solid rgba(100,180,220,0.14)", color: "#5a7a8e",
                  }}
                >
                  RESET TUNING
                </span>
              )}
            </button>
            {showTuning && (
              <div style={{
                padding: "12px 14px",
                background: "rgba(100,180,220,0.03)",
                border: "1px solid rgba(100,180,220,0.08)",
                borderTop: "none",
                borderRadius: "0 0 6px 6px",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  {paramControls.map((ctl) => (
                    <label
                      key={ctl.key}
                      style={{
                        display: "flex", flexDirection: "column", gap: 4,
                        background: "rgba(6,10,16,0.4)", border: "1px solid rgba(100,180,220,0.06)", borderRadius: 4, padding: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#6f93a8", letterSpacing: "0.06em" }}>
                        <span>{ctl.label}</span>
                        <span style={{ color: "#b4cddd" }}>{pfParams[ctl.key].toFixed(ctl.step < 0.001 ? 4 : ctl.step < 0.01 ? 3 : 2)}</span>
                      </div>
                      <input
                        type="range" min={ctl.min} max={ctl.max} step={ctl.step}
                        value={pfParams[ctl.key]}
                        onChange={(e) => setParam(ctl.key, parseFloat(e.target.value))}
                        style={{ width: "100%" }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CREDITS */}
        <div style={{
          marginTop: 32, paddingTop: 16,
          borderTop: "1px solid rgba(100,180,220,0.06)",
          display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
          fontSize: 10, letterSpacing: "0.12em", color: "#2a4a5e",
        }}>
          <span style={{ color: "#4a6a80" }}>Noah Hicks</span>
          <span style={{ color: "#1a3040" }}>&</span>
          <span style={{ color: "#4a6a80" }}>Claude</span>
        </div>
      </div>
    </div>
  );
}
