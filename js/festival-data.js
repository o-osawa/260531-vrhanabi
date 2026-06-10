/*
 * 花火大会の実データ（地域別・複数大会）
 *
 * 構造:
 *   REGIONS  … 地域の一覧（現状は関東のみ。のちに全国・他地方を追加して切替可能）
 *   FESTIVALS… 各大会。region(地域id)・pref(都県)・date(開催日)・venues(打上会場)を持つ
 *   SHELL_SPECS… 号数 → 打上高度・開花直径（メートル）の仕様（全大会共通）
 *
 * 注: walkerplus 等のまとめサイトは直接取得不可のため、開催日・会場は各大会公式／自治体／
 *     Wikipedia 等の一次情報に基づく。打上場所の緯度経度は会場（河川敷・公園・港等）からの
 *     代表点で、数百m程度の誤差を含む概算。号数構成は各大会の特徴に基づく代表値。
 *     開催日は年により変動（直近開催回の告知日を採用、※は実施年を併記）。
 *
 * 出典: 各大会公式・自治体（隅田川/江戸川区/足立区/いたばし/世田谷/立川/JRA/鴻巣市/
 *       境町/土浦市/横浜市）、東京観光公式 GO TOKYO、ウェザーニュース、Wikipedia、
 *       ホームメイト・リサーチ／全国花火データベース（号数仕様）。
 */

/* 号数別スペック表（メートル） */
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
  40: { label: '40号(四尺玉)',   burstHeight: 750, burstDiameter: 750, shellDiameter: 120.0 },
};

/* 地域（リスト/マップの絞り込み・切替に使用）。
 * 先頭が初期選択。データを足せば自動で選択肢が増える設計。 */
const REGIONS = [
  { id: 'kanto', label: '関東' },
  // 例: { id: 'chubu', label: '中部' }, { id: 'kansai', label: '関西' } … を後日追加
];

/* 大会リスト
 * region: 地域id / pref: 都県 / date: ISO(日付順ソート・null=不定) / dateLabel: 表示 */
const FESTIVALS = [
  // ---- 東京都 ----
  {
    id: 'sumida', region: 'kanto', pref: '東京都', name: '隅田川花火大会',
    subtitle: '約2万発・尺玉中心', date: '2026-07-25', dateLabel: '7月25日',
    venues: [
      { id: 'v1', name: '第一会場（桜橋〜言問橋）', lat: 35.71700, lng: 139.80450, shellMix: [3, 3, 4, 5, 5, 10] },
      { id: 'v2', name: '第二会場（駒形橋〜厩橋）', lat: 35.71050, lng: 139.79650, shellMix: [3, 4, 5, 5, 10, 10, 20] },
    ],
    finaleMix: [10, 10, 20, 30],
  },
  {
    id: 'edogawa', region: 'kanto', pref: '東京都', name: '江戸川区花火大会',
    subtitle: '約1.4万発・5秒1000発', date: '2026-08-01', dateLabel: '8月1日',
    venues: [
      { id: 'v1', name: '江戸川河川敷（都立篠崎公園先）', lat: 35.70900, lng: 139.90300, shellMix: [3, 3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'adachi', region: 'kanto', pref: '東京都', name: '足立の花火',
    subtitle: '約1.4万発・高密度（近年は5月開催）', date: '2025-05-31', dateLabel: '5月31日 ※2025',
    venues: [
      { id: 'v1', name: '荒川河川敷（千住側・千住新橋〜西新井橋）', lat: 35.76250, lng: 139.79650, shellMix: [3, 4, 5, 5, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'itabashi', region: 'kanto', pref: '東京都', name: 'いたばし花火大会',
    subtitle: '荒川戸田橋・都内最大級の尺五寸玉', date: '2025-08-02', dateLabel: '8月2日 ※2025',
    venues: [
      { id: 'v1', name: '荒川河川敷（戸田橋緑地付近）', lat: 35.79450, lng: 139.67900, shellMix: [4, 5, 5, 10, 10, 15] },
    ],
    finaleMix: [10, 15, 20],
  },
  {
    id: 'tamagawa', region: 'kanto', pref: '東京都', name: '世田谷区たまがわ花火大会',
    subtitle: '二子玉川・多摩川河川敷', date: '2025-10-04', dateLabel: '10月4日 ※2025',
    venues: [
      { id: 'v1', name: '多摩川河川敷（二子橋付近）', lat: 35.61200, lng: 139.62650, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'jingu', region: 'kanto', pref: '東京都', name: '神宮外苑花火大会',
    subtitle: '都心・神宮第二球場付近', date: '2025-08-16', dateLabel: '8月16日 ※2025',
    venues: [
      { id: 'v1', name: '明治神宮外苑（神宮球場付近）', lat: 35.67550, lng: 139.71650, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 10],
  },
  {
    id: 'tachikawa', region: 'kanto', pref: '東京都', name: '立川まつり 昭和記念公園花火大会',
    subtitle: '都内最大の一尺五寸玉・約5千発', date: '2025-07-26', dateLabel: '7月26日 ※2025',
    venues: [
      { id: 'v1', name: '国営昭和記念公園 みんなの原っぱ', lat: 35.70450, lng: 139.40700, shellMix: [4, 5, 5, 10, 10, 15] },
    ],
    finaleMix: [10, 15, 15],
  },
  {
    id: 'fuchu', region: 'kanto', pref: '東京都', name: '東京競馬場花火（花火と音楽の祭典）',
    subtitle: 'JRA東京競馬場・音楽連動', date: '2025-07-02', dateLabel: '7月2日 ※2025',
    venues: [
      { id: 'v1', name: 'JRA東京競馬場', lat: 35.66650, lng: 139.48500, shellMix: [4, 5, 5, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'disney', region: 'kanto', pref: '千葉県', name: '東京ディズニーランド花火',
    subtitle: '園内・低空の小型花火（ほぼ毎晩）', date: null, dateLabel: 'ほぼ毎晩',
    venues: [
      { id: 'v1', name: 'トムソーヤ島付近（園内北側）', lat: 35.63400, lng: 139.88100, shellMix: [2, 3, 3, 4] },
    ],
    finaleMix: [3, 4, 4, 5],
  },
  // ---- 埼玉県 ----
  {
    id: 'kounosu', region: 'kanto', pref: '埼玉県', name: 'こうのす花火大会',
    subtitle: '世界最大級・四尺玉', date: '2026-10-10', dateLabel: '10月10日',
    venues: [
      { id: 'v1', name: '荒川河川敷（糠田運動場先）', lat: 36.05650, lng: 139.50750, shellMix: [5, 10, 10, 15, 20] },
    ],
    finaleMix: [20, 30, 40],
  },
  // ---- 茨城県 ----
  {
    id: 'tsuchiura', region: 'kanto', pref: '茨城県', name: '土浦全国花火競技大会',
    subtitle: '日本三大花火・競技大会', date: '2025-11-01', dateLabel: '11月1日 ※2025',
    venues: [
      { id: 'v1', name: '桜川畔（学園大橋付近）', lat: 36.07800, lng: 140.19600, shellMix: [5, 7, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'tonegawa', region: 'kanto', pref: '茨城県', name: '利根川大花火大会（境町）',
    subtitle: '約3万発・国内最大級', date: '2025-09-13', dateLabel: '9月13日 ※2025',
    venues: [
      { id: 'v1', name: '利根川河川敷（境町宮本町）', lat: 36.10700, lng: 139.79200, shellMix: [4, 5, 7, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  // ---- 神奈川県 ----
  {
    id: 'yokohama', region: 'kanto', pref: '神奈川県', name: '横浜ナイトフラワーズ（旧スパークリング）',
    subtitle: '横浜港・週末の短時間花火', date: null, dateLabel: '週末中心',
    venues: [
      { id: 'v1', name: '新港ふ頭沖（みなとみらい）', lat: 35.45400, lng: 139.64300, shellMix: [3, 4, 5, 5] },
    ],
    finaleMix: [5, 5, 10],
  },
];

if (typeof window !== 'undefined') {
  window.SHELL_SPECS = SHELL_SPECS;
  window.REGIONS = REGIONS;
  window.FESTIVALS = FESTIVALS;
  window.FESTIVAL = FESTIVALS[0]; // 後方互換
}
