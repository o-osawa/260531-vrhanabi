/*
 * 隅田川花火大会の実データ
 *
 * - 打上場所の緯度経度（実在の座標）
 * - 号数 → 打上高度・開花直径（メートル）の仕様テーブル
 * - 打上プログラム（号数・発数・タイミングのシーケンス）
 *
 * 出典:
 *   号数仕様: ホームメイト・リサーチ / なにわ淀川花火大会 / 全国花火データベース
 *   開催情報: 中央区(令和7年 第48回) / ウォーカープラス
 */

/* 号数別スペック表（メートル）
 * burstHeight: 開花する高度の代表値 [m]
 * burstDiameter: 開花直径の代表値 [m]
 * shellDiameter: 玉の外径 [cm]（参考表示用）
 */
const SHELL_SPECS = {
  2:  { label: '2号',          burstHeight: 55,  burstDiameter: 45,  shellDiameter: 5.6 },
  3:  { label: '3号',          burstHeight: 125, burstDiameter: 65,  shellDiameter: 9.0 },
  4:  { label: '4号',          burstHeight: 160, burstDiameter: 130, shellDiameter: 12.0 },
  5:  { label: '5号',          burstHeight: 190, burstDiameter: 170, shellDiameter: 15.0 },
  7:  { label: '7号',          burstHeight: 250, burstDiameter: 220, shellDiameter: 21.0 },
  10: { label: '10号(尺玉)',   burstHeight: 330, burstDiameter: 320, shellDiameter: 30.0 },
  20: { label: '20号(二尺玉)', burstHeight: 470, burstDiameter: 510, shellDiameter: 60.0 },
  30: { label: '30号(三尺玉)', burstHeight: 600, burstDiameter: 620, shellDiameter: 90.0 },
};

/* 隅田川花火大会
 * 主会場(第二会場相当)の打上場所は実測の緯度経度を使用。
 * 第一会場(桜橋〜言問橋)は概算座標。
 */
const FESTIVAL = {
  name: '隅田川花火大会',
  subtitle: '第48回 (2025/7/26 19:00〜)',
  venues: [
    {
      id: 'venue1',
      name: '第一会場（桜橋〜言問橋）',
      lat: 35.71750,
      lng: 139.80350,
      // この会場で主に上がる号数の構成（重み付き）
      shellMix: [3, 3, 4, 5, 5, 10],
    },
    {
      id: 'venue2',
      name: '第二会場（駒形橋〜厩橋）',
      lat: 35.715685,
      lng: 139.80504,
      shellMix: [3, 4, 5, 5, 10, 10, 20],
    },
  ],
  // フィナーレ用の大玉構成
  finaleMix: [10, 10, 20, 30],
};

if (typeof window !== 'undefined') {
  window.SHELL_SPECS = SHELL_SPECS;
  window.FESTIVAL = FESTIVAL;
}
