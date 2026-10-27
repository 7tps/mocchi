import type { ContentExercise, ExampleSentence, JlptBand } from '@jc/shared-types';

/** Short reading passages (original content written for this project). */
export interface ReadingEntry {
  id: string;
  title: string;
  titleEn: string;
  jlpt: JlptBand;
  difficulty: number;
  passage: ExampleSentence;
  questions: ContentExercise[];
}

const q = (id: string, question: string, answer: string, distractors: string[], explanation: string): ContentExercise => ({
  id,
  kind: 'comprehension',
  prompt: '',
  question,
  answer,
  distractors,
  explanation,
});

export const READINGS: ReadingEntry[] = [
  {
    id: 'morning',
    titleEn: 'My morning',
    title: '私の朝',
    jlpt: 'N5',
    difficulty: 2.2,
    passage: {
      ja: '私は毎朝六時に起きます。シャワーを浴びて、朝ご飯を食べます。朝ご飯はいつもパンとコーヒーです。七時半に家を出て、電車で会社に行きます。',
      reading: 'わたしはまいあさろくじにおきます。シャワーをあびて、あさごはんをたべます。あさごはんはいつもパンとコーヒーです。しちじはんにいえをでて、でんしゃでかいしゃにいきます。',
      en: 'I get up at six every morning. I take a shower and eat breakfast. Breakfast is always bread and coffee. I leave home at seven-thirty and go to the office by train.',
    },
    questions: [
      q('morning-1', 'What does the writer usually eat for breakfast?', 'Bread and coffee', ['Rice and tea', 'Eggs and milk', 'Nothing'], 'あさごはんはいつもパンとコーヒーです.'),
      q('morning-2', 'How does the writer get to work?', 'By train', ['By bus', 'On foot', 'By car'], 'でんしゃでかいしゃにいきます — 電車で means by train.'),
    ],
  },
  {
    id: 'weekend',
    titleEn: 'The weekend',
    title: '週末',
    jlpt: 'N5',
    difficulty: 2.6,
    passage: {
      ja: '先週の土曜日、友達と海へ行きました。天気がよくて、とても暑かったです。海で泳いで、魚を食べました。日曜日は家で休みました。',
      reading: 'せんしゅうのどようび、ともだちとうみへいきました。てんきがよくて、とてもあつかったです。うみでおよいで、さかなをたべました。にちようびはいえでやすみました。',
      en: 'Last Saturday I went to the sea with a friend. The weather was good and it was very hot. We swam in the sea and ate fish. On Sunday I rested at home.',
    },
    questions: [
      q('weekend-1', 'What was the weather like on Saturday?', 'Sunny and very hot', ['Rainy and cold', 'Snowy', 'Windy and cool'], 'てんきがよくて、とてもあつかったです.'),
      q('weekend-2', 'What did the writer do on Sunday?', 'Rested at home', ['Went swimming again', 'Went shopping', 'Worked'], 'にちようびはいえでやすみました.'),
    ],
  },
  {
    id: 'room',
    titleEn: 'My room',
    title: '私の部屋',
    jlpt: 'N5',
    difficulty: 2.9,
    passage: {
      ja: '私の部屋は狭いですが、明るいです。窓の近くに机があります。机の上にパソコンと本があります。ベッドの下に猫がいます。',
      reading: 'わたしのへやはせまいですが、あかるいです。まどのちかくにつくえがあります。つくえのうえにパソコンとほんがあります。ベッドのしたにねこがいます。',
      en: 'My room is small but bright. There is a desk near the window. On the desk there is a computer and books. There is a cat under the bed.',
    },
    questions: [
      q('room-1', 'Where is the cat?', 'Under the bed', ['On the desk', 'Near the window', 'Outside'], 'ベッドのしたにねこがいます.'),
      q('room-2', 'How does the writer describe the room?', 'Small but bright', ['Big and dark', 'Small and dark', 'Big and bright'], 'せまいですが、あかるいです.'),
    ],
  },
  {
    id: 'shopping',
    titleEn: 'Shopping',
    title: '買い物',
    jlpt: 'N4',
    difficulty: 3.8,
    passage: {
      ja: '昨日、新しい靴を買いに行きました。最初の店の靴は高すぎたので、買いませんでした。二つ目の店で、安くて軽い靴を見つけました。とても気に入っています。',
      reading: 'きのう、あたらしいくつをかいにいきました。さいしょのみせのくつはたかすぎたので、かいませんでした。ふたつめのみせで、やすくてかるいくつをみつけました。とてもきにいっています。',
      en: "Yesterday I went to buy new shoes. The shoes at the first shop were too expensive, so I didn't buy them. At the second shop I found cheap, light shoes. I really like them.",
    },
    questions: [
      q('shopping-1', "Why didn't the writer buy shoes at the first shop?", 'They were too expensive', ['They were too heavy', 'The shop was closed', 'They were the wrong size'], 'たかすぎたので — because they were too expensive.'),
      q('shopping-2', 'How does the writer feel about the new shoes?', 'Really likes them', ['Regrets buying them', 'Wants to return them', 'Has not worn them'], 'とてもきにいっています = I really like them.'),
    ],
  },
  {
    id: 'study-plan',
    titleEn: 'Studying Japanese',
    title: '日本語の勉強',
    jlpt: 'N4',
    difficulty: 4.4,
    passage: {
      ja: '来年日本へ行くつもりなので、毎日日本語を勉強しています。漢字は覚えにくいですが、アニメを見ながら新しい言葉を覚えるのは楽しいです。もっと話せるようになりたいです。',
      reading: 'らいねんにほんへいくつもりなので、まいにちにほんごをべんきょうしています。かんじはおぼえにくいですが、アニメをみながらあたらしいことばをおぼえるのはたのしいです。もっとはなせるようになりたいです。',
      en: "I plan to go to Japan next year, so I study Japanese every day. Kanji are hard to remember, but learning new words while watching anime is fun. I want to become able to speak more.",
    },
    questions: [
      q('study-1', 'Why does the writer study Japanese every day?', 'They plan to go to Japan next year', ['They have an exam tomorrow', 'Their job requires it', 'They live in Japan now'], 'らいねんにほんへいくつもりなので.'),
      q('study-2', 'What does the writer find difficult?', 'Remembering kanji', ['Watching anime', 'Speaking', 'Grammar'], 'かんじはおぼえにくい — kanji are hard to remember.'),
    ],
  },
  {
    id: 'habit',
    titleEn: 'For my health',
    title: '健康のために',
    jlpt: 'N3',
    difficulty: 5.6,
    passage: {
      ja: '最近、健康のために、できるだけ階段を使うようにしています。エレベーターが嫌いなわけではありませんが、少しでも運動したいからです。おかげで、前より体の調子がいいです。',
      reading: 'さいきん、けんこうのために、できるだけかいだんをつかうようにしています。エレベーターがきらいなわけではありませんが、すこしでもうんどうしたいからです。おかげで、まえよりからだのちょうしがいいです。',
      en: "Recently, for my health, I've been making a point of using the stairs as much as possible. It's not that I dislike elevators — I just want to get even a little exercise. Thanks to that, I feel better than before.",
    },
    questions: [
      q('habit-1', 'Why does the writer use the stairs?', 'To get some exercise', ['Because they hate elevators', 'The elevator is broken', 'To save time'], 'すこしでもうんどうしたいから.'),
      q('habit-2', 'How does the writer feel about elevators?', 'They do not particularly dislike them', ['They are afraid of them', 'They hate them', 'They prefer them'], 'きらいなわけではありません — it is not that they dislike them.'),
    ],
  },
];
