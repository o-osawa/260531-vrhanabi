/* global AFRAME, THREE */
/*
 * 方向ガイド（direction-guide コンポーネント）
 *
 * 花火の方角を案内する立て札を、ワールド(#world=北整合済み)内に配置する:
 *   - 花火の方角(B)      : 「大会名」「距離」＋大きな ↓（花火はこの下）
 *   - Bの90°右(B+90)    : ←（花火はあなたの左）
 *   - Bの90°左(B-90)    : →（花火はあなたの右）
 *   - Bの真後ろ(B+180)  : 「後ろ」（花火は後ろ）
 *
 * 文字は日本語を含むため、A-FrameのSDFテキスト(英字のみ)ではなく
 * canvasに描画した CanvasTexture を板(Plane)に貼り、常にカメラを向く(ビルボード)。
 */

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// 複数行テキストを canvas に描画して {tex, aspect} を返す
function makeTextTexture(lines, opt) {
  opt = opt || {};
  const W = 512;
  const pad = 36;
  const heights = lines.map((l) => (l.size || 56) * 1.25);
  const H = Math.round(pad * 2 + heights.reduce((a, b) => a + b, 0));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  // 視認性のための半透明の背景ピル
  g.fillStyle = opt.bg || 'rgba(0,0,0,0.45)';
  roundRect(g, 6, 6, W - 12, H - 12, 36);
  g.fill();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let y = pad;
  lines.forEach((l, i) => {
    const lh = heights[i];
    g.font = `bold ${l.size || 56}px "Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif`;
    // 縁取りで背景に負けないように
    g.lineWidth = Math.max(3, (l.size || 56) * 0.08);
    g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.strokeText(l.text, W / 2, y + lh / 2);
    g.fillStyle = l.color || '#fff';
    g.fillText(l.text, W / 2, y + lh / 2);
    y += lh;
  });
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return { tex, aspect: W / H };
}

AFRAME.registerComponent('direction-guide', {
  init() {
    this.group = new THREE.Group();
    this.el.object3D.add(this.group);
    this.markers = [];
    this.R = 140;          // 立て札までの距離[m]
    this.elevDeg = 20;     // 仰角[deg]
    this._cq = new THREE.Quaternion();
    this._pq = new THREE.Quaternion();
  },

  disposeMarkers() {
    this.markers.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
      if (m.material.map) m.material.map.dispose();
      m.material.dispose();
    });
    this.markers = [];
  },

  // opt: { name, distanceText, bearingDeg }
  set(opt) {
    this.disposeMarkers();
    const B = opt.bearingDeg || 0;

    this.addMarker(
      makeTextTexture([
        { text: opt.name, size: 46, color: '#ffd24a' },
        { text: opt.distanceText, size: 40, color: '#ffffff' },
        { text: '↓', size: 110, color: '#ffffff' },
      ]),
      B, 72);

    this.addMarker(makeTextTexture([{ text: '←', size: 200, color: '#7fe7ff' }]), B + 90, 44);
    this.addMarker(makeTextTexture([{ text: '→', size: 200, color: '#7fe7ff' }]), B - 90, 44);
    this.addMarker(makeTextTexture([{ text: '後ろ', size: 96, color: '#7fe7ff' }]), B + 180, 50);
  },

  addMarker(texInfo, bearingDeg, worldWidth) {
    const h = worldWidth / texInfo.aspect;
    const geo = new THREE.PlaneGeometry(worldWidth, h);
    const mat = new THREE.MeshBasicMaterial({
      map: texInfo.tex, transparent: true, side: THREE.DoubleSide,
      depthTest: false, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999; // 最前面に
    const E = THREE.MathUtils.degToRad(this.elevDeg);
    const B = THREE.MathUtils.degToRad(bearingDeg);
    mesh.position.set(
      this.R * Math.cos(E) * Math.sin(B),
      this.R * Math.sin(E),
      -this.R * Math.cos(E) * Math.cos(B)
    );
    this.group.add(mesh);
    this.markers.push(mesh);
  },

  // 各立て札を常にカメラへ正対させる（親=#worldの回転を打ち消す）
  tick() {
    const cam = this.el.sceneEl.camera;
    if (!cam || !this.markers.length) return;
    cam.getWorldQuaternion(this._cq);
    this.group.getWorldQuaternion(this._pq);
    this._pq.invert();
    const local = this._pq.multiply(this._cq); // parentWorld^-1 * camWorld
    this.markers.forEach((m) => m.quaternion.copy(local));
  },
});
