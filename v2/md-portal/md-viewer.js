// md-viewer.js — Canvas renderer for crystal slab visualization

var MD = window.MD || {};
window.MD = MD;

MD.viewer = {
  canvas: null,
  ctx: null,
  slab: null,
  viewAngleX: -25,  // degrees rotation around X
  viewAngleY: 30,   // degrees rotation around Y
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isDragging: false,
  lastMouse: { x: 0, y: 0 },
  hoveredAtom: -1,
  colorMode: 'species', // 'species', 'coordination', 'energy', 'layer'

  // Colors
  colors: {
    Si: '#6b8fa3',     // steel blue
    Ge: '#c9913f',     // amber gold
    SiSurface: '#89b3c9',
    GeSurface: '#e0b35a',
    bond: 'rgba(120, 115, 105, 0.25)',
    bondSurface: 'rgba(180, 100, 60, 0.3)',
    grid: 'rgba(0,0,0,0.04)',
    bg: '#fafaf7'
  },

  // Coordination colors
  coordColors: ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2d5a3d'],

  init: function(canvasId) {
    MD.viewer.canvas = document.getElementById(canvasId);
    MD.viewer.ctx = MD.viewer.canvas.getContext('2d');

    const cv = MD.viewer.canvas;
    cv.addEventListener('mousedown', MD.viewer.onMouseDown);
    cv.addEventListener('mousemove', MD.viewer.onMouseMove);
    cv.addEventListener('mouseup', MD.viewer.onMouseUp);
    cv.addEventListener('mouseleave', MD.viewer.onMouseUp);
    cv.addEventListener('wheel', MD.viewer.onWheel, { passive: false });

    // Touch events
    cv.addEventListener('touchstart', MD.viewer.onTouchStart, { passive: false });
    cv.addEventListener('touchmove', MD.viewer.onTouchMove, { passive: false });
    cv.addEventListener('touchend', MD.viewer.onMouseUp);
  },

  /**
   * Project 3D point to 2D screen coordinates
   */
  project: function(x, y, z) {
    const cv = MD.viewer.canvas;
    const cx = cv.width / 2 + MD.viewer.panX;
    const cy = cv.height / 2 + MD.viewer.panY;

    const ax = MD.viewer.viewAngleX * Math.PI / 180;
    const ay = MD.viewer.viewAngleY * Math.PI / 180;
    const zm = MD.viewer.zoom;

    // Rotate around Y
    const x1 = x * Math.cos(ay) - z * Math.sin(ay);
    const z1 = x * Math.sin(ay) + z * Math.cos(ay);
    const y1 = y;

    // Rotate around X
    const y2 = y1 * Math.cos(ax) - z1 * Math.sin(ax);
    const z2 = y1 * Math.sin(ax) + z1 * Math.cos(ax);

    // Simple orthographic projection with zoom
    const scale = 18 * zm;
    return {
      sx: cx + x1 * scale,
      sy: cy - y2 * scale,
      depth: z2
    };
  },

  /**
   * Get atom color based on current color mode
   */
  getAtomColor: function(atom, alpha) {
    const a = alpha || 1.0;
    const v = MD.viewer;

    switch (v.colorMode) {
      case 'coordination':
        const ci = Math.min(atom.coordination, 4);
        return v.coordColors[ci];

      case 'energy':
        if (!v.slab) return '#888';
        const atoms = v.slab.atoms;
        const energies = atoms.map(a => a.energy);
        const emin = Math.min(...energies);
        const emax = Math.max(...energies);
        const t = emax > emin ? (atom.energy - emin) / (emax - emin) : 0.5;
        const r = Math.round(45 + t * 180);
        const g = Math.round(90 - t * 50);
        const b = Math.round(61 + (1 - t) * 100);
        return `rgba(${r},${g},${b},${a})`;

      case 'layer':
        if (!v.slab) return '#888';
        const zmin = Math.min(...v.slab.atoms.map(a => a.z));
        const zmax = Math.max(...v.slab.atoms.map(a => a.z));
        const zt = zmax > zmin ? (atom.z - zmin) / (zmax - zmin) : 0.5;
        const lr = Math.round(45 + zt * 150);
        const lg = Math.round(90 + zt * 50);
        const lb = Math.round(61 + (1 - zt) * 120);
        return `rgba(${lr},${lg},${lb},${a})`;

      default: // species
        if (atom.isSurface) {
          return atom.species === 0 ? v.colors.SiSurface : v.colors.GeSurface;
        }
        return atom.species === 0 ? v.colors.Si : v.colors.Ge;
    }
  },

  /**
   * Render the current slab
   */
  render: function(slab) {
    if (slab) MD.viewer.slab = slab;
    if (!MD.viewer.slab) return;

    const cv = MD.viewer.canvas;
    const ctx = MD.viewer.ctx;
    const atoms = MD.viewer.slab.atoms;
    const box = MD.viewer.slab.box;

    // Clear
    ctx.fillStyle = MD.viewer.colors.bg;
    ctx.fillRect(0, 0, cv.width, cv.height);

    // Draw subtle grid
    MD.viewer.drawGrid(ctx, cv);

    // Center the crystal
    const cx = box.lx / 2;
    const cy = box.ly / 2;
    const cz = box.lz / 2;

    // Project all atoms
    const projected = atoms.map((a, i) => {
      const p = MD.viewer.project(a.x - cx, a.y - cy, a.z - cz);
      return { ...p, idx: i };
    });

    // Sort by depth (painter's algorithm)
    projected.sort((a, b) => a.depth - b.depth);

    // Draw bonds first
    ctx.lineWidth = 1;
    for (const pa of projected) {
      const ai = atoms[pa.idx];
      for (const nb of ai.neighbors) {
        if (nb.r > 2.6) continue; // only draw short bonds
        if (nb.idx <= pa.idx) continue; // avoid double-drawing
        const pj = MD.viewer.project(
          atoms[nb.idx].x - cx,
          atoms[nb.idx].y - cy,
          atoms[nb.idx].z - cz
        );
        const isSurf = ai.isSurface || atoms[nb.idx].isSurface;
        ctx.strokeStyle = isSurf ? MD.viewer.colors.bondSurface : MD.viewer.colors.bond;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pj.sx, pj.sy);
        ctx.stroke();
      }
    }

    // Draw atoms
    for (const pa of projected) {
      const ai = atoms[pa.idx];
      const baseR = (ai.species === 1 ? 5.5 : 4.5) * MD.viewer.zoom;
      const r = baseR * (1 + pa.depth * 0.005);

      const color = MD.viewer.getAtomColor(ai);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.arc(pa.sx + 1, pa.sy + 1, r + 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Main circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pa.sx, pa.sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(pa.sx - r * 0.25, pa.sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Surface indicator ring
      if (ai.isSurface && MD.viewer.colorMode === 'species') {
        ctx.strokeStyle = 'rgba(200, 100, 50, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pa.sx, pa.sy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Legend
    MD.viewer.drawLegend(ctx, cv);
  },

  drawGrid: function(ctx, cv) {
    ctx.strokeStyle = MD.viewer.colors.grid;
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x < cv.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cv.height);
      ctx.stroke();
    }
    for (let y = 0; y < cv.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cv.width, y);
      ctx.stroke();
    }
  },

  drawLegend: function(ctx, cv) {
    const x = 12, y = cv.height - 40;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textBaseline = 'middle';

    if (MD.viewer.colorMode === 'species') {
      // Si
      ctx.fillStyle = MD.viewer.colors.Si;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b6560';
      ctx.fillText('Si', x + 10, y);

      // Ge
      ctx.fillStyle = MD.viewer.colors.Ge;
      ctx.beginPath(); ctx.arc(x + 45, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b6560';
      ctx.fillText('Ge', x + 55, y);

      // Surface
      ctx.fillStyle = '#9a9490';
      ctx.fillText('ring = surface atom', x + 90, y);
    } else if (MD.viewer.colorMode === 'coordination') {
      for (let i = 0; i <= 4; i++) {
        const lx = x + i * 40;
        ctx.fillStyle = MD.viewer.coordColors[i];
        ctx.beginPath(); ctx.arc(lx, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b6560';
        ctx.fillText(String(i), lx + 10, y);
      }
    }
  },

  // Mouse / touch handlers
  onMouseDown: function(e) {
    MD.viewer.isDragging = true;
    MD.viewer.lastMouse = { x: e.clientX, y: e.clientY };
  },

  onMouseMove: function(e) {
    if (!MD.viewer.isDragging) return;
    const dx = e.clientX - MD.viewer.lastMouse.x;
    const dy = e.clientY - MD.viewer.lastMouse.y;

    if (e.shiftKey) {
      MD.viewer.panX += dx;
      MD.viewer.panY += dy;
    } else {
      MD.viewer.viewAngleY += dx * 0.5;
      MD.viewer.viewAngleX += dy * 0.5;
    }

    MD.viewer.lastMouse = { x: e.clientX, y: e.clientY };
    MD.viewer.render();
  },

  onMouseUp: function() {
    MD.viewer.isDragging = false;
  },

  onWheel: function(e) {
    e.preventDefault();
    MD.viewer.zoom *= e.deltaY > 0 ? 0.95 : 1.05;
    MD.viewer.zoom = Math.max(0.3, Math.min(5, MD.viewer.zoom));
    MD.viewer.render();
  },

  onTouchStart: function(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      MD.viewer.isDragging = true;
      MD.viewer.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  },

  onTouchMove: function(e) {
    e.preventDefault();
    if (!MD.viewer.isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - MD.viewer.lastMouse.x;
    const dy = e.touches[0].clientY - MD.viewer.lastMouse.y;
    MD.viewer.viewAngleY += dx * 0.5;
    MD.viewer.viewAngleX += dy * 0.5;
    MD.viewer.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    MD.viewer.render();
  },

  /**
   * Reset view to default
   */
  resetView: function() {
    MD.viewer.viewAngleX = -25;
    MD.viewer.viewAngleY = 30;
    MD.viewer.zoom = 1.0;
    MD.viewer.panX = 0;
    MD.viewer.panY = 0;
    MD.viewer.render();
  }
};
