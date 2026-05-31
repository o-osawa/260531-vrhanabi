/* global AFRAME, THREE */
/*
 * 真北整合コンポーネント
 *
 * 花火は固定ワールド座標(北=-Z)に実方位で配置済み。A-Frameの look-controls が
 * 端末のジャイロでカメラを回す（見回し）。ここでは「ワールドを一定角だけ回す
 * オフセット」を一度だけ確定し、ワールドの北を実際の北へ合わせる。
 * look-controls がカメラの相対回転を担うので、オフセットは定数で十分（毎フレーム
 * 追従させると二重回転になる）。
 *
 * 整合式の導出:
 *   カメラのワールド方位 ψ_cam = -φ （φ = カメラ rotation.y, A-Frameは反時計回り正）
 *   方位 B[時計回り/北基準] に置いた花火の見かけ方位 = B - R （R = ワールド rotation.y）
 *   中央に来る条件 ψ_obj = ψ_cam → R = B + φ
 *
 * 自動(コンパス)・手動(会場の方角でタップ)とも同じ式で、その瞬間のカメラ yaw を使う。
 */
AFRAME.registerComponent('north-align', {
  init() {
    this.heading = null;     // 端末方位[deg]（真北基準・時計回り）
    this.offset = null;      // 確定済みワールド回転[rad]（null=未整合）
    this.autoPending = true;  // 初回コンパス受信で自動整合する
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
    if (h !== null && !Number.isNaN(h)) {
      this.heading = h;
      if (this.autoPending) { this.alignTo(h); this.autoPending = false; }
    }
  },

  // 現在のカメラ yaw を取得（ワールドクォータニオンから）
  cameraYaw() {
    const cam = this.el.sceneEl.camera;
    if (!cam) return 0;
    cam.getWorldQuaternion(this._q);
    this._euler.setFromQuaternion(this._q, 'YXZ');
    return this._euler.y;
  },

  // bearing[deg, 時計回り/北基準] を正面方向として整合（オフセット確定）
  alignTo(bearingDeg) {
    this.offset = THREE.MathUtils.degToRad(bearingDeg) + this.cameraYaw();
  },

  // 「今向いている方角を会場方向とみなす」手動較正
  calibrateTo(venueBearingDeg) {
    this.autoPending = false;
    this.alignTo(venueBearingDeg);
  },

  tick() {
    if (this.offset !== null) this.el.object3D.rotation.y = this.offset;
  },
});
