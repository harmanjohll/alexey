// viz3d.js — Three.js 3D visualization module
// All functions are global (no modules, no exports)

// Global variables for Three.js
var scene, camera, renderer, atomMeshes = [], bondMeshes = [];
var currentStyle = 'bs', lastAtomData = null;
var geoCache = {};
var simBox = null, slabBox = null;

function init3D(containerId) {
  var container = document.getElementById(containerId || 'viewer3d');
  var w = container.clientWidth, h = container.clientHeight || 400;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050805);

  var aspect = w / h;
  var frustum = 15;
  camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 1000
  );
  camera.position.set(15, 15, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  var ambient = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambient);
  var dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(10, 10, 10);
  scene.add(dir);
  var dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dir2.position.set(-5, -5, 10);
  scene.add(dir2);

  // Simple orbit controls
  var isDragging = false, prevX = 0, prevY = 0;
  var theta = 0.5, phi = 0.8, radius = 30;
  var target = new THREE.Vector3(0, 0, 0);

  function updateCamera() {
    camera.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
    camera.position.y = target.y + radius * Math.cos(phi);
    camera.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(target);
    var a = w / h;
    camera.left = -frustum * a; camera.right = frustum * a;
    camera.top = frustum; camera.bottom = -frustum;
    camera.updateProjectionMatrix();
  }

  renderer.domElement.addEventListener('mousedown', function(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  renderer.domElement.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    theta += (e.clientX - prevX) * 0.01;
    phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi + (e.clientY - prevY) * 0.01));
    prevX = e.clientX; prevY = e.clientY;
    updateCamera();
  });
  window.addEventListener('mouseup', function() { isDragging = false; });
  renderer.domElement.addEventListener('wheel', function(e) {
    frustum = Math.max(3, Math.min(50, frustum + e.deltaY * 0.03));
    updateCamera();
    e.preventDefault();
  }, {passive: false});

  // Touch support
  renderer.domElement.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
  });
  renderer.domElement.addEventListener('touchmove', function(e) {
    if (!isDragging || e.touches.length !== 1) return;
    theta += (e.touches[0].clientX - prevX) * 0.01;
    phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi + (e.touches[0].clientY - prevY) * 0.01));
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    updateCamera();
    e.preventDefault();
  });
  renderer.domElement.addEventListener('touchend', function() { isDragging = false; });

  // Preset views
  window.setPresetView = function(view) {
    switch(view) {
      case 'top':    theta = 0; phi = 0.01; break;
      case 'bottom': theta = 0; phi = Math.PI - 0.01; break;
      case 'front':  theta = 0; phi = Math.PI / 2; break;
      case 'side':   theta = Math.PI / 2; phi = Math.PI / 2; break;
      case 'iso':    theta = 0.5; phi = 0.8; break;
    }
    updateCamera();
  };

  updateCamera();
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function getGeo(key, factory) { if (!geoCache[key]) geoCache[key] = factory(); return geoCache[key]; }

var _bAxis = new THREE.Vector3();
var _bMid = new THREE.Vector3();
function orientBond(mesh, p1, p2) {
  _bMid.addVectors(p1, p2).multiplyScalar(0.5);
  _bAxis.subVectors(p2, p1);
  var len = _bAxis.length();
  mesh.position.copy(_bMid);
  mesh.scale.set(1, len, 1);
  if (len > 0.001) {
    _bAxis.normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), _bAxis);
  }
}

var STYLES = {
  bs:    { atomR: [0.5, 0.55],  bondR: 0.12, showBonds: true,  showAtoms: true  },
  vdw:   { atomR: [1.17, 1.22], bondR: 0,    showBonds: false, showAtoms: true  },
  stick: { atomR: [0.15, 0.15], bondR: 0.12, showBonds: true,  showAtoms: true  },
  layer: { atomR: [0.5, 0.55],  bondR: 0.12, showBonds: true,  showAtoms: true  }
};

function layerColor(t) {
  var r = Math.min(1, Math.max(0, 1.5 - Math.abs(t - 0.75) * 4));
  var g = Math.min(1, Math.max(0, 1.5 - Math.abs(t - 0.5) * 4));
  var b = Math.min(1, Math.max(0, 1.5 - Math.abs(t - 0.25) * 4));
  return new THREE.Color(r, g, b);
}

var BOND_CUTOFF = 2.8;
var siColor = new THREE.Color(0x3ca0a0);
var geColor = new THREE.Color(0xdd8844);

function setRenderStyle(style) {
  currentStyle = style;
  document.querySelectorAll('#renderModes button').forEach(function(b) {
    b.classList.toggle('active', b.dataset.style === style);
  });
  var legend = document.getElementById('colorLegend');
  if (legend) {
    if (style === 'layer') {
      legend.innerHTML = '<span style="background:linear-gradient(to right,#4040ff,#40ff40,#ffff40,#ff4040);width:80px;height:10px;border-radius:3px;display:inline-block"></span><span>bottom &rarr; top layer</span>';
    } else {
      legend.innerHTML = '<span><span class="dot" style="background:#3ca0a0"></span>Silicon</span><span><span class="dot" style="background:#dd8844"></span>Germanium</span>';
    }
  }
  if (lastAtomData) updateAtoms(lastAtomData.pos, lastAtomData.sp, lastAtomData.n, lastAtomData.lx, lastAtomData.ly, lastAtomData.lz);
}

function updateAtoms(posBuffer, spBuffer, natom, totlx, totly, totlz) {
  var positions = new Float64Array(posBuffer);
  var sp = new Uint8Array(spBuffer);

  lastAtomData = {pos: posBuffer, sp: spBuffer, n: natom, lx: totlx, ly: totly, lz: totlz};

  var cx = totlx / 2, cy = totly / 2, cz = totlz / 2;
  var style = STYLES[currentStyle];

  while (atomMeshes.length < natom) {
    var geo = getGeo('sphere16', function() { return new THREE.SphereGeometry(1, 16, 10); });
    var mat = new THREE.MeshPhongMaterial({ color: 0x3ca0a0 });
    var mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    atomMeshes.push(mesh);
  }
  while (atomMeshes.length > natom) {
    var m = atomMeshes.pop();
    scene.remove(m);
    m.material.dispose();
  }

  var zMin = Infinity, zMax = -Infinity;
  var viewPos = [];
  for (var i = 0; i < natom; i++) {
    var vx = positions[i*3] - cx;
    var vy = positions[i*3+2] - cz;
    var vz = positions[i*3+1] - cy;
    viewPos.push(vx, vy, vz);
    if (vy < zMin) zMin = vy;
    if (vy > zMax) zMax = vy;
  }
  var zRange = Math.max(0.01, zMax - zMin);

  for (var i = 0; i < natom; i++) {
    var mesh = atomMeshes[i];
    mesh.position.set(viewPos[i*3], viewPos[i*3+1], viewPos[i*3+2]);
    var r = style.atomR[sp[i] === 0 ? 0 : 1];
    mesh.scale.setScalar(r);
    mesh.visible = style.showAtoms;

    if (currentStyle === 'layer') {
      var t = (viewPos[i*3+1] - zMin) / zRange;
      mesh.material.color.copy(layerColor(t));
    } else {
      mesh.material.color.copy(sp[i] === 0 ? siColor : geColor);
    }
  }

  if (bondMeshes.length > 0) {
    var oldMat = bondMeshes[0].material;
    while (bondMeshes.length > 0) { scene.remove(bondMeshes.pop()); }
    oldMat.dispose();
  }

  if (style.showBonds && natom > 0) {
    var bondGeo = getGeo('cyl6', function() { return new THREE.CylinderGeometry(1, 1, 1, 6); });
    var bondColor = currentStyle === 'layer' ? 0x555555 : 0x668866;
    var sharedBondMat = new THREE.MeshPhongMaterial({ color: bondColor });
    var cutSq = BOND_CUTOFF * BOND_CUTOFF;

    for (var i = 0; i < natom; i++) {
      var ix = positions[i*3], iy = positions[i*3+1], iz = positions[i*3+2];
      for (var j = i + 1; j < natom; j++) {
        var dx = positions[j*3] - ix;
        var dy = positions[j*3+1] - iy;
        var dz = positions[j*3+2] - iz;
        if (dx > totlx * 0.5) dx -= totlx; else if (dx < -totlx * 0.5) dx += totlx;
        if (dy > totly * 0.5) dy -= totly; else if (dy < -totly * 0.5) dy += totly;
        var r2 = dx*dx + dy*dy + dz*dz;
        if (r2 < cutSq && r2 > 0.1) {
          var mesh = new THREE.Mesh(bondGeo, sharedBondMat);
          var p1 = new THREE.Vector3(viewPos[i*3], viewPos[i*3+1], viewPos[i*3+2]);
          var p2 = new THREE.Vector3(
            viewPos[i*3] + dx,
            viewPos[i*3+1] + dz,
            viewPos[i*3+2] + dy
          );
          orientBond(mesh, p1, p2);
          mesh.scale.x = style.bondR;
          mesh.scale.z = style.bondR;
          scene.add(mesh);
          bondMeshes.push(mesh);
        }
      }
    }
  }

  if (simBox) { scene.remove(simBox); simBox.geometry.dispose(); simBox.material.dispose(); simBox = null; }
  if (slabBox) { scene.remove(slabBox); slabBox.geometry.dispose(); slabBox.material.dispose(); slabBox = null; }

  var fullBoxGeo = new THREE.BoxGeometry(totlx, totlz, totly);
  var fullEdges = new THREE.EdgesGeometry(fullBoxGeo);
  var fullMat = new THREE.LineBasicMaterial({ color: 0x3ca03c, opacity: 0.35, transparent: true });
  simBox = new THREE.LineSegments(fullEdges, fullMat);
  scene.add(simBox);
  fullBoxGeo.dispose();

  if (zMax > zMin) {
    var slabH = zMax - zMin + 1.0;
    var slabCenterY = ((zMin + zMax) / 2);
    var slabGeo = new THREE.BoxGeometry(totlx, slabH, totly);
    var slabEdges = new THREE.EdgesGeometry(slabGeo);
    var slabMat = new THREE.LineBasicMaterial({ color: 0xddb84d, opacity: 0.3, transparent: true });
    slabBox = new THREE.LineSegments(slabEdges, slabMat);
    slabBox.position.y = slabCenterY;
    scene.add(slabBox);
    slabGeo.dispose();
  }
}
