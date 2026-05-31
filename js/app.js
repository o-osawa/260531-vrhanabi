/* global AFRAME, THREE, Geo, FESTIVAL */
/*
 * アプリ制御:
 *  - 開始ボタンのユーザー操作でセンサー(方位)許可とGPSを要求
 *  - 現在地→各会場の距離・方位・仰角を計算し、ワールドに会場地上点を配置
 *  - hanabi-show 開始 / north-align のコンパス整合 / HUD更新
 *  - GPS不可時は推定視点へフォールバック＋手動較正を案内
 */
(function () {
  // GPS取得不可時のフォールバック視点（隅田川の南西・錦糸町付近の推定地点）
  const FALLBACK_VIEW = { lat: 35.6997, lng: 139.8035, label: '推定視点（錦糸町付近）' };

  const $ = (id) => document.getElementById(id);
  const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');
  const compass8 = (deg) => {
    const full = ['北','北東','東','南東','南','南西','西','北西'];
    return full[Math.round(deg / 45) % 8] + `(${Math.round(deg)}°)`;
  };

  let viewer = null;        // {lat, lng}
  let primaryBearing = 0;   // 主会場の方位（手動較正用）

  function init() {
    $('startBtn').addEventListener('click', onStart, { once: true });
    $('calibrateBtn').addEventListener('click', onCalibrate);
    $('title').textContent = FESTIVAL.name;
    $('subtitle').textContent = FESTIVAL.subtitle;
  }

  async function onStart() {
    $('startBtn').disabled = true;
    $('startBtn').textContent = '準備中…';

    // 1) 方位センサー許可（iOS 13+）
    await requestOrientationPermission();

    // 2) 現在地（GPS）
    try {
      viewer = await Geo.getCurrentPosition();
      setStatus(`現在地を取得しました（精度±${Math.round(viewer.accuracy)}m）`);
    } catch (e) {
      viewer = { lat: FALLBACK_VIEW.lat, lng: FALLBACK_VIEW.lng };
      setStatus(`GPSを取得できないため${FALLBACK_VIEW.label}から表示します。［方角を較正］で調整できます。`, true);
    }

    placeVenuesAndStart();

    // コンパス整合を開始
    const world = $('world');
    world.components['north-align'].enableCompass();

    document.body.classList.add('running');
  }

  function requestOrientationPermission() {
    return new Promise((resolve) => {
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        D.requestPermission().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    });
  }

  function placeVenuesAndStart() {
    const world = $('world');
    const worldVenues = [];
    const rows = [];

    FESTIVAL.venues.forEach((v, idx) => {
      const dist = Geo.haversine(viewer.lat, viewer.lng, v.lat, v.lng);
      const brg = Geo.bearing(viewer.lat, viewer.lng, v.lat, v.lng);
      // 代表号数(最大)の開花高度で仰角を表示
      const maxSize = Math.max.apply(null, v.shellMix);
      const elev = Geo.elevationAngle(dist, window.SHELL_SPECS[maxSize].burstHeight);
      const ground = Geo.geoToWorld(brg, dist, 0);

      if (idx === 0) primaryBearing = brg;

      worldVenues.push({
        pos: new THREE.Vector3(ground.x, ground.y, ground.z),
        shellMix: v.shellMix,
        distance: dist,
      });

      rows.push(
        `<div class="venue"><b>${v.name}</b><br>` +
        `距離 ${fmtDist(dist)} ／ 方角 ${compass8(brg)} ／ 開花仰角 約${elev.toFixed(1)}°</div>`
      );
    });

    $('venues').innerHTML = rows.join('');
    world.components['hanabi-show'].setVenues(worldVenues);
  }

  function onCalibrate() {
    const world = $('world');
    world.components['north-align'].calibrateTo(primaryBearing);
    setStatus('正面を主会場の方角に合わせました。');
  }

  function setStatus(msg, warn) {
    const el = $('status');
    el.textContent = msg;
    el.classList.toggle('warn', !!warn);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
