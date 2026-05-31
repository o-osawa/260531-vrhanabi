/* global THREE, Geo, FESTIVALS */
/*
 * アプリ制御:
 *  - 大会の選択（起動オーバーレイ＋実行中HUDの両方で切替可能）
 *  - 開始ボタンのユーザー操作でセンサー(方位)許可・GPS・音声を初期化
 *  - 現在地→選択大会の各会場の距離・方位・仰角を計算し、ワールドに配置
 *  - hanabi-show 開始/切替 / north-align のコンパス整合 / HUD更新
 *  - GPS不可時は推定視点へフォールバック＋手動較正を案内
 */
(function () {
  // GPS取得不可時のフォールバック視点（東京駅付近）
  const FALLBACK_VIEW = { lat: 35.6812, lng: 139.7671, label: '推定視点（東京駅付近）' };

  const $ = (id) => document.getElementById(id);
  const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');
  const compass8 = (deg) => {
    const full = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
    return full[Math.round(deg / 45) % 8] + `(${Math.round(deg)}°)`;
  };

  let viewer = null;        // {lat, lng}
  let primaryBearing = 0;   // 選択大会・主会場の方位（手動較正用）
  let currentIndex = 0;

  function init() {
    // 両方のセレクトに大会一覧を流し込む
    [$('festivalSelect'), $('festivalSwitch')].forEach((sel) => {
      if (!sel) return;
      sel.innerHTML = FESTIVALS.map((f, i) => `<option value="${i}">${f.name}</option>`).join('');
    });
    $('festivalSelect').addEventListener('change', (e) => updateOverlaySubtitle(+e.target.value));
    $('festivalSwitch').addEventListener('change', (e) => selectFestival(+e.target.value));
    $('startBtn').addEventListener('click', onStart, { once: true });
    $('calibrateBtn').addEventListener('click', onCalibrate);
    updateOverlaySubtitle(0);
  }

  function updateOverlaySubtitle(i) {
    $('subtitle').textContent = FESTIVALS[i].subtitle;
  }

  async function onStart() {
    $('startBtn').disabled = true;
    $('startBtn').textContent = '準備中…';
    currentIndex = +$('festivalSelect').value || 0;

    // 0) 音声初期化（ユーザー操作中に行う必要がある）
    if (window.HanabiAudio) window.HanabiAudio.init();

    // 1) カメラ（AR背景）と方位センサー許可（iOS 13+）
    await startCamera();
    await requestOrientationPermission();

    // 2) 現在地（GPS）
    try {
      viewer = await Geo.getCurrentPosition();
      setStatus(`現在地を取得しました（精度±${Math.round(viewer.accuracy)}m）`);
    } catch (e) {
      viewer = { lat: FALLBACK_VIEW.lat, lng: FALLBACK_VIEW.lng };
      setStatus(`GPSを取得できないため${FALLBACK_VIEW.label}から表示します。［方角を較正］で調整できます。`, true);
    }

    // 3) 選択大会を配置して開始
    selectFestival(currentIndex);

    // 4) コンパス整合を開始
    $('world').components['north-align'].enableCompass();

    document.body.classList.add('running');
  }

  // 背面カメラ映像をAR背景として取得
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      });
      const v = $('camera');
      v.srcObject = stream;
      await v.play();
    } catch (e) {
      setStatus('カメラを使用できないため、AR背景なしで表示します。', true);
    }
  }

  function requestOrientationPermission() {
    return new Promise((resolve) => {
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        D.requestPermission().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    });
  }

  // 大会を選択（初回・切替共通）。viewer が必要。
  function selectFestival(index) {
    if (!viewer) return;
    currentIndex = index;
    const fest = FESTIVALS[index];
    const worldVenues = [];
    const rows = [];
    let primaryDist = 0;

    fest.venues.forEach((v, idx) => {
      const dist = Geo.haversine(viewer.lat, viewer.lng, v.lat, v.lng);
      const brg = Geo.bearing(viewer.lat, viewer.lng, v.lat, v.lng);
      const maxSize = Math.max.apply(null, v.shellMix);
      const elev = Geo.elevationAngle(dist, window.SHELL_SPECS[maxSize].burstHeight);
      const ground = Geo.geoToWorld(brg, dist, 0);
      if (idx === 0) { primaryBearing = brg; primaryDist = dist; }

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

    $('hudTitle').textContent = fest.name;
    $('venues').innerHTML = rows.join('');
    if ($('festivalSwitch').value !== String(index)) $('festivalSwitch').value = String(index);

    $('world').components['hanabi-show'].setVenues(worldVenues, fest.finaleMix);

    // 方向ガイド（花火の方角・大会名・距離）を更新
    $('world').components['direction-guide'].set({
      name: fest.name,
      distanceText: '距離 ' + fmtDist(primaryDist),
      bearingDeg: primaryBearing,
    });
  }

  function onCalibrate() {
    $('world').components['north-align'].calibrateTo(primaryBearing);
    setStatus('正面を主会場の方角に合わせました。');
  }

  function setStatus(msg, warn) {
    const el = $('status');
    el.textContent = msg;
    el.classList.toggle('warn', !!warn);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
