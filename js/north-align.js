/* global AFRAME, THREE */
/*
 * 真北整合コンポーネント
 *
 * 花火は固定ワールド座標(北=-Z)に実方位で配置済み。gyro-look が端末の傾きで
 * カメラ姿勢を決める。ここでは「ワールドを一定角だけ回すオフセット」を一度だけ
 * 確定し、ワールドの北を実際の北へ合わせる（gyro-look が相対回転を担うので
 * オフセットは定数。毎フレーム追従させると上を向いた時にぶれる）。
 *
 * 整合式の導出:
 *   カメラのワールド方位 ψ_cam = -φ （φ = カメラ yaw, A-Frameは反時計回り正）
 *   方位 B[時計回り/北基準] に置いた花火の見かけ方位 = B - R （R = ワールド rotation.y）
 *   中央に来る条件 ψ_obj = ψ_cam → R = B + φ
 *
 * gyro-look がカメラ姿勢を反映するまで数フレーム待ってからオフセットを確定する。
 */
AFRAME.registerComponent('north-align', {
  init() {
    this.heading = null;     // 端末方位[deg]（真北基準・時計回り）
    this.offset = null;      // 確定済みワールド回転[rad]（null=未整合）
    this.autoPending = true;
    this._frames = 0;
    this.onOrient = this.onOrient.bind(this);
    this._euler = new THREE.Euler();
    this._q = new THREE.Quaternion();
  },

  enableCompass() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', this.onOrient, true);
      window.addEventListener('deviceorientation', this.onOrient, true);
    }
  },

  onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') {
      h = e.webkitCompassHeading;            // iOS: 真北基準・時計回り
    } else if (e.absolute === true && typeof e.alpha === 'number') {
      h = (360 - e.alpha) % 360;             // Android絶対: alpha=反時計回り→時計回りへ
    } else if (typeof e.alpha === 'number') {
      h = (360 - e.alpha) % 360;             // フォールバック（相対の可能性あり）
    }
    if (h !== null && !Number.isNaN(h)) this.heading = h;
  },

  // カメラ yaw（ワールドクォータニオンから）
  cameraYaw() {
    const cam = this.el.sceneEl.camera;
    if (!cam) return 0;
    cam.getWorldQuaternion(this._q);
    this._euler.setFromQuaternion(this._q, 'YXZ');
    return this._euler.y;
  },

  tick() {
    // 初回：方位取得後、カメラ姿勢が反映されるのを数フレーム待って一度だけ確定
    if (this.autoPending && this.heading !== null) {
      if (++this._frames > 8) {
        this.offset = THREE.MathUtils.degToRad(this.heading) + this.cameraYaw();
        this.autoPending = false;
      }
    }
    if (this.offset !== null) this.el.object3D.rotation.y = this.offset;
  },
});
