/*
 * 位置・方位の計算ユーティリティ
 *
 * - Geolocation で現在地を取得
 * - Haversine 距離 / 初期方位(bearing) の計算
 * - (方位, 距離, 高度) → A-Frame のワールド3D座標(メートル)への変換
 *
 * 座標系の約束:
 *   1 unit = 1 メートル / カメラ(視点)はワールド原点付近
 *   北 = -Z, 東 = +X, 上 = +Y （A-Frame標準の右手系・Y-up）
 *   方位 bearing は北=0°, 東=90°, 時計回り。
 */

const EARTH_R = 6371000; // 地球半径[m]

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

/* 2点間の距離[m]（Haversine） */
function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* from → to の初期方位[deg]（北=0, 時計回り） */
function bearing(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* 方位・水平距離・高度 → ワールド座標 {x, y, z}[m]
 * 北=-Z, 東=+X として配置。
 */
function geoToWorld(bearingDeg, distanceM, heightM) {
  const θ = toRad(bearingDeg);
  return {
    x: distanceM * Math.sin(θ),
    z: -distanceM * Math.cos(θ),
    y: heightM,
  };
}

/* 開花点の仰角[deg]（視点から見た見上げ角） */
function elevationAngle(distanceM, heightM) {
  return toDeg(Math.atan2(heightM, distanceM));
}

/* 現在地を取得（Promise）。失敗時は reject。 */
function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation 非対応の端末です'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      Object.assign({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, options || {})
    );
  });
}

if (typeof window !== 'undefined') {
  window.Geo = { haversine, bearing, geoToWorld, elevationAngle, getCurrentPosition };
}
