import type { ContentExercise, JlptBand } from '@jc/shared-types';

/** Particle drills (original content written for this project). */
export interface ParticleEntry {
  id: string;
  particle: string;
  reading: string;
  meaning: string;
  jlpt: JlptBand;
  difficulty: number;
  notes: string;
  drills: ContentExercise[];
}

const drill = (
  id: string,
  prompt: string,
  promptEn: string,
  answer: string,
  distractors: string[],
  explanation: string,
): ContentExercise => ({ id, kind: 'fill-blank', prompt, promptEn, answer, distractors, explanation });

export const PARTICLES: ParticleEntry[] = [
  {
    id: 'wa', particle: 'は', reading: 'わ', meaning: 'topic marker', jlpt: 'N5', difficulty: 1.2,
    notes: 'Marks what the sentence is about. Pronounced "wa".',
    drills: [
      drill('p-wa-1', '今日＿＿暑いです。', "It's hot today.", 'は', ['を', 'へ', 'で'], 'は sets "today" as the topic.'),
      drill('p-wa-2', 'この本＿＿面白いです。', 'This book is interesting.', 'は', ['を', 'に', 'へ'], 'The book is the topic being described.'),
      drill('p-wa-3', '肉は好きですが、魚＿＿好きじゃないです。', "I like meat, but I don't like fish.", 'は', ['を', 'に', 'で'], 'は can contrast two things.'),
    ],
  },
  {
    id: 'ga', particle: 'が', reading: 'が', meaning: 'subject marker', jlpt: 'N5', difficulty: 1.8,
    notes: 'Marks the subject, new information, or the object of 好き/分かる/ある.',
    drills: [
      drill('p-ga-1', '公園に子供＿＿います。', 'There are children in the park.', 'が', ['を', 'で', 'へ'], 'With いる/ある, the thing that exists takes が.'),
      drill('p-ga-2', '誰＿＿来ましたか。', 'Who came?', 'が', ['は', 'を', 'に'], 'Question words as subjects take が, never は.'),
      drill('p-ga-3', '私は日本語＿＿分かります。', 'I understand Japanese.', 'が', ['を', 'で', 'へ'], '分かる marks what is understood with が.'),
    ],
  },
  {
    id: 'wo', particle: 'を', reading: 'を', meaning: 'direct object marker', jlpt: 'N5', difficulty: 1.4,
    notes: 'Marks the object of an action, or the space moved through. Pronounced "o".',
    drills: [
      drill('p-wo-1', '毎朝コーヒー＿＿飲みます。', 'I drink coffee every morning.', 'を', ['が', 'に', 'で'], 'Coffee is the direct object of 飲む.'),
      drill('p-wo-2', '公園＿＿散歩しました。', 'I took a walk through the park.', 'を', ['に', 'へ', 'が'], 'を marks the space you move through.'),
      drill('p-wo-3', '八時に家＿＿出ます。', 'I leave home at eight.', 'を', ['に', 'へ', 'が'], '出る takes を for the place you leave.'),
    ],
  },
  {
    id: 'ni', particle: 'に', reading: 'に', meaning: 'time, destination, location of existence, indirect object', jlpt: 'N5', difficulty: 2.2,
    notes: 'Points at a target: a time, a destination, where something exists, or a recipient.',
    drills: [
      drill('p-ni-1', '七時＿＿起きます。', 'I get up at seven.', 'に', ['で', 'を', 'が'], 'Specific clock times take に.'),
      drill('p-ni-2', '机の上＿＿猫がいます。', 'There is a cat on the desk.', 'に', ['で', 'を', 'へ'], 'The location of existence takes に.'),
      drill('p-ni-3', '友達＿＿手紙を書きました。', 'I wrote a letter to a friend.', 'に', ['を', 'が', 'で'], 'The recipient takes に.'),
      drill('p-ni-4', 'バス＿＿乗ります。', 'I get on the bus.', 'に', ['を', 'で', 'が'], '乗る marks the vehicle with に.'),
    ],
  },
  {
    id: 'de', particle: 'で', reading: 'で', meaning: 'location of action, means', jlpt: 'N5', difficulty: 2.3,
    notes: 'Where an action happens, or the tool/means used.',
    drills: [
      drill('p-de-1', '図書館＿＿勉強します。', 'I study at the library.', 'で', ['に', 'を', 'へ'], 'Actions happen で a place.'),
      drill('p-de-2', '電車＿＿会社に行きます。', 'I go to the office by train.', 'で', ['に', 'を', 'が'], 'Means of transport takes で.'),
      drill('p-de-3', 'はし＿＿ご飯を食べます。', 'I eat rice with chopsticks.', 'で', ['を', 'に', 'と'], 'The tool used takes で.'),
    ],
  },
  {
    id: 'he', particle: 'へ', reading: 'え', meaning: 'direction', jlpt: 'N5', difficulty: 2.0,
    notes: 'Direction of movement. Pronounced "e". Often interchangeable with に for destinations.',
    drills: [
      drill('p-he-1', '来週、大阪＿＿行きます。', "I'm going to Osaka next week.", 'へ', ['を', 'で', 'が'], 'へ marks the direction of movement (に is also fine here).'),
    ],
  },
  {
    id: 'to', particle: 'と', reading: 'と', meaning: 'and (complete list), with', jlpt: 'N5', difficulty: 1.9,
    notes: 'Joins nouns exhaustively, or marks a companion.',
    drills: [
      drill('p-to-1', '友達＿＿映画を見ました。', 'I watched a movie with a friend.', 'と', ['を', 'に', 'が'], 'と marks who you do something with.'),
      drill('p-to-2', 'パン＿＿牛乳を買いました。', 'I bought bread and milk.', 'と', ['や', 'を', 'も'], 'と lists items completely: bread and milk (only).'),
    ],
  },
  {
    id: 'ya', particle: 'や', reading: 'や', meaning: 'and (partial list)', jlpt: 'N5', difficulty: 2.8,
    notes: 'Lists examples, implying there are others: "things like A and B".',
    drills: [
      drill('p-ya-1', 'かばんの中に本＿＿ペンなどがあります。', 'In my bag there are books, pens and so on.', 'や', ['を', 'に', 'で'], 'や gives a non-exhaustive list, often with など.'),
    ],
  },
  {
    id: 'kara-made', particle: 'から / まで', reading: 'から / まで', meaning: 'from / until, to', jlpt: 'N5', difficulty: 2.4,
    notes: 'Starting and ending points in time or space.',
    drills: [
      drill('p-kara-1', '授業は九時＿＿始まります。', 'Class starts from nine.', 'から', ['まで', 'に', 'を'], 'から marks a starting point.'),
      drill('p-made-1', '駅＿＿歩きます。', 'I walk to the station.', 'まで', ['から', 'を', 'が'], 'まで marks how far you go.'),
    ],
  },
  {
    id: 'mo', particle: 'も', reading: 'も', meaning: 'also, too', jlpt: 'N5', difficulty: 1.7,
    notes: 'Replaces は, が or を to mean "also".',
    drills: [
      drill('p-mo-1', '私＿＿行きたいです。', 'I want to go too.', 'も', ['を', 'に', 'で'], 'も = me too.'),
    ],
  },
  {
    id: 'no', particle: 'の', reading: 'の', meaning: 'possessive, connective', jlpt: 'N5', difficulty: 1.3,
    notes: 'Links nouns: owner の thing, category の noun.',
    drills: [
      drill('p-no-1', '先生＿＿車は赤いです。', "The teacher's car is red.", 'の', ['は', 'が', 'を'], 'の shows possession.'),
    ],
  },
  {
    id: 'yo-ne', particle: 'よ / ね', reading: 'よ / ね', meaning: 'sentence-final: assertion / agreement', jlpt: 'N5', difficulty: 2.6,
    notes: 'よ tells the listener something new; ね seeks agreement.',
    drills: [
      drill('p-ne-1', '今日はいい天気です＿＿。', "Nice weather today, isn't it?", 'ね', ['よ', 'か', 'を'], 'ね invites agreement about shared information.'),
      drill('p-yo-1', 'あ、電車が来ました＿＿！', 'Hey, the train is here!', 'よ', ['ね', 'を', 'に'], 'よ informs the listener of something they may not know.'),
    ],
  },
];
