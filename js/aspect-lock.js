/* global AFRAME */
/*
 * アスペクト比ロック（aspect-lock コンポーネント / a-scene に付与）
 *
 * AR背景のカメラ映像(縦長フルスクリーン)に対し、3Dの透視投影カメラのアスペクト比が
 * ずれると花火(本来は球=円)が横長に潰れて見える。A-Frameは内部のリサイズ判定で
 * アスペクトを上書きすることがあるため、毎フレーム実ビューポート(window.innerWidth/Height)
 * に強制同期して潰れを防ぐ。差分があるときだけ更新してコストを抑える。
 */
AFRAME.registerComponent('aspect-lock', {
  tick() {
    const cam = this.el.camera;
    if (!cam || !cam.isPerspectiveCamera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (h === 0) return;
    const aspect = w / h;
    if (Math.abs(cam.aspect - aspect) > 0.001) {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
      if (this.el.renderer) {
        this.el.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.el.renderer.setSize(w, h, false);
      }
    }
  },
});
