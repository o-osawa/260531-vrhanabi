/* global AFRAME, THREE */
/*
 * 花火の3D描画（A-Frameカスタムコンポーネント）
 *
 * - 実スケール(1 unit = 1 m)で打上 → 開花を再現
 * - 上昇する火種(rocket)＋トレイル → 指定高度で実寸開花(粒子球)
 * - 重力・空気抵抗・残光・色・型（牡丹/菊/柳）
 * - 打上プログラムに沿って連続打上＋フィナーレ → ループ
 *
 * このコンポーネントは「ワールド」コンテナ(=北整合される親エンティティ)に付与する。
 * 各会場の地上座標を setVenues() で渡すと、その地点から花火が上がる。
 */

const GRAVITY = 9.8; // m/s^2

// 花火の色パレット（HSLで鮮やかに）
const PALETTES = [
  ['#ff3b3b', '#ff8f3b', '#ffe23b'], // 暖色
  ['#3bd1ff', '#3b7bff', '#a83bff'], // 寒色
  ['#ff3bd1', '#ff3b7b', '#ffffff'], // ピンク〜白
  ['#3bff7b', '#bfff3b', '#ffffff'], // 緑〜白
  ['#ffd24a', '#ff9a3b', '#ffec8a'], // 金（柳向き）
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 放射状グラデーションの粒子スプライト
function makeParticleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

AFRAME.registerComponent('hanabi-show', {
  init() {
    this.root = this.el.object3D;
    this.texture = makeParticleTexture();
    this.rockets = [];
    this.bursts = [];
    this.venues = [];     // [{pos: Vector3(地上), shellMix, distance}]
    this.running = false;
    this.launchTimer = 0;
    this.nextLaunchIn = 0.6;
    this.phaseTimer = 0;   // フィナーレ制御用
    this.finale = false;
  },

  // 会場の地上ワールド座標とフィナーレ構成を設定して開始（大会切替時も呼ぶ）
  setVenues(venues, finaleMix) {
    this.clear();
    this.venues = venues;
    this.finaleMix = (finaleMix && finaleMix.length) ? finaleMix : [10];
    this.launchTimer = 0;
    this.nextLaunchIn = 0.6;
    this.phaseTimer = 0;
    this.finale = false;
    this.running = true;
  },

  // 進行中の火種・開花をすべて除去
  clear() {
    (this.rockets || []).forEach((rk) => {
      this.root.remove(rk.points); rk.geo.dispose(); rk.points.material.dispose();
    });
    (this.bursts || []).forEach((b) => {
      this.root.remove(b.points); b.geo.dispose(); b.mat.dispose();
    });
    this.rockets = [];
    this.bursts = [];
  },

  // 火種(rocket)を打ち上げる
  launchShell(venue, size) {
    const spec = (window.SHELL_SPECS[size]) || window.SHELL_SPECS[5];
    const apex = spec.burstHeight;
    const palette = (size >= 10 && Math.random() < 0.5) ? PALETTES[4] : pick(PALETTES);

    const TRAIL = 14;
    const positions = new Float32Array(TRAIL * 3);
    const colors = new Float32Array(TRAIL * 3);
    const start = venue.pos.clone();
    for (let i = 0; i < TRAIL; i++) {
      positions[i * 3] = start.x;
      positions[i * 3 + 1] = start.y;
      positions[i * 3 + 2] = start.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: Math.max(3, size * 0.7), map: this.texture, vertexColors: true,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    this.root.add(points);

    // 上昇に必要な初速（重力で apex 付近で速度0に近づく）
    const riseTime = 1.4 + size * 0.06;
    const v0 = apex / riseTime + 0.5 * GRAVITY * riseTime; // 平均的に apex へ届く初速

    this.rockets.push({
      points, geo, positions, colors,
      head: start.clone(),
      vel: v0,
      apex, size, spec, palette, venue,
      trailHSL: new THREE.Color(palette[palette.length - 1]),
    });
  },

  // 開花
  explode(rocket) {
    const spec = rocket.spec;
    const radius = spec.burstDiameter / 2;
    const size = rocket.size;
    const count = Math.min(700, Math.max(90, Math.round(size * 32)));
    const palette = rocket.palette;

    // 型を号数で重み付け選択
    const r = Math.random();
    let type = 'peony';
    if (palette === PALETTES[4]) type = 'willow';
    else if (r < 0.4) type = 'chrysanthemum';
    else if (r < 0.5 && size >= 10) type = 'willow';

    const expandTime = 0.8 + size * 0.03;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    const base = rocket.head.clone();
    const colorObjs = palette.map((h) => new THREE.Color(h));

    for (let i = 0; i < count; i++) {
      // 球面一様サンプリング（全ての型で丸く開く）
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const dx = s * Math.cos(phi), dy = u, dz = s * Math.sin(phi);
      // 速度は球状一様。柳は遅め＋長寿命にして「枝垂れ」は重力で自然に作る
      let speed = (radius / expandTime) * (0.85 + Math.random() * 0.3);
      if (type === 'willow') speed *= 0.8;

      positions[i * 3] = base.x; positions[i * 3 + 1] = base.y; positions[i * 3 + 2] = base.z;
      vels[i * 3] = dx * speed; vels[i * 3 + 1] = dy * speed; vels[i * 3 + 2] = dz * speed;

      const col = pick(colorObjs);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: Math.max(2.5, size * 0.9), map: this.texture, vertexColors: true,
      transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
      depthWrite: false, sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    this.root.add(points);

    // 開花音（距離に応じて遅れて届く）
    if (window.HanabiAudio) {
      window.HanabiAudio.boom({ size, distance: (rocket.venue && rocket.venue.distance) || 500 });
    }

    const life = type === 'willow' ? 5.0 : (type === 'chrysanthemum' ? 3.6 : 2.6);
    const drag = type === 'willow' ? 0.55 : (type === 'chrysanthemum' ? 0.9 : 1.2);

    this.bursts.push({
      points, geo, mat, positions, vels,
      age: 0, life, drag, type,
      twinkle: type !== 'willow' && Math.random() < 0.5,
    });
  },

  tick(time, deltaMs) {
    if (!this.running) return;
    const dt = Math.min(0.05, deltaMs / 1000) || 0.016;

    // ---- 打上スケジューリング ----
    this.phaseTimer += dt;
    // 90秒ごとに ~12秒のフィナーレ
    this.finale = (this.phaseTimer % 90) > 78;
    this.launchTimer += dt;
    if (this.launchTimer >= this.nextLaunchIn && this.venues.length) {
      this.launchTimer = 0;
      const burstCount = this.finale ? 2 + Math.floor(Math.random() * 3) : 1;
      for (let k = 0; k < burstCount; k++) {
        const venue = pick(this.venues);
        let size;
        if (this.finale) size = pick(this.finaleMix);
        else size = pick(venue.shellMix);
        this.launchShell(venue, size);
      }
      this.nextLaunchIn = this.finale ? 0.18 + Math.random() * 0.25
                                      : 0.45 + Math.random() * 0.9;
    }

    // ---- 火種(rocket)更新 ----
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rk = this.rockets[i];
      rk.vel -= GRAVITY * dt;
      rk.head.y += rk.vel * dt;
      // トレイルを1つずらして先頭に現在位置
      const p = rk.positions, c = rk.colors;
      for (let j = p.length / 3 - 1; j > 0; j--) {
        p[j * 3] = p[(j - 1) * 3];
        p[j * 3 + 1] = p[(j - 1) * 3 + 1];
        p[j * 3 + 2] = p[(j - 1) * 3 + 2];
      }
      p[0] = rk.head.x; p[1] = rk.head.y; p[2] = rk.head.z;
      const tc = rk.trailHSL;
      for (let j = 0; j < c.length / 3; j++) {
        const f = 1 - j / (c.length / 3);
        c[j * 3] = tc.r * f; c[j * 3 + 1] = tc.g * f; c[j * 3 + 2] = tc.b * f;
      }
      rk.geo.attributes.position.needsUpdate = true;
      rk.geo.attributes.color.needsUpdate = true;

      // apex 到達（速度が下向き or 高度に到達）で開花
      if (rk.head.y >= rk.apex || rk.vel <= 0) {
        this.explode(rk);
        this.root.remove(rk.points);
        rk.geo.dispose(); rk.points.material.dispose();
        this.rockets.splice(i, 1);
      }
    }

    // ---- 開花(burst)更新 ----
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const pos = b.positions, vel = b.vels;
      const dragF = Math.max(0, 1 - b.drag * dt);
      for (let j = 0; j < pos.length / 3; j++) {
        vel[j * 3] *= dragF;
        vel[j * 3 + 1] = vel[j * 3 + 1] * dragF - GRAVITY * dt;
        vel[j * 3 + 2] *= dragF;
        pos[j * 3] += vel[j * 3] * dt;
        pos[j * 3 + 1] += vel[j * 3 + 1] * dt;
        pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
      }
      b.geo.attributes.position.needsUpdate = true;

      // フェードアウト＋瞬き
      const t = b.age / b.life;
      let op = 1 - t * t;
      if (b.twinkle) op *= 0.6 + 0.4 * Math.abs(Math.sin(b.age * 18));
      b.mat.opacity = Math.max(0, op);

      if (b.age >= b.life) {
        this.root.remove(b.points);
        b.geo.dispose(); b.mat.dispose();
        this.bursts.splice(i, 1);
      }
    }
  },
});
