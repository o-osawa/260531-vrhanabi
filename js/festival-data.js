/*
 * 花火大会の実データ（複数大会・選択式）
 *
 * - 各大会の打上場所（緯度経度）と会場ごとの号数構成
 * - 開催日（リストの日付順・マップのポップアップ表示用）
 * - 号数 → 打上高度・開花直径（メートル）の仕様テーブル（全大会共通）
 *
 * 注: 打上場所の緯度経度・開催日は公開情報からの概算/代表値（年により変動）。
 *     号数構成・規模は各大会の特徴に基づく代表値（演出のため一部簡略化）。
 *
 * 出典: ホームメイト・リサーチ／全国花火データベース（号数仕様）、
 *       ウォーカープラス花火大会／各大会公式・東京観光公式 GO TOKYO、
 *       立川まつり国営昭和記念公園花火大会公式（最大一尺五寸玉=15号）、
 *       Wikipedia「東京ディズニーリゾートの花火の一覧」（打上はトムソーヤ島付近）。
 */

/* 号数別スペック表（メートル）
 * burstHeight: 開花高度の代表値 [m] / burstDiameter: 開花直径の代表値 [m]
 * shellDiameter: 玉の外径 [cm]（参考）
 */
const SHELL_SPECS = {
  2:  { label: '2号',            burstHeight: 55,  burstDiameter: 45,  shellDiameter: 5.6 },
  3:  { label: '3号',            burstHeight: 125, burstDiameter: 65,  shellDiameter: 9.0 },
  4:  { label: '4号',            burstHeight: 160, burstDiameter: 130, shellDiameter: 12.0 },
  5:  { label: '5号',            burstHeight: 190, burstDiameter: 170, shellDiameter: 15.0 },
  7:  { label: '7号',            burstHeight: 250, burstDiameter: 220, shellDiameter: 21.0 },
  10: { label: '10号(尺玉)',     burstHeight: 330, burstDiameter: 320, shellDiameter: 30.0 },
  15: { label: '15号(尺五寸玉)', burstHeight: 410, burstDiameter: 440, shellDiameter: 45.0 },
  20: { label: '20号(二尺玉)',   burstHeight: 470, burstDiameter: 510, shellDiameter: 60.0 },
  30: { label: '30号(三尺玉)',   burstHeight: 600, burstDiameter: 620, shellDiameter: 90.0 },
};

/* 大会リスト
 * date: 開催日(ISO, 日付順ソート用)。毎晩開催のものは null。
 * dateLabel: 表示用の日付。
 */
const FESTIVALS = [
  {
    id: 'sumida', name: '隅田川花火大会', subtitle: '約2万発・尺玉中心',
    date: '2025-07-26', dateLabel: '7月26日',
    venues: [
      { id: 'v1', name: '第一会場（桜橋〜言問橋）', lat: 35.71750, lng: 139.80350, shellMix: [3, 3, 4, 5, 5, 10] },
      { id: 'v2', name: '第二会場（駒形橋〜厩橋）', lat: 35.715685, lng: 139.80504, shellMix: [3, 4, 5, 5, 10, 10, 20] },
    ],
    finaleMix: [10, 10, 20, 30],
  },
  {
    id: 'edogawa', name: '江戸川区花火大会', subtitle: '約1.4万発・5秒1000発',
    date: '2025-08-02', dateLabel: '8月2日',
    venues: [
      { id: 'v1', name: '江戸川河川敷（篠崎公園先）', lat: 35.70850, lng: 139.90250, shellMix: [3, 3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'adachi', name: '足立の花火', subtitle: '荒川河川敷・約1.5万発',
    date: '2025-07-19', dateLabel: '7月19日',
    venues: [
      { id: 'v1', name: '荒川河川敷（千住新橋〜西新井橋）', lat: 35.77600, lng: 139.79650, shellMix: [3, 4, 5, 5, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'itabashi', name: 'いたばし花火大会', subtitle: '荒川戸田橋・尺五寸玉',
    date: '2025-08-02', dateLabel: '8月2日',
    venues: [
      { id: 'v1', name: '荒川河川敷（戸田橋上流）', lat: 35.79400, lng: 139.67800, shellMix: [4, 5, 5, 10, 10, 15] },
    ],
    finaleMix: [10, 15, 20],
  },
  {
    id: 'tamagawa', name: '世田谷区たまがわ花火大会', subtitle: '二子玉川・多摩川河川敷',
    date: '2025-10-04', dateLabel: '10月4日',
    venues: [
      { id: 'v1', name: '多摩川河川敷（二子橋付近）', lat: 35.61250, lng: 139.62700, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'jingu', name: '神宮外苑花火大会', subtitle: '都心・神宮第二球場付近',
    date: '2025-08-16', dateLabel: '8月16日',
    venues: [
      { id: 'v1', name: '明治神宮外苑（神宮球場付近）', lat: 35.67550, lng: 139.71650, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 10],
  },
  {
    id: 'tachikawa', name: '立川まつり 昭和記念公園花火大会', subtitle: '都内最大の一尺五寸玉・約5千発',
    date: '2025-07-26', dateLabel: '7月26日',
    venues: [
      { id: 'v1', name: '国営昭和記念公園 みんなの原っぱ', lat: 35.70550, lng: 139.40900, shellMix: [4, 5, 5, 10, 10, 15] },
    ],
    finaleMix: [10, 15, 15],
  },
  {
    id: 'fuchu', name: '東京競馬場花火', subtitle: 'JRA東京競馬場・音楽連動',
    date: '2025-07-02', dateLabel: '7月2日',
    venues: [
      { id: 'v1', name: 'JRA東京競馬場', lat: 35.66650, lng: 139.48500, shellMix: [4, 5, 5, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'disney', name: '東京ディズニーランド花火', subtitle: '園内・低空の小型花火（ほぼ毎晩）',
    date: null, dateLabel: 'ほぼ毎晩',
    venues: [
      { id: 'v1', name: 'トムソーヤ島付近（園内北側）', lat: 35.63400, lng: 139.88100, shellMix: [2, 3, 3, 4] },
    ],
    finaleMix: [3, 4, 4, 5],
  },
];

if (typeof window !== 'undefined') {
  window.SHELL_SPECS = SHELL_SPECS;
  window.FESTIVALS = FESTIVALS;
  window.FESTIVAL = FESTIVALS[0]; // 後方互換
}
