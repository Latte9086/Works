export interface FighterItem {
  id: string;
  name: string;
  kana: string; // ひらがな・検索用エイリアス
}

/**
 * スマブラSP 全ファイターリスト（No.01 マリオ 〜 No.82 ソラ）
 * 現場でのインクリメンタル検索を考慮し、ひらがな読み・略称を含めています。
 */
export const FIGHTER_ITEMS: FighterItem[] = [
  { id: '01', name: 'マリオ', kana: 'まりお mario' },
  { id: '02', name: 'ドンキーコング', kana: 'どんきーこんぐ dk donkey' },
  { id: '03', name: 'リンク', kana: 'りんく link' },
  { id: '04', name: 'サムス', kana: 'さむす samus' },
  { id: '04e', name: 'ダークサムス', kana: 'だーくさむす だむす darksamus' },
  { id: '05', name: 'ヨッシー', kana: 'よっしー yoshi' },
  { id: '06', name: 'カービィ', kana: 'かーびぃ kirby' },
  { id: '07', name: 'フォックス', kana: 'ふぉっくす fox' },
  { id: '08', name: 'ピカチュウ', kana: 'ぴかちゅう pikachu' },
  { id: '09', name: 'ルイージ', kana: 'るいーじ luigi' },
  { id: '10', name: 'ネス', kana: 'ねす ness' },
  { id: '11', name: 'キャプテン・ファルコン', kana: 'きゃぷてんふぁるこん cf falcon' },
  { id: '12', name: 'プリン', kana: 'ぷりん jigglypuff' },
  { id: '13', name: 'ピーチ', kana: 'ぴーち peach' },
  { id: '13e', name: 'デイジー', kana: 'でいじー daisy' },
  { id: '14', name: 'クッパ', kana: 'くっぱ bowser' },
  { id: '15', name: 'アイスクライマー', kana: 'あいすくらいまー あいくら ics iceclimbers' },
  { id: '16', name: 'シーク', kana: 'しーく sheik' },
  { id: '17', name: 'ゼルダ', kana: 'ぜるだ zelda' },
  { id: '18', name: 'ドクターマリオ', kana: 'どくたーまりお どくまり drmario' },
  { id: '19', name: 'ピチュー', kana: 'ぴちゅー pichu' },
  { id: '20', name: 'ファルコ', kana: 'ふぁるこ falco' },
  { id: '21', name: 'マルス', kana: 'まるす marth' },
  { id: '21e', name: 'ルキナ', kana: 'るきな lucina' },
  { id: '22', name: 'こどもリンク', kana: 'こどもりんく こりん younglink' },
  { id: '23', name: 'ガノンドロフ', kana: 'がのんどろふ がのん ganondorf' },
  { id: '24', name: 'ミュウツー', kana: 'みゅうつー mewtwo' },
  { id: '25', name: 'ロイ', kana: 'ろい roy' },
  { id: '25e', name: 'クロム', kana: 'くろむ chrom' },
  { id: '26', name: 'Mr.ゲーム&ウォッチ', kana: 'みすたーげーむあんどおうぉっち げーうぉち gw gameandwatch' },
  { id: '27', name: 'メタナイト', kana: 'めたないと metaknight' },
  { id: '28', name: 'ピット', kana: 'ぴっと pit' },
  { id: '28e', name: 'ブラックピット', kana: 'ぶらっくぴっと ぶらぴ darkpit' },
  { id: '29', name: 'ゼロスーツサムス', kana: 'ぜろすーつさむす ぜろさむ zss zerosuitsamus' },
  { id: '30', name: 'ワリオ', kana: 'わりお wario' },
  { id: '31', name: 'スネーク', kana: 'すねーく snake' },
  { id: '32', name: 'アイク', kana: 'あいく ike' },
  { id: '33-35', name: 'ポケモントレーナー', kana: 'ぽけもんとれーなー ぽけとれ ぜにがめ ふしぎそう りざーどん pt pokemontrainer' },
  { id: '36', name: 'ディディーコング', kana: 'でぃでぃーこんぐ diddy' },
  { id: '37', name: 'リュカ', kana: 'りゅか lucas' },
  { id: '38', name: 'ソニック', kana: 'そにっく sonic' },
  { id: '39', name: 'デデデ', kana: 'ででで dedede' },
  { id: '40', name: 'ピクミン&オリマー', kana: 'ぴくみんあんどおりまー ぴくおり おりまー olimar' },
  { id: '41', name: 'ルカリオ', kana: 'るかりお lucario' },
  { id: '42', name: 'ロボット', kana: 'ろぼっと rob' },
  { id: '43', name: 'トゥーンリンク', kana: 'とぅーんりんく とりん toonlink' },
  { id: '44', name: 'ウルフ', kana: 'うるふ wolf' },
  { id: '45', name: 'むらびと', kana: 'むらびと villager' },
  { id: '46', name: 'ロックマン', kana: 'ろっくまん megaman' },
  { id: '47', name: 'Wii Fit トレーナー', kana: 'うぃーふぃっととれーなー wiifit' },
  { id: '48', name: 'ロゼッタ&チコ', kana: 'ろぜったあんどちこ ろぜちこ rosalina' },
  { id: '49', name: 'リトル・マック', kana: 'りとるまっく まっく littlemac' },
  { id: '50', name: 'ゲッコウガ', kana: 'げっこうが greninja' },
  { id: '51', name: 'Miiファイター (格闘)', kana: 'みーふぁいたー かくとうみー miibrawler' },
  { id: '52', name: 'Miiファイター (剣術)', kana: 'みーふぁいたー けんじゅつみー miiswordfighter' },
  { id: '53', name: 'Miiファイター (射撃)', kana: 'みーふぁいたー しゃげきみー miigunner' },
  { id: '54', name: 'パルテナ', kana: 'ぱるてな palutena' },
  { id: '55', name: 'パックマン', kana: 'ぱっくまん pacman' },
  { id: '56', name: 'ルフレ', kana: 'るふれ robin' },
  { id: '57', name: 'シュルク', kana: 'しゅるく shulk' },
  { id: '58', name: 'クッパJr.', kana: 'くっぱじゅにあ bowserjr' },
  { id: '59', name: 'ダックハント', kana: 'だっくはんと duckhunt' },
  { id: '60', name: 'リュウ', kana: 'りゅう ryu' },
  { id: '60e', name: 'ケン', kana: 'けん ken' },
  { id: '61', name: 'クラウド', kana: 'くらうど cloud' },
  { id: '62', name: 'カムイ', kana: 'かむい corrin' },
  { id: '63', name: 'ベヨネッタ', kana: 'べよねった bayonetta' },
  { id: '64', name: 'インクリング', kana: 'いんくりんぐ inkling' },
  { id: '65', name: 'リドリー', kana: 'りどりー ridley' },
  { id: '66', name: 'シモン', kana: 'しもん simon' },
  { id: '66e', name: 'リヒター', kana: 'りひたー richter' },
  { id: '67', name: 'キングクルール', kana: 'きんぐくるーる くるーる krool' },
  { id: '68', name: 'しずえ', kana: 'しずえ isabelle' },
  { id: '69', name: 'ガオガエン', kana: 'がおがえん incineroar' },
  { id: '70', name: 'パックンフラワー', kana: 'ぱっくんふらわー piranhaplant' },
  { id: '71', name: 'ジョーカー', kana: 'じょーかー joker' },
  { id: '72', name: '勇者', kana: 'ゆうしゃ hero' },
  { id: '73', name: 'バンジョー&カズーイ', kana: 'ばんじょーあんどかずーい ばんかず banjo' },
  { id: '74', name: 'テリー', kana: 'てりー terry' },
  { id: '75', name: 'ベレト / ベレス', kana: 'べれと べれす byleth' },
  { id: '76', name: 'ミェンミェン', kana: 'みぇんみぇん めんめん minmin' },
  { id: '77', name: 'スティーブ / アレックス', kana: 'すてぃーぶ あれっくす steve' },
  { id: '78', name: 'セフィロス', kana: 'せふぃろす sephiroth' },
  { id: '79-80', name: 'ホムラ / ヒカリ', kana: 'ほむら ひかり ほむひか pyra mythra aegis' },
  { id: '81', name: 'カズヤ', kana: 'かずや kazuya' },
  { id: '82', name: 'ソラ', kana: 'そら sora' },
];

export const FIGHTERS: string[] = FIGHTER_ITEMS.map((f) => f.name);

/**
 * 大会主要ステージリスト
 */
export const STAGES: string[] = [
  '終点',
  '戦場',
  '小戦場',
  'ポケモンスタジアム2',
  'すま村',
  '村と街',
  'ホロウバスティオン',
  'カルロスポケモンリーグ',
  'ヨッシーストーリー',
];

/**
 * トーナメントサイド選択肢
 */
export const BRACKET_SIDES = ['Winners', 'Losers'] as const;
export type BracketSide = (typeof BRACKET_SIDES)[number];

/**
 * ラウンド選択肢
 */
export const ROUNDS: string[] = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'Top 64',
  'Top 32',
  'Top 16',
  'Top 8',
  '準々決勝 (QF)',
  '準決勝 (SF)',
  '決勝 (WF / LF)',
  'Grand Finals',
  'Grand Finals Reset',
  'Pool',
  'その他',
];

