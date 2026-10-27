/**
 * Why each wrong option is wrong (original content written for this project).
 * Particles are explained from PARTICLE_ROLES; everything else is written per
 * exercise as { exerciseId: { distractor: note } }.
 */

export const PARTICLE_ROLES: Record<string, string> = {
  は: 'は marks the topic — what the sentence is about.',
  が: 'が marks the subject, or the object of words like 好き, 分かる and ある/いる.',
  を: 'を marks the direct object of an action, or a place you move through.',
  に: 'に points at a target: a time, a destination, where something exists, or a recipient.',
  で: 'で marks where an action happens, or the tool or means used.',
  へ: 'へ marks the direction you move toward.',
  と: 'と means "with" (a companion) or "and" in a complete list.',
  や: 'や lists examples: "A, B and so on".',
  の: 'の links two nouns: "X\'s Y".',
  も: 'も means "also, too".',
  から: 'から means "from" (a starting point) or "because".',
  まで: 'まで means "until" or "as far as".',
  より: 'より means "than" in comparisons.',
  よ: 'よ tells the listener something they may not know.',
  ね: 'ね asks for agreement about something you both know.',
  か: 'か turns a sentence into a question.',
};

export const WHY_NOT: Record<string, Record<string, string>> = {
  'wa-desu-3': {
    'あれを猫です。': 'を marks the object of an action; an "X is Y" sentence needs the topic particle は.',
    'あれは猫ます。': 'ます attaches to verb stems; after a noun, use です.',
    '猫はあれをです。': 'The topic (あれ) comes first with は, then 猫です; を has no place here.',
  },
  'no-2': {
    '車の友達': 'This means "the car\'s friend": the owner comes before の.',
    '友達は車': 'は makes 友達 the topic ("as for my friend, a car"); it doesn\'t show possession.',
    '友達を車': 'を marks a direct object; it can\'t link two nouns.',
  },
  'mo-2': {
    'お茶をも飲みます。': 'も replaces を; the two are not used together.',
    'お茶もを飲みます。': 'も replaces を; stacking them is ungrammatical.',
    'お茶はも飲みます。': 'も replaces は as well; は and も don\'t combine.',
  },
  'masu-1': {
    'ました': 'ました is past tense, but 明日 (tomorrow) is in the future.',
    'ません': 'ません is negative: "I won\'t watch a movie."',
    'ましょう': 'ましょう means "let\'s…" — an invitation, not a statement of plans.',
  },
  'masu-2': {
    'ます': 'ます is affirmative: "I drink alcohol."',
    'ました': 'ました is past: "I drank alcohol."',
    'たい': '飲みたい means "want to drink" — the opposite of the meaning here.',
  },
  'mashita-1': {
    'ます': 'ます is present/future, but 先週 (last week) needs the past.',
    'ません': 'ません is present negative; it can\'t describe last week.',
    'ましょう': 'ましょう means "let\'s…", which can\'t describe last week.',
  },
  'mashita-2': {
    '昨日は勉強しませんました。': '"ませんました" isn\'t a form; the polite past negative is ませんでした.',
    '昨日は勉強しました。': 'This is affirmative: "I studied yesterday."',
    '昨日は勉強しません。': 'This is present/future negative; it can\'t describe yesterday.',
  },
  'aru-1': {
    'あります': 'あります is for inanimate things; a dog is alive, so use います.',
    'です': 'です links a topic to a description; it doesn\'t say something exists at a place.',
    'します': 'します means "do", not "there is".',
  },
  'aru-2': {
    'います': 'います is for people and animals; a bank is inanimate.',
    'です': 'です doesn\'t say something exists at a place; use あります.',
    'なります': 'なります means "become".',
  },
  'tai-1': {
    'ます': '飲みます means "I drink", and ます can\'t be followed by です.',
    'たく': 'たく is only used before ない (たくない); it can\'t end the phrase before です.',
    'ない': 'ない attaches to the negative stem (飲まない), not the ます-stem.',
  },
  'tai-2': {
    '行きたいないです。': 'たい conjugates like an い-adjective: drop い and add くない → たくない.',
    '行きないたいです。': '"ないたい" is not a valid combination.',
    '行かたいです。': 'たい attaches to the ます-stem (行き), not the negative stem (行か).',
  },
  'tekudasai-1': {
    '開ける': 'ください needs the て-form, not the dictionary form.',
    '開けた': 'The た-form is past; requests use the て-form.',
    '開けない': '"Please don\'t" would be 開けないでください; 開けないください is ungrammatical.',
  },
  'naide-1': {
    'なくて': 'なくて means "not … and/so"; negative requests use ないで.',
    'て': 'してください means "please do" — the opposite.',
    'ない': 'ない needs で before ください: しないでください.',
  },
  'naide-2': {
    'これを食べなくてください。': 'なくて isn\'t used for requests; use ないで.',
    'これを食べてないください。': 'てない means "haven\'t done"; it can\'t take ください.',
    'これを食べないください。': 'で is missing: 食べないでください.',
  },
  'teiru-1': {
    'あります': 'てある describes a state someone set up on purpose; an ongoing action uses ている.',
    'です': 'The て-form can\'t be followed by です.',
    'みます': '見てみます means "try watching", not "is watching".',
  },
  'teiru-2': {
    'その人を知ります。': '知る describes a state: "I know" is 知っています, not 知ります.',
    'その人を知るです。': 'A verb can\'t be followed directly by です.',
    'その人を知っていません。': 'This is negative — and unnatural: "I don\'t know" is 知りません.',
  },
  'mashou-1': {
    'ました': 'ました is past: "I rested a little."',
    'ません': 'ません is negative: "I won\'t rest."',
    'たい': 'たい means "I want to", not "let\'s".',
  },
  'mashou-2': {
    'ます': '飲みますか asks "Will you drink?" — a question, not an invitation.',
    'ました': '飲みましたか asks "Did you drink?"',
    'たい': '飲みたいか bluntly asks "Do you want to drink?" — too direct to be an invitation.',
  },
  'suki-2': {
    '妹は猫を好きます。': '好き is a な-adjective, not a verb: it takes です, and the thing liked takes が.',
    '妹が猫は好きます。': 'The particles are swapped, and 好き can\'t take ます.',
    '妹は猫に好きです。': 'に doesn\'t mark the thing liked; use が.',
  },
  'yori-1': {
    'から': 'から means "from" or "because", not "than".',
    'まで': 'まで means "until".',
    'ほう': 'ほう ("side") goes after the preferred thing, with の: 冬のほうが.',
  },
  'yori-2': {
    '東京より大阪のほうが大きいです。': 'This says Osaka is bigger than Tokyo.',
    '大阪から東京のほうが大きいです。': 'から means "from", not "than".',
    '大阪より東京はほうが大きいです。': 'ほう must follow の: 東京のほうが.',
  },
  'kara-1': {
    'けど': 'けど means "but": "It\'s hot, but I\'ll open the window" doesn\'t make sense.',
  },
  'maeni-1': {
    '食べた': '前に always takes the dictionary form, even about the past.',
    '食べて': 'The て-form can\'t attach to 前に.',
    '食べない': '前に takes the dictionary form; 食べない前に isn\'t used.',
  },
  'maeni-2': {
    'する': '後で takes the た-form (した), not the dictionary form.',
    'して': 'The て-form can\'t attach to 後で; use the た-form.',
    'しない': 'しない後で isn\'t grammatical.',
  },
  'temoii-2': {
    '帰ってはいいです。': 'Permission is てもいい, not てはいい.',
    '帰るもいいです。': 'Permission needs the て-form: 帰っても.',
    '帰ってもいけません。': 'いけません means "must not" — the opposite.',
  },
  'tewa-2': {
    'ここで走ってもいいです。': 'This gives permission: "You may run here."',
    'ここで走るはいけません。': 'The prohibition needs the て-form: 走っては.',
    'ここで走ってはいます。': 'This means "is running", not "must not run".',
  },
  'takoto-1': {
    '行く': 'Dictionary form + ことがある means "there are times when I go", not "have been".',
    '行って': 'The て-form can\'t attach to こと.',
    '行き': 'The ます-stem can\'t attach to こと.',
  },
  'tsumori-1': {
    '休んで': 'つもり follows the dictionary form, not the て-form.',
    '休みます': 'Politeness goes on です at the end, not before つもり.',
    '休んだ': '休んだつもり means "I thought I had rested" — a different pattern.',
  },
  'nakereba-1': {
    'なくて': 'This would need は: しなくてはなりません. Without it, the sentence is broken.',
    'ないで': 'ないで means "without doing"; it doesn\'t express "must".',
    'たら': 'したら means "if/when I do".',
  },
  'nakereba-2': {
    '病院に行きなければなりません。': 'なければ attaches to the negative stem (行か), not the ます-stem (行き).',
    '病院に行かないければなりません。': 'Drop the い of ない first: 行かなければ.',
    '病院に行かなくてなりません。': 'This is missing は: 行かなくてはなりません.',
  },
  'omou-1': {
    'です': 'と思う takes the plain form, so use だ, not です.',
    'の': 'の can\'t come before と思う.',
    'な': 'な joins な-adjectives to nouns; before と思う, use だ.',
  },
  'nagara-1': {
    'たら': '見たら means "after/if I watch" — not doing both at once.',
    'ても': '見ても means "even if I watch".',
    'から': 'から follows the plain form (見るから, "because I watch"); 見から isn\'t a word.',
  },
  'kamo-1': {
    '彼は遅れるだかもしれません。': 'No だ before かもしれない.',
    '彼は遅れてかもしれません。': 'かもしれない follows the plain form, not the て-form.',
    '彼は遅れますかもしれない。': 'Use the plain form (遅れる) before かもしれない.',
  },
  'tara-1': {
    'あるたら': 'たら attaches to the た-form: あった → あったら.',
    'あって': 'The て-form means "there is and…", not "if".',
    'あれ': 'あれ is "that (over there)"; the conditional would be あれば.',
  },
  'tara-2': {
    'ても': '安くても means "even if it\'s cheap".',
    'ながら': 'ながら follows verb stems, not adjectives.',
    'から': '安かったから means "because it was cheap".',
  },
  'sugiru-1': {
    '辛い': 'Drop the い before すぎる.',
    '辛く': 'すぎる attaches to the bare stem (辛), not the く-form.',
    '辛くて': 'The て-form can\'t take すぎる.',
  },
  'yasui-1': {
    'にくい': 'にくい means "hard to" — but big letters make it easy.',
    'たい': '読みたい means "want to read".',
    'すぎ': 'すぎ needs る or ます (読みすぎる, "read too much").',
  },
  'hougaii-1': {
    '飲む': 'Advice to someone normally uses the た-form: 飲んだほうがいい.',
    '飲んで': 'The て-form can\'t attach to ほう.',
    '飲み': 'The ます-stem can\'t attach to ほう.',
  },
  'sou-1': {
    'よう': 'ようだ follows the full adjective (重いようです), not the stem.',
    'らしい': 'らしい follows the full adjective (重いらしい) and means "apparently / I hear".',
    'みたい': 'みたい follows the full adjective (重いみたい).',
  },
  'sou-2': {
    'い': 'いそう isn\'t a word; いい becomes よさ before そう.',
    'いい': 'いいそうです means "I hear it\'s good"; "looks good" is よさそう.',
    'よい': 'よいそうです also means "I hear it\'s good"; "looks good" is よさそう.',
  },
  'node-1': {
    'だ': 'だ changes to な before ので.',
    'の': '日曜日のので isn\'t grammatical.',
    'で': 'でので isn\'t grammatical; nouns take なので.',
  },
  'younisuru-1': {
    'ために': 'ために means "in order to"; it doesn\'t form "make a habit of".',
    'そうに': 'そうに means "looking like", not an effort.',
    'までに': 'までに means "by (a deadline)".',
  },
  'younisuru-2': {
    '毎日歩くようになっています。': 'ようになる describes a change ("have come to walk"), not an effort.',
    '毎日歩いたようにしています。': 'ようにする takes the dictionary or ない-form, not the た-form.',
    '毎日歩くそうにしています。': 'そう doesn\'t form this pattern.',
  },
  'wake-1': {
    'ことがなく': 'ことがない means "have never", which doesn\'t fit.',
    'ようではなく': 'ようではない means "it doesn\'t seem", not denying a reason.',
    'はずがなく': 'はずがない means "there\'s no way that".',
  },
  'nitotte-1': {
    'のために': 'のために means "for the benefit of" or "in order to".',
    'について': 'について means "about".',
    'によって': 'によって means "by" or "depending on".',
  },
  'bakari-1': {
    'だけ': 'だけ follows the plain form (寝ているだけ); 寝てだけいます isn\'t natural.',
    'しか': 'しか needs a negative verb.',
    'まで': 'まで means "until".',
  },
  'nimokaka-1': {
    'おかげで': 'おかげで means "thanks to" — a good result.',
    'からこそ': 'からこそ means "precisely because".',
    'ばかりに': 'ばかりに means "just because (of something bad)"; it doesn\'t express a contrast.',
  },
  'zaru-1': {
    'ずにすむ': 'ずにすむ means "get by without" — the opposite.',
    'ないわけだ': 'ないわけだ means "that\'s why … not".',
    'ないことはない': 'ないことはない means "it\'s not that I can\'t".',
  },
  'yogi-1': {
    '禁じ得なかった': 'を禁じ得ない means "can\'t help feeling (an emotion)".',
    'もってしても': 'をもってしても means "even with".',
    '皮切りにした': 'を皮切りに means "starting with".',
  },
};

/** Note explaining why `choice` is wrong for an exercise, if one is known. */
export function whyNotFor(exerciseId: string, choice: string): string | undefined {
  const authored = WHY_NOT[exerciseId]?.[choice];
  if (authored) return authored;
  const role = PARTICLE_ROLES[choice];
  return role ? `${role} That isn't the role needed here.` : undefined;
}
