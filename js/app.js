/* global THREE, Geo, FESTIVALS, REGIONS, L */
/*
 * アプリ制御（画面遷移：リスト → マップ → AR）
 *
 *  - リスト画面: 大会を日付順／距離順で並べ替え。各カードの［ARで見る］でAR起動。
 *                ［マップを見る］でマップ画面へ。
 *  - マップ画面: 地図上にピン配置。ピンタップで大会名・日付のポップアップ→［ARで見る］。
 *  - AR画面    : 許可ダイアログ→カメラ/GPS/センサー→選択大会を実方位で表示。
 *                ［≡ 一覧］でリストへ戻る。
 *  - 操作はジャイロのみ。
 */
(function () {
  // 距離計算・地図初期表示用のフォールバック視点（東京駅付近）
  const FALLBACK_VIEW = { lat: 35.6812, lng: 139.7671, label: '東京駅付近' };

  const $ = (id) => document.getElementById(id);
  const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
  const compass8 = (deg) => {
    const full = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
    return full[Math.round(deg / 45) % 8] + `(${Math.round(deg)}°)`;
  };

  let viewer = null;          // 距離計算の基準（GPSがあれば実値、なければフォールバック）
  let gpsViewer = null;       // AR用に取得した実GPS
  let primaryBearing = 0;
  let pendingIndex = 0;       // 許可ダイアログ通過後にARで表示する大会
  let currentIndex = 0;
  let sensorsAllowed = false;
  let sortMode = 'date';
  let regionId = (REGIONS[0] && REGIONS[0].id) || 'kanto';
  let map = null;
  let markers = [];

  function init() {
    // 地域セレクト
    const rsel = $('regionSel');
    rsel.innerHTML = REGIONS.map((r) => `<option value="${r.id}">${r.label}</option>`).join('');
    rsel.value = regionId;
    rsel.addEventListener('change', (e) => { regionId = e.target.value; renderList(); rebuildMap(); });
    // リストのソート切替
    $('sortDate').addEventListener('click', () => setSort('date'));
    $('sortDist').addEventListener('click', () => setSort('dist'));
    // 画面遷移
    $('toMap').addEventListener('click', showMap);
    $('toList').addEventListener('click', showList);
    $('backToList').addEventListener('click', backToList);
    // 許可ダイアログ
    $('permAllow').addEventListener('click', () => startApp(true));
    $('permDeny').addEventListener('click', () => startApp(false));

    // 距離順のために現在地を控えめに取得（拒否でもフォールバックで動く）
    viewer = { lat: FALLBACK_VIEW.lat, lng: FALLBACK_VIEW.lng };
    Geo.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000 })
      .then((p) => { viewer = { lat: p.lat, lng: p.lng }; gpsViewer = p; renderList(); })
      .catch(() => {});

    renderList();
  }

  // ---- リスト画面 ----
  function setSort(mode) {
    sortMode = mode;
    $('sortDate').classList.toggle('active', mode === 'date');
    $('sortDist').classList.toggle('active', mode === 'dist');
    renderList();
  }

  // 大会に距離(最寄り会場)を付与
  function withDistance(f) {
    let best = Infinity;
    f.venues.forEach((v) => {
      const d = Geo.haversine(viewer.lat, viewer.lng, v.lat, v.lng);
      if (d < best) best = d;
    });
    return best;
  }

  function sortedFestivals() {
    const arr = FESTIVALS
      .map((f, i) => ({ f, i, dist: withDistance(f) }))
      .filter((x) => x.f.region === regionId);
    if (sortMode === 'dist') {
      arr.sort((a, b) => a.dist - b.dist);
    } else {
      // 日付順（null=毎晩 は末尾）
      arr.sort((a, b) => {
        if (!a.f.date && !b.f.date) return 0;
        if (!a.f.date) return 1;
        if (!b.f.date) return -1;
        return a.f.date < b.f.date ? -1 : a.f.date > b.f.date ? 1 : 0;
      });
    }
    return arr;
  }

  function renderList() {
    const html = sortedFestivals().map(({ f, i, dist }) => {
      const badge = f.kind === 'event'
        ? '<span class="badge ev">イベント</span>'
        : '<span class="badge">花火大会</span>';
      return `
      <div class="card">
        <div class="meta">
          <div class="nm">${badge}${f.name}</div>
          <div class="dt">📅 ${f.dateLabel}　📍 ${f.pref}・${fmtDist(dist)}</div>
          <div class="ds">${f.subtitle}</div>
        </div>
        <button class="go" data-i="${i}">ARで見る</button>
      </div>`;
    }).join('');
    $('listScroll').innerHTML = html;
    $('listScroll').querySelectorAll('.go').forEach((b) => {
      b.addEventListener('click', () => openPermModal(+b.dataset.i));
    });
  }

  // ---- マップ画面 ----
  function showMap() {
    $('listScreen').classList.remove('show');
    $('mapScreen').classList.add('show');
    setTimeout(initMap, 50); // 表示後にサイズ確定
  }
  function showList() {
    $('mapScreen').classList.remove('show');
    $('listScreen').classList.add('show');
  }

  function initMap() {
    if (map) { map.invalidateSize(); return; }
    map = L.map('map', { zoomControl: true }).setView([viewer.lat, viewer.lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // 現在地マーカー
    L.circleMarker([viewer.lat, viewer.lng], {
      radius: 7, color: '#7fe7ff', fillColor: '#7fe7ff', fillOpacity: .9,
    }).addTo(map).bindPopup('現在地');

    placeMarkers();
  }

  // 選択地域の大会ピンを配置（地域切替・再表示で作り直す）
  function placeMarkers() {
    if (!map) return;
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
    const bounds = [[viewer.lat, viewer.lng]];
    FESTIVALS.forEach((f, i) => {
      if (f.region !== regionId) return;
      const v = f.venues[0];
      const m = L.marker([v.lat, v.lng]).addTo(map);
      const kindLabel = f.kind === 'event' ? '🎆 イベント花火' : '🎇 花火大会';
      const html = `<div class="pop"><div class="nm">${f.name}</div>` +
        `<div class="dt">${kindLabel}<br>📅 ${f.dateLabel}　📍 ${f.pref}</div>` +
        `<button class="go" data-i="${i}">ARで見る</button></div>`;
      m.bindPopup(html);
      m.on('popupopen', (e) => {
        const btn = e.popup.getElement().querySelector('.go');
        if (btn) btn.addEventListener('click', () => openPermModal(+btn.dataset.i));
      });
      markers.push(m);
      bounds.push([v.lat, v.lng]);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  }

  function rebuildMap() {
    if (map) placeMarkers();
  }

  // ---- AR起動 ----
  function openPermModal(index) {
    pendingIndex = index;
    $('permModal').classList.add('show');
  }

  async function startApp(allow) {
    $('permModal').classList.remove('show');
    $('listScreen').classList.remove('show');
    $('mapScreen').classList.remove('show');
    document.body.classList.add('running');

    if (window.HanabiAudio) window.HanabiAudio.init();

    if (allow) {
      await startCamera();
      await requestOrientationPermission();
      sensorsAllowed = true;
    }

    // AR用に高精度GPSを取得（取れなければリストで控えた値→フォールバック）
    try {
      const p = await Geo.getCurrentPosition();
      gpsViewer = p; viewer = { lat: p.lat, lng: p.lng };
      setStatus(`現在地を取得しました（精度±${Math.round(p.accuracy)}m）`);
    } catch (e) {
      if (!gpsViewer) viewer = { lat: FALLBACK_VIEW.lat, lng: FALLBACK_VIEW.lng };
      setStatus(`GPSを取得できないため${gpsViewer ? '前回値' : FALLBACK_VIEW.label}で表示します。`, true);
    }

    selectFestival(pendingIndex);

    if (sensorsAllowed) {
      $('world').components['north-align'].enableCompass();
      document.querySelector('[camera]').components['gyro-look'].enable();
    } else {
      setStatus('センサー未許可のため、見回し・方角合わせは無効です。', true);
    }

    startFacingLoop();
  }

  function backToList() {
    document.body.classList.remove('running');
    // 花火ショーを止める
    const hs = $('world').components['hanabi-show'];
    if (hs) { hs.running = false; hs.clear(); }
    $('listScreen').classList.add('show');
    renderList();
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

    $('world').components['hanabi-show'].setVenues(worldVenues, fest.finaleMix);
    $('world').components['direction-guide'].set({
      name: fest.name,
      distanceText: '距離 ' + fmtDist(primaryDist),
      bearingDeg: primaryBearing,
    });
  }

  function startFacingLoop() {
    if (startFacingLoop._t) return;
    const el = $('facing');
    startFacingLoop._t = setInterval(() => {
      const na = $('world').components['north-align'];
      const h = na ? na.heading : null;
      const fire = `花火 ${compass8(primaryBearing)}`;
      el.textContent = (h == null) ? `🧭 方位センサー未取得 ｜ ${fire}` : `🧭 向き ${compass8(h)} ｜ ${fire}`;
    }, 200);
  }

  function setStatus(msg, warn) {
    const el = $('status');
    el.textContent = msg;
    el.classList.toggle('warn', !!warn);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
