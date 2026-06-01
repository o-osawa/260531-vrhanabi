/* global THREE, Geo, FESTIVALS */
/*
 * アプリ制御:
 *  - 起動時に日本語の許可ダイアログ(#permModal)で、カメラ・モーション/方位・GPSの
 *    使用を説明して許可を得る
 *  - 大会の選択（起動オーバーレイ＋実行中HUDの両方で切替可能）
 *  - 現在地→選択大会の各会場の距離・方位・仰角を計算し、ワールドに配置
 *  - hanabi-show 開始/切替 / north-align のコンパス整合 / gyro-look の見回し / HUD更新
 *  - 操作はジャイロのみ（スワイプ操作・手動較正は廃止）
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

  let viewer = null;
  let primaryBearing = 0;
  let currentIndex = 0;
  let sensorsAllowed = false;

  function init() {
    [$('festivalSelect'), $('festivalSwitch')].forEach((sel) => {
      if (!sel) return;
      sel.innerHTML = FESTIVALS.map((f, i) => `<option value="${i}">${f.name}</option>`).join('');
    });
    $('festivalSelect').addEventListener('change', (e) => updateOverlaySubtitle(+e.target.value));
    $('festivalSwitch').addEventListener('change', (e) => selectFestival(+e.target.value));
    $('startBtn').addEventListener('click', openPermModal, { once: true });
    $('permAllow').addEventListener('click', () => startApp(true));
    $('permDeny').addEventListener('click', () => startApp(false));
    updateOverlaySubtitle(0);
  }

  function updateOverlaySubtitle(i) {
    $('subtitle').textContent = FESTIVALS[i].subtitle;
  }

  // 日本語の許可説明ダイアログを表示
  function openPermModal() {
    currentIndex = +$('festivalSelect').value || 0;
    $('permModal').classList.add('show');
  }

  // 許可結果を受けて起動。allow=false なら最小限（GPSのみ）で起動。
  async function startApp(allow) {
    $('permModal').classList.remove('show');
    document.body.classList.add('running');

    // 音声（ユーザー操作中に初期化）
    if (window.HanabiAudio) window.HanabiAudio.init();

    if (allow) {
      await startCamera();
      await requestOrientationPermission();
      sensorsAllowed = true;
    }

    // 現在地（GPS）
    try {
      viewer = await Geo.getCurrentPosition();
      setStatus(`現在地を取得しました（精度±${Math.round(viewer.accuracy)}m）`);
    } catch (e) {
      viewer = { lat: FALLBACK_VIEW.lat, lng: FALLBACK_VIEW.lng };
      setStatus(`GPSを取得できないため${FALLBACK_VIEW.label}から表示します。`, true);
    }

    selectFestival(currentIndex);

    if (sensorsAllowed) {
      $('world').components['north-align'].enableCompass();   // 方角合わせ
      document.querySelector('[camera]').components['gyro-look'].enable(); // ジャイロ見回し
    } else {
      setStatus('センサー未許可のため、見回し・方角合わせは無効です。', true);
    }

    startFacingLoop();
  }

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
    $('world').components['direction-guide'].set({
      name: fest.name,
      distanceText: '距離 ' + fmtDist(primaryDist),
      bearingDeg: primaryBearing,
    });
  }

  // 方位表示（今向いている方角／花火の方角）を定期更新
  function startFacingLoop() {
    const el = $('facing');
    setInterval(() => {
      const na = $('world').components['north-align'];
      const h = na ? na.heading : null;
      const fire = `花火 ${compass8(primaryBearing)}`;
      if (h == null) {
        el.textContent = `🧭 方位センサー未取得 ｜ ${fire}`;
      } else {
        el.textContent = `🧭 向き ${compass8(h)} ｜ ${fire}`;
      }
    }, 200);
  }

  function setStatus(msg, warn) {
    const el = $('status');
    el.textContent = msg;
    el.classList.toggle('warn', !!warn);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
