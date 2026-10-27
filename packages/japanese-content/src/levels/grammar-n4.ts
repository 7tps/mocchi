import type { LevelGrammar } from '../packs';
import { arrange, choose, ex, fill } from './helpers';

/** N4 grammar for the N4 level pack (original content written for this project). */
export const GRAMMAR_N4: LevelGrammar[] = [
  {
    id: 'n4-ba',
    pattern: '〜ば',
    meaning: 'if (a condition that leads to a result)',
    formation: 'Verb: change the final u-sound to e + ば (行く→行けば, 食べる→食べれば). い-adj: い→ければ. Noun/な-adj: なら.',
    jlpt: 'N4',
    difficulty: 4.1,
    examples: [ex('急げば間に合います。', 'If you hurry, you will make it.'), ex('安ければ買います。', 'If it is cheap, I will buy it.')],
    mistakes: ['ば states a general condition; for a one-off "when X has happened", たら sounds more natural.', 'The past tense never goes before ば.'],
    confusedWith: ['n4-to-natural', 'n4-nara'],
    exercises: [
      fill('n4-ba-1', '安けれ＿＿、買います。', 'If it is cheap, I will buy it.', 'ば', {
        'たら': 'たら attaches to the た-form (安かったら), not to the ければ stem.',
        'て': 'て joins actions in sequence; it doesn’t make a condition.',
        'のに': 'のに means "even though", the opposite of a condition.',
      }, 'い-adjectives drop い and add ければ: 安い → 安ければ.'),
      choose('n4-ba-2', 'Which sentence means "If you study, you will understand"?', '勉強すれば、分かります。', {
        '勉強したば、分かります。': 'ば never follows the past tense; する becomes すれば.',
        '勉強するば、分かります。': 'The dictionary form doesn’t take ば directly; change する to すれ first.',
        '勉強すれて、分かります。': 'すれ is the ば stem; て needs the て-form して.',
      }, 'する → すれば.'),
    ],
  },
  {
    id: 'n4-nara',
    pattern: '〜なら',
    meaning: 'if it is the case that… / as for… (taking up what someone said)',
    formation: 'Noun / な-adj / plain verb + なら',
    jlpt: 'N4',
    difficulty: 4.3,
    examples: [ex('京都に行くなら、春がいいですよ。', 'If you are going to Kyoto, spring is good.'), ex('お酒なら、飲みません。', 'If it is alcohol, I don’t drink it.')],
    mistakes: ['なら often responds to something just said; the advice follows from that situation.'],
    confusedWith: ['n4-ba'],
    exercises: [
      fill('n4-nara-1', '日本に行く＿＿、桜の季節がいいですよ。', 'If you are going to Japan, cherry-blossom season is good.', 'なら', {
        'ので': 'ので gives a reason ("because you are going"), not advice about a possibility.',
        'のに': 'のに means "even though"; it doesn’t set up advice.',
        'ても': 'ても needs the て-form (行っても) and means "even if"; the advice wouldn’t follow.',
      }, 'なら takes up a situation ("if that is your plan") and gives advice about it.'),
      arrange('n4-nara-2', 'If it is coffee, I will drink it.', ['コーヒー', 'なら', '飲みます'], 'Noun + なら, then the result.'),
    ],
  },
  {
    id: 'n4-to-natural',
    pattern: '〜と (natural result)',
    meaning: 'when / whenever X, Y (always) happens',
    formation: 'Plain non-past verb / い-adj + と',
    jlpt: 'N4',
    difficulty: 4.0,
    examples: [ex('春になると、桜が咲きます。', 'When spring comes, the cherry blossoms bloom.'), ex('このボタンを押すと、ドアが開きます。', 'When you press this button, the door opens.')],
    mistakes: ['The result after と cannot be a request, wish or invitation.'],
    confusedWith: ['n4-ba'],
    exercises: [
      fill('n4-to-1', 'まっすぐ行く＿＿、駅があります。', 'If you go straight, there is a station.', 'と', {
        'たら': 'たら needs the た-form (行ったら); 行く + たら is ungrammatical.',
        'ても': 'ても needs the て-form (行っても) and means "even if".',
        'から': 'から gives a reason; "because you go straight, there is a station" makes no sense.',
      }, 'と after the dictionary form shows an automatic result: whenever you go straight, you reach the station.'),
      choose('n4-to-2', 'Which sentence is natural?', '冬になると、雪が降ります。', {
        '冬になると、雪を見てください。': 'と cannot be followed by a request like 〜てください.',
        '冬になったと、雪が降ります。': 'と follows the non-past form: なる, not なった.',
        '冬になるので、雪が降りましょう。': 'ましょう invites someone; snow can’t be invited to fall.',
      }, 'Natural, automatic results use the dictionary form + と.'),
    ],
  },
];
