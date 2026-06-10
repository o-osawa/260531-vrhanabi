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
 *     開催日は2026年を基準（公式告知がある大会は確定日、未公表は近年実績からの
 *     「（予定）」表記）。年により変動するため最新は各公式で要確認。
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
      { id: 'v1', name: '江戸川河川敷（都立篠崎公園先・市川市民納涼花火と同会場）', lat: 35.71868, lng: 139.90205, shellMix: [3, 3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'koto', region: 'kanto', pref: '東京都', name: '江東花火大会',
    subtitle: '荒川・砂町水辺公園／至近150mで約6千発', date: '2026-08-11', dateLabel: '8月11日',
    venues: [
      { id: 'v1', name: '荒川・砂町水辺公園（葛西橋〜清砂大橋）', lat: 35.66950, lng: 139.84550, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [5, 10, 10],
  },
  {
    id: 'kameido', region: 'kanto', pref: '東京都', kind: 'event', name: '亀戸地区夏まつり 花火',
    subtitle: '亀戸中央公園周辺の納涼花火（夏季の指定日）', date: null, dateLabel: '夏季の指定日',
    venues: [
      { id: 'v1', name: '亀戸中央公園周辺', lat: 35.70250, lng: 139.82650, shellMix: [2, 3, 3, 4] },
    ],
    finaleMix: [3, 4, 5],
  },
  {
    id: 'katsushika', region: 'kanto', pref: '東京都', name: '葛飾納涼花火大会',
    subtitle: '柴又・江戸川河川敷／至近で約1.5万発', date: '2026-07-28', dateLabel: '7月28日',
    venues: [
      { id: 'v1', name: '柴又野球場（江戸川河川敷）', lat: 35.75600, lng: 139.88200, shellMix: [3, 3, 4, 5, 5, 10] },
    ],
    finaleMix: [5, 10, 10],
  },
  {
    id: 'kita', region: 'kanto', pref: '東京都', name: '北区花火会',
    subtitle: '荒川・岩淵水門／花火×ドローン×音楽 約1万発', date: '2026-09-26', dateLabel: '9月下旬（予定）',
    venues: [
      { id: 'v1', name: '荒川河川敷（岩淵水門・赤羽）', lat: 35.78350, lng: 139.72350, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [5, 10, 10],
  },
  {
    id: 'ota', region: 'kanto', pref: '東京都', name: '大田区 平和のつどい（平和祈念花火）',
    subtitle: '多摩川河川敷・約4千発の集中打上', date: '2026-08-28', dateLabel: '8月28日',
    venues: [
      { id: 'v1', name: '多摩川河川敷（西六郷・六郷土手）', lat: 35.53450, lng: 139.70900, shellMix: [3, 4, 5, 5] },
    ],
    finaleMix: [5, 5, 10],
  },
  {
    id: 'adachi', region: 'kanto', pref: '東京都', name: '足立の花火',
    subtitle: '約1.4万発・高密度（近年は5月開催）', date: '2026-05-30', dateLabel: '5月30日',
    venues: [
      { id: 'v1', name: '荒川河川敷（千住側・千住新橋〜西新井橋）', lat: 35.76250, lng: 139.79650, shellMix: [3, 4, 5, 5, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'itabashi', region: 'kanto', pref: '東京都', name: 'いたばし花火大会',
    subtitle: '荒川戸田橋・都内最大級の尺五寸玉', date: '2026-08-01', dateLabel: '8月上旬（予定）',
    venues: [
      { id: 'v1', name: '荒川河川敷（戸田橋緑地付近）', lat: 35.79450, lng: 139.67900, shellMix: [4, 5, 5, 10, 10, 15] },
    ],
    finaleMix: [10, 15, 20],
  },
  {
    id: 'tamagawa', region: 'kanto', pref: '東京都', name: '世田谷区たまがわ花火大会',
    subtitle: '二子玉川・多摩川河川敷', date: '2026-10-03', dateLabel: '10月上旬（予定）',
    venues: [
      { id: 'v1', name: '多摩川河川敷（二子橋付近）', lat: 35.61200, lng: 139.62650, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'jingu', region: 'kanto', pref: '東京都', name: '神宮外苑花火大会',
    subtitle: '都心・神宮第二球場付近', date: '2026-08-08', dateLabel: '8月8日',
    venues: [
      { id: 'v1', name: '明治神宮外苑（神宮球場付近）', lat: 35.67550, lng: 139.71650, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 10],
  },
  {
    id: 'tachikawa', region: 'kanto', pref: '東京都', name: '立川まつり 昭和記念公園花火大会',
    subtitle: '都内最大の一尺五寸玉・約5千発', date: '2026-07-25', dateLabel: '7月下旬（予定）',
    venues: [
      { id: 'v1', name: '国営昭和記念公園 みんなの原っぱ', lat: 35.70450, lng: 139.40700, shellMix: [4, 5, 5, 10, 10, 15] },
    ],
    finaleMix: [10, 15, 15],
  },
  {
    id: 'fuchu', region: 'kanto', pref: '東京都', name: '東京競馬場花火（花火と音楽の祭典）',
    subtitle: 'JRA東京競馬場・音楽連動', date: '2026-07-01', dateLabel: '7月1日',
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
    subtitle: '日本三大花火・競技大会', date: '2026-11-07', dateLabel: '11月7日',
    venues: [
      { id: 'v1', name: '桜川畔（学園大橋付近）', lat: 36.07800, lng: 140.19600, shellMix: [5, 7, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'tonegawa', region: 'kanto', pref: '茨城県', name: '利根川大花火大会（境町）',
    subtitle: '約3万発・国内最大級', date: '2026-09-12', dateLabel: '9月中旬（予定）',
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

  // ============================================================
  // 花火大会ではないが「花火が上がるイベント」（2026年）
  // kind:'event' で区別。リストにバッジ表示。
  // ============================================================
  {
    id: 'starisland', region: 'kanto', pref: '東京都', kind: 'event',
    name: 'STAR ISLAND 2026', subtitle: '花火×ドローン×音楽の未来型ショー・約1.2万発',
    date: '2026-05-23', dateLabel: '5月23日',
    venues: [
      { id: 'v1', name: 'お台場海浜公園（沖合）', lat: 35.62950, lng: 139.77400, shellMix: [3, 4, 5, 5, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'makuhari', region: 'kanto', pref: '千葉県', kind: 'event',
    name: '幕張ビーチ花火フェスタ', subtitle: '花火×音楽・国内最大級 約2万発',
    date: '2026-08-01', dateLabel: '8月1日',
    venues: [
      { id: 'v1', name: '幕張海浜公園（幕張の浜）', lat: 35.64350, lng: 140.03300, shellMix: [4, 5, 5, 10, 10] },
    ],
    finaleMix: [10, 10, 20],
  },
  {
    id: 'tdl_show', region: 'kanto', pref: '千葉県', kind: 'event',
    name: '東京ディズニーランド 夜のショー花火', subtitle: 'パーク上空の小型花火（実施日のみ）',
    date: null, dateLabel: '実施日のみ',
    venues: [
      { id: 'v1', name: 'シンデレラ城後方（園内）', lat: 35.63270, lng: 139.88130, shellMix: [2, 3, 3, 4] },
    ],
    finaleMix: [3, 4, 4],
  },
  {
    id: 'yomiuri', region: 'kanto', pref: '東京都', kind: 'event',
    name: 'よみうりランド 花火（ナイトショー）', subtitle: '遊園地の音楽連動花火（夏季の指定日）',
    date: null, dateLabel: '夏季の指定日',
    venues: [
      { id: 'v1', name: 'よみうりランド園内', lat: 35.62650, lng: 139.51650, shellMix: [3, 4, 5, 5] },
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
