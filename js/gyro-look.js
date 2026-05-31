/* global AFRAME, THREE */
/*
 * ジャイロ見回し（gyro-look コンポーネント）
 *
 * 端末の傾き(deviceorientation)からカメラ姿勢を決める。スワイプ/ドラッグ操作は持たない
 * （A-Frame look-controls を使わないことで、標準の英語センサー許可ダイアログも出さない）。
 *
 * 姿勢の式は THREE.DeviceOrientationControls と同等:
 *   euler(beta, alpha, -gamma, 'YXZ') → q → q*q1(-90°X) → q*q0(-screenOrient around Z)
 */
AFRAME.registerComponent('gyro-look', {
  init() {
    this.enabled = false;
    this.hasData = false;
    this.d = { alpha: 0, beta: 0, gamma: 0 };
    this.screenAngle = screenOrientationAngle();
    this.zee = new THREE.Vector3(0, 0, 1);
    this.euler = new THREE.Euler();
    this.q0 = new THREE.Quaternion();
    this.q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90° around X
    this.onOrient = (e) => {
      if (e.alpha == null) return;
      this.d = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
      this.hasData = true;
    };
    this.onScreen = () => { this.screenAngle = screenOrientationAngle(); };
  },

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener('deviceorientation', this.onOrient, false);
    window.addEventListener('orientationchange', this.onScreen, false);
  },

  tick() {
    if (!this.enabled || !this.hasData) return;
    const alpha = THREE.MathUtils.degToRad(this.d.alpha || 0);
    const beta = THREE.MathUtils.degToRad(this.d.beta || 0);
    const gamma = THREE.MathUtils.degToRad(this.d.gamma || 0);
    const orient = THREE.MathUtils.degToRad(this.screenAngle || 0);

    this.euler.set(beta, alpha, -gamma, 'YXZ');
    const q = this.el.object3D.quaternion;
    q.setFromEuler(this.euler);
    q.multiply(this.q1);
    q.multiply(this.q0.setFromAxisAngle(this.zee, -orient));
  },
});

function screenOrientationAngle() {
  if (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  return window.orientation || 0;
}
