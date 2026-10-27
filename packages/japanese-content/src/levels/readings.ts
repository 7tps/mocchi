import type { LevelReading } from '../packs';
import { ask, ex } from './helpers';

/** Reading passages for the level packs (original content written for this project). */
export const READINGS_BY_LEVEL: Record<'N4' | 'N3' | 'N2' | 'N1', LevelReading[]> = {
  N4: [
    {
      id: 'n4-moving',
      title: '引っ越し',
      titleEn: 'Moving house',
      jlpt: 'N4',
      difficulty: 4.4,
      passage: ex(
        '先月、会社の近くに引っ越しました。前の家は駅から遠くて、毎朝バスに乗らなければなりませんでした。新しい部屋は狭いですが、駅まで歩いて五分しかかかりません。朝ゆっくり寝られるようになったので、とても満足しています。',
        'Last month I moved near my office. My old home was far from the station, so I had to take a bus every morning. The new room is small, but it only takes five minutes to walk to the station. I am very happy because I can now sleep in a little in the mornings.',
      ),
      questions: [
        ask('n4-moving-1', 'Why is the writer happy with the new room?', 'They can sleep longer in the morning', {
          'The room is very large': 'The passage says the room is small (狭い).',
          'It is close to a bus stop': 'The old home needed a bus; the new one is a short walk to the station.',
          'The rent is cheaper': 'Rent is never mentioned.',
        }, '朝ゆっくり寝られるようになった — they can now sleep in.'),
        ask('n4-moving-2', 'How long does it take to walk to the station now?', 'Five minutes', {
          'Fifteen minutes': 'It says 五分 (five minutes).',
          'Half an hour': 'The walk is only 五分.',
          'They take a bus': 'The bus was for the old home.',
        }, '駅まで歩いて五分.'),
      ],
    },
  ],
  N3: [
    {
      id: 'n3-library',
      title: '町の図書館',
      titleEn: 'The town library',
      jlpt: 'N3',
      difficulty: 5.8,
      passage: ex(
        '私の町の図書館は、去年から夜九時まで開くようになった。以前は六時に閉まっていたため、仕事をしている人はなかなか利用できなかった。時間が延びたおかげで、会社帰りに本を借りる人が増えたそうだ。ただ、職員の数は変わっていないので、職員の負担が大きくなっているという意見もある。',
        'Since last year, my town’s library has stayed open until nine at night. Before, it closed at six, so working people could hardly use it. Thanks to the longer hours, I hear more people borrow books on their way home from work. However, the number of staff hasn’t changed, so some say the burden on staff has grown.',
      ),
      questions: [
        ask('n3-library-1', 'What change did the library make?', 'It stays open later', {
          'It hired more staff': 'The passage says the number of staff has not changed.',
          'It closes at six now': 'Six was the old closing time; now it is nine.',
          'It opened a new branch': 'No new branch is mentioned.',
        }, '夜九時まで開くようになった.'),
        ask('n3-library-2', 'What concern is mentioned?', 'The staff’s workload has increased', {
          'Fewer people borrow books': 'More people borrow books now (増えた).',
          'The library is too noisy': 'Noise is not mentioned.',
          'Books are being lost': 'Lost books are not mentioned.',
        }, '職員の負担が大きくなっている.'),
      ],
    },
  ],
  N2: [
    {
      id: 'n2-remote-work',
      title: '在宅勤務',
      titleEn: 'Working from home',
      jlpt: 'N2',
      difficulty: 7.0,
      passage: ex(
        '在宅勤務が広まりつつある。通勤時間がなくなる上に、自分のペースで仕事ができるため、歓迎する声は多い。しかし、同僚と顔を合わせる機会が減ったことで、ちょっとした相談がしにくくなったと感じる人も少なくない。在宅勤務の良さを生かすには、意識的に会話の場を作ることが欠かせないだろう。',
        'Working from home is spreading. Many welcome it, since there is no commute and you can work at your own pace. However, quite a few people feel it has become harder to ask quick questions because they see colleagues less. To make the most of working from home, deliberately creating chances to talk will be essential.',
      ),
      questions: [
        ask('n2-remote-1', 'What problem does the passage describe?', 'Quick consultations with colleagues have become harder', {
          'The commute has become longer': 'Working from home removes the commute.',
          'People cannot work at their own pace': 'Working at your own pace is listed as an advantage.',
          'Few people want to work from home': 'The passage says many welcome it.',
        }, 'ちょっとした相談がしにくくなった.'),
        ask('n2-remote-2', 'What does the writer suggest?', 'Making a deliberate effort to create chances to talk', {
          'Returning to the office every day': 'The writer wants to keep the benefits of working from home.',
          'Banning working from home': 'The writer doesn’t oppose it.',
          'Working longer hours': 'Working hours aren’t discussed.',
        }, '意識的に会話の場を作ることが欠かせない.'),
      ],
    },
  ],
  N1: [
    {
      id: 'n1-convenience',
      title: '便利さの代償',
      titleEn: 'The price of convenience',
      jlpt: 'N1',
      difficulty: 8.6,
      passage: ex(
        '技術の進歩は私たちの生活を飛躍的に便利にした。指一本で買い物が済み、地図を覚えずとも目的地にたどり着ける。だが、便利さを享受するあまり、自ら考え、工夫する機会を手放してはいないだろうか。道に迷い、人に尋ね、偶然の出会いに恵まれる。そうした回り道こそが、経験を豊かにしてきたはずである。',
        'Technological progress has made our lives dramatically more convenient. Shopping takes a single finger, and we reach destinations without memorising maps. But in enjoying convenience so much, haven’t we given up chances to think and improvise for ourselves? Getting lost, asking people the way, being blessed with chance encounters: it is surely such detours that have enriched our experience.',
      ),
      questions: [
        ask('n1-convenience-1', 'What is the writer’s main concern?', 'We may be losing chances to think for ourselves', {
          'Technology is too expensive': 'Cost is not mentioned.',
          'Maps are becoming inaccurate': 'Map accuracy is not discussed.',
          'Online shopping is unsafe': 'Safety is not discussed.',
        }, '自ら考え、工夫する機会を手放してはいないだろうか.'),
        ask('n1-convenience-2', 'What does the writer value in "detours"?', 'They have enriched our experience', {
          'They save time': 'Detours take more time; that isn’t the point.',
          'They should be avoided': 'The writer praises them.',
          'They are a modern invention': 'The writer describes them as how experience was always enriched.',
        }, '回り道こそが、経験を豊かにしてきた.'),
      ],
    },
  ],
};
