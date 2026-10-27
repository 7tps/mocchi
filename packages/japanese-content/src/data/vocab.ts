/**
 * Curated starter vocabulary (original content written for this project).
 *
 * Line format, one entry per line:
 *   written | reading | meanings (;) | pos | JLPT | tags (,) | example | example reading | example translation | note?
 *
 * POS codes: n noun, pn pronoun, v5 godan verb, v1 ichidan verb, vs suru-verb
 * (noun + する), vk 来る, ai い-adjective, an な-adjective, adv adverb,
 * conj conjunction.
 */
export const VOCAB_SOURCE = String.raw`
私|わたし|I;me|pn|N5|people|私は学生です。|わたしはがくせいです。|I am a student.
あなた|あなた|you|pn|N5|people|あなたの名前は何ですか。|あなたのなまえはなんですか。|What is your name?|Often avoided in conversation; use the person's name instead.
人|ひと|person;people|n|N5|people|あの人は先生です。|あのひとはせんせいです。|That person is a teacher.
男|おとこ|man;male|n|N5|people|男の人が来ました。|おとこのひとがきました。|A man came.
女|おんな|woman;female|n|N5|people|女の子が歌っています。|おんなのこがうたっています。|A girl is singing.
子供|こども|child;children;kid|n|N5|people|子供が公園で遊んでいます。|こどもがこうえんであそんでいます。|The children are playing in the park.
友達|ともだち|friend;friends|n|N5|people|友達と映画を見ました。|ともだちとえいがをみました。|I watched a movie with a friend.
先生|せんせい|teacher;doctor|n|N5|people,school|先生に質問しました。|せんせいにしつもんしました。|I asked the teacher a question.
学生|がくせい|student|n|N5|people,school|兄は大学の学生です。|あにはだいがくのがくせいです。|My older brother is a university student.
みんな|みんな|everyone;everybody|pn|N5|people|みんなで歌いましょう。|みんなでうたいましょう。|Let's all sing together.
名前|なまえ|name|n|N5|people|ここに名前を書いてください。|ここになまえをかいてください。|Please write your name here.
家族|かぞく|family|n|N5|family|家族は四人です。|かぞくはよにんです。|There are four people in my family.
父|ちち|father;dad|n|N5|family|父は銀行で働いています。|ちちはぎんこうではたらいています。|My father works at a bank.|Refers to your own father; use お父さん for someone else's.
母|はは|mother;mom|n|N5|family|母は料理が上手です。|はははりょうりがじょうずです。|My mother is good at cooking.|Refers to your own mother; use お母さん for someone else's.
お父さん|おとうさん|father;dad|n|N5|family|お父さんはどこですか。|おとうさんはどこですか。|Where is your father?|Polite/familiar form; also used to address your own father.
お母さん|おかあさん|mother;mom|n|N5|family|お母さん、ただいま。|おかあさん、ただいま。|Mom, I'm home.|Polite/familiar form; also used to address your own mother.
兄|あに|older brother;big brother|n|N5|family|兄は東京に住んでいます。|あにはとうきょうにすんでいます。|My older brother lives in Tokyo.
姉|あね|older sister;big sister|n|N5|family|姉は医者です。|あねはいしゃです。|My older sister is a doctor.
弟|おとうと|younger brother;little brother|n|N5|family|弟はまだ小さいです。|おとうとはまだちいさいです。|My younger brother is still small.
妹|いもうと|younger sister;little sister|n|N5|family|妹と買い物に行きました。|いもうととかいものにいきました。|I went shopping with my younger sister.
彼|かれ|he;him;boyfriend|pn|N4|people|彼は私の友達です。|かれはわたしのともだちです。|He is my friend.
彼女|かのじょ|she;her;girlfriend|pn|N4|people|彼女はピアノが上手です。|かのじょはピアノがじょうずです。|She is good at piano.
自分|じぶん|oneself;myself|pn|N4|people|自分で作りました。|じぶんでつくりました。|I made it myself.
今日|きょう|today|n|N5|time|今日はいい天気ですね。|きょうはいいてんきですね。|It's nice weather today, isn't it?
明日|あした|tomorrow|n|N5|time|明日、学校に行きます。|あした、がっこうにいきます。|I will go to school tomorrow.
昨日|きのう|yesterday|n|N5|time|昨日は雨でした。|きのうはあめでした。|It was rainy yesterday.
今|いま|now|n|N5|time|今、何時ですか。|いま、なんじですか。|What time is it now?
朝|あさ|morning|n|N5|time|毎朝コーヒーを飲みます。|まいあさコーヒーをのみます。|I drink coffee every morning.
昼|ひる|noon;daytime|n|N5|time|昼にラーメンを食べました。|ひるにラーメンをたべました。|I ate ramen at noon.
夜|よる|night;evening|n|N5|time|夜は静かです。|よるはしずかです。|It is quiet at night.
毎日|まいにち|every day;daily|n|N5|time|毎日日本語を勉強します。|まいにちにほんごをべんきょうします。|I study Japanese every day.
時間|じかん|time;hour|n|N5|time|時間がありません。|じかんがありません。|I don't have time.
今年|ことし|this year|n|N5|time|今年は日本に行きたいです。|ことしはにほんにいきたいです。|I want to go to Japan this year.
来年|らいねん|next year|n|N5|time|来年、大学を卒業します。|らいねん、だいがくをそつぎょうします。|I will graduate from university next year.
去年|きょねん|last year|n|N5|time|去年、京都に行きました。|きょねん、きょうとにいきました。|I went to Kyoto last year.
先週|せんしゅう|last week|n|N5|time|先週は忙しかったです。|せんしゅうはいそがしかったです。|Last week was busy.
来週|らいしゅう|next week|n|N5|time|来週テストがあります。|らいしゅうテストがあります。|There is a test next week.
週末|しゅうまつ|weekend|n|N4|time|週末は何をしますか。|しゅうまつはなにをしますか。|What do you do on the weekend?
午前|ごぜん|morning;a.m.|n|N5|time|午前九時に会いましょう。|ごぜんくじにあいましょう。|Let's meet at 9 a.m.
午後|ごご|afternoon;p.m.|n|N5|time|午後は図書館にいます。|ごごはとしょかんにいます。|I'll be at the library in the afternoon.
休み|やすみ|day off;holiday;rest|n|N5|time|明日は休みです。|あしたはやすみです。|Tomorrow is a day off.
誕生日|たんじょうび|birthday|n|N5|time|誕生日はいつですか。|たんじょうびはいつですか。|When is your birthday?
月曜日|げつようび|Monday|n|N5|time|月曜日は忙しいです。|げつようびはいそがしいです。|Mondays are busy.
金曜日|きんようび|Friday|n|N5|time|金曜日の夜に会いましょう。|きんようびのよるにあいましょう。|Let's meet on Friday night.
日曜日|にちようび|Sunday|n|N5|time|日曜日は家で休みます。|にちようびはいえでやすみます。|I rest at home on Sundays.
春|はる|spring|n|N5|seasons|春に桜が咲きます。|はるにさくらがさきます。|Cherry blossoms bloom in spring.
夏|なつ|summer|n|N5|seasons|夏は海で泳ぎます。|なつはうみでおよぎます。|In summer I swim in the sea.
秋|あき|autumn;fall|n|N5|seasons|秋は涼しくて気持ちがいいです。|あきはすずしくてきもちがいいです。|Autumn is cool and pleasant.
冬|ふゆ|winter|n|N5|seasons|冬の北海道は寒いです。|ふゆのほっかいどうはさむいです。|Hokkaido is cold in winter.
時々|ときどき|sometimes|adv|N5|time,frequency|時々映画を見ます。|ときどきえいがをみます。|I sometimes watch movies.
いつも|いつも|always;usually|adv|N5|frequency|いつも七時に起きます。|いつもしちじにおきます。|I always get up at seven.
よく|よく|often;well|adv|N5|frequency|よくこの店に来ます。|よくこのみせにきます。|I often come to this shop.
もう|もう|already;anymore|adv|N5|time|もう昼ご飯を食べました。|もうひるごはんをたべました。|I already ate lunch.
まだ|まだ|still;not yet|adv|N5|time|まだ宿題が終わっていません。|まだしゅくだいがおわっていません。|I haven't finished my homework yet.
すぐ|すぐ|immediately;right away;soon|adv|N5|time|すぐ行きます。|すぐいきます。|I'll go right away.
また|また|again|adv|N5|time|また明日。|またあした。|See you tomorrow.
初めて|はじめて|for the first time|adv|N4|time|初めて寿司を食べました。|はじめてすしをたべました。|I ate sushi for the first time.
やっと|やっと|finally;at last|adv|N4|time|やっと宿題が終わりました。|やっとしゅくだいがおわりました。|I finally finished my homework.
だんだん|だんだん|gradually|adv|N4|time|だんだん寒くなってきました。|だんだんさむくなってきました。|It's gradually getting colder.
家|いえ|house;home|n|N5|places|私の家は駅の近くです。|わたしのいえはえきのちかくです。|My house is near the station.
学校|がっこう|school|n|N5|places,school|学校は八時に始まります。|がっこうははちじにはじまります。|School starts at eight.
駅|えき|station;train station|n|N5|places,travel|駅はどこですか。|えきはどこですか。|Where is the station?
店|みせ|shop;store|n|N5|places,shopping|あの店は安いです。|あのみせはやすいです。|That shop is cheap.
会社|かいしゃ|company;office|n|N5|places,work|会社まで電車で行きます。|かいしゃまででんしゃでいきます。|I go to the office by train.
病院|びょういん|hospital|n|N5|places,health|病院は駅の前にあります。|びょういんはえきのまえにあります。|The hospital is in front of the station.
図書館|としょかん|library|n|N5|places|図書館で本を借りました。|としょかんでほんをかりました。|I borrowed a book at the library.
銀行|ぎんこう|bank|n|N5|places|銀行は三時に閉まります。|ぎんこうはさんじにしまります。|The bank closes at three.
郵便局|ゆうびんきょく|post office|n|N5|places|郵便局で切手を買いました。|ゆうびんきょくできってをかいました。|I bought stamps at the post office.
公園|こうえん|park|n|N5|places|公園を散歩しました。|こうえんをさんぽしました。|I took a walk in the park.
大学|だいがく|university;college|n|N5|places,school|姉は大学で英語を勉強しています。|あねはだいがくでえいごをべんきょうしています。|My older sister studies English at university.
国|くに|country;home country|n|N5|places|お国はどちらですか。|おくにはどちらですか。|Which country are you from?
町|まち|town|n|N5|places|この町は古いです。|このまちはふるいです。|This town is old.
部屋|へや|room|n|N5|places,home|部屋をきれいにしました。|へやをきれいにしました。|I cleaned my room.
台所|だいどころ|kitchen|n|N5|home|母は台所にいます。|はははだいどころにいます。|My mother is in the kitchen.
お風呂|おふろ|bath|n|N5|home|毎晩お風呂に入ります。|まいばんおふろにはいります。|I take a bath every night.
空港|くうこう|airport|n|N4|places,travel|空港までバスで行きます。|くうこうまでバスでいきます。|I'll go to the airport by bus.
近所|きんじょ|neighborhood|n|N4|places|近所にパン屋があります。|きんじょにパンやがあります。|There's a bakery in the neighborhood.
海|うみ|sea;ocean|n|N5|nature|海はとても青いです。|うみはとてもあおいです。|The sea is very blue.
山|やま|mountain|n|N5|nature|あの山はとても高いです。|あのやまはとてもたかいです。|That mountain is very tall.
川|かわ|river|n|N5|nature|川で魚を釣りました。|かわでさかなをつりました。|I caught fish in the river.
空|そら|sky|n|N4|nature|空が青いです。|そらがあおいです。|The sky is blue.
天気|てんき|weather|n|N5|nature|明日の天気はどうですか。|あしたのてんきはどうですか。|How is the weather tomorrow?
雨|あめ|rain|n|N5|nature|雨が降っています。|あめがふっています。|It's raining.|Same reading as 飴 (candy), distinguished by pitch accent.
雪|ゆき|snow|n|N5|nature|雪がたくさん降りました。|ゆきがたくさんふりました。|A lot of snow fell.
風|かぜ|wind|n|N4|nature|今日は風が強いです。|きょうはかぜがつよいです。|The wind is strong today.|Same reading as 風邪 (a cold).
花|はな|flower|n|N5|nature|きれいな花ですね。|きれいなはなですね。|What a pretty flower.|Same reading as 鼻 (nose).
景色|けしき|scenery;view|n|N4|nature|ここからの景色はきれいです。|ここからのけしきはきれいです。|The view from here is beautiful.
犬|いぬ|dog|n|N5|animals|犬を飼っています。|いぬをかっています。|I have a dog.
猫|ねこ|cat|n|N5|animals|猫が寝ています。|ねこがねています。|The cat is sleeping.
鳥|とり|bird|n|N5|animals|鳥が鳴いています。|とりがないています。|A bird is singing.
外|そと|outside|n|N5|position|外は寒いです。|そとはさむいです。|It's cold outside.
中|なか|inside;middle|n|N5|position|箱の中に何がありますか。|はこのなかになにがありますか。|What is in the box?
上|うえ|above;on top|n|N5|position|机の上に本があります。|つくえのうえにほんがあります。|There is a book on the desk.
下|した|below;under|n|N5|position|椅子の下に猫がいます。|いすのしたにねこがいます。|There is a cat under the chair.
前|まえ|front;before|n|N5|position|駅の前で待っています。|えきのまえでまっています。|I'm waiting in front of the station.
後ろ|うしろ|behind;back|n|N5|position|私の後ろに座ってください。|わたしのうしろにすわってください。|Please sit behind me.
右|みぎ|right|n|N5|position|次の角を右に曲がってください。|つぎのかどをみぎにまがってください。|Please turn right at the next corner.
左|ひだり|left|n|N5|position|左に銀行があります。|ひだりにぎんこうがあります。|There is a bank on the left.
近く|ちかく|nearby;vicinity|n|N5|position|近くにコンビニはありますか。|ちかくにコンビニはありますか。|Is there a convenience store nearby?
隣|となり|next to;next door;neighbor|n|N5|position|隣の部屋はうるさいです。|となりのへやはうるさいです。|The room next door is noisy.
本|ほん|book|n|N5|things|この本は面白いです。|このほんはおもしろいです。|This book is interesting.
水|みず|water|n|N5|food|水を一杯ください。|みずをいっぱいください。|A glass of water, please.
お茶|おちゃ|tea;green tea|n|N5|food|お茶を飲みませんか。|おちゃをのみませんか。|Won't you have some tea?
ご飯|ごはん|meal;cooked rice;rice|n|N5|food|ご飯を食べましょう。|ごはんをたべましょう。|Let's eat.
朝ご飯|あさごはん|breakfast|n|N5|food|朝ご飯を食べましたか。|あさごはんをたべましたか。|Did you eat breakfast?
晩ご飯|ばんごはん|dinner;supper|n|N5|food|晩ご飯は何ですか。|ばんごはんはなんですか。|What's for dinner?
肉|にく|meat|n|N5|food|肉より魚が好きです。|にくよりさかながすきです。|I like fish more than meat.
魚|さかな|fish|n|N5|food,animals|この魚は新しいです。|このさかなはあたらしいです。|This fish is fresh.
野菜|やさい|vegetable;vegetables|n|N5|food|野菜をたくさん食べてください。|やさいをたくさんたべてください。|Please eat lots of vegetables.
果物|くだもの|fruit|n|N5|food|どんな果物が好きですか。|どんなくだものがすきですか。|What kind of fruit do you like?
卵|たまご|egg|n|N5|food|朝ご飯に卵を食べました。|あさごはんにたまごをたべました。|I ate an egg for breakfast.
牛乳|ぎゅうにゅう|milk|n|N5|food|牛乳を買ってきてください。|ぎゅうにゅうをかってきてください。|Please go buy some milk.
お酒|おさけ|alcohol;sake|n|N5|food|父はお酒を飲みません。|ちちはおさけをのみません。|My father doesn't drink alcohol.
車|くるま|car|n|N5|travel|新しい車を買いました。|あたらしいくるまをかいました。|I bought a new car.
電車|でんしゃ|train|n|N5|travel|電車が遅れています。|でんしゃがおくれています。|The train is delayed.
自転車|じてんしゃ|bicycle;bike|n|N5|travel|自転車で学校に行きます。|じてんしゃでがっこうにいきます。|I go to school by bicycle.
飛行機|ひこうき|airplane;plane|n|N5|travel|飛行機で北海道に行きました。|ひこうきでほっかいどうにいきました。|I went to Hokkaido by plane.
切符|きっぷ|ticket|n|N5|travel|切符はどこで買いますか。|きっぷはどこでかいますか。|Where do I buy a ticket?
道|みち|road;way;street|n|N5|travel|この道はまっすぐです。|このみちはまっすぐです。|This road is straight.
地図|ちず|map|n|N5|travel|地図を見せてください。|ちずをみせてください。|Please show me the map.
電話|でんわ|telephone;phone;phone call|n|N5|things|あとで電話します。|あとででんわします。|I'll call you later.
傘|かさ|umbrella|n|N5|things|傘を忘れました。|かさをわすれました。|I forgot my umbrella.
かばん|かばん|bag|n|N5|things|このかばんは重いです。|このかばんはおもいです。|This bag is heavy.
時計|とけい|clock;watch|n|N5|things|この時計は高かったです。|このとけいはたかかったです。|This watch was expensive.
机|つくえ|desk|n|N5|things|机の上をきれいにしてください。|つくえのうえをきれいにしてください。|Please tidy up your desk.
椅子|いす|chair|n|N5|things|この椅子に座ってもいいですか。|このいすにすわってもいいですか。|May I sit in this chair?
窓|まど|window|n|N5|things|窓を開けてください。|まどをあけてください。|Please open the window.
写真|しゃしん|photograph;photo;picture|n|N5|things|写真を撮ってもいいですか。|しゃしんをとってもいいですか。|May I take a photo?
手紙|てがみ|letter|n|N5|things|祖母に手紙を書きました。|そぼにてがみをかきました。|I wrote a letter to my grandmother.
お金|おかね|money|n|N5|shopping|お金がありません。|おかねがありません。|I don't have money.
服|ふく|clothes;clothing|n|N5|shopping|新しい服を買いました。|あたらしいふくをかいました。|I bought new clothes.
靴|くつ|shoes|n|N5|shopping|ここで靴を脱いでください。|ここでくつをぬいでください。|Please take off your shoes here.
買い物|かいもの|shopping|n|N5|shopping|デパートで買い物をしました。|デパートでかいものをしました。|I went shopping at the department store.
映画|えいが|movie;film|n|N5|hobbies|映画を見に行きませんか。|えいがをみにいきませんか。|Would you like to go see a movie?
音楽|おんがく|music|n|N5|hobbies|どんな音楽を聞きますか。|どんなおんがくをききますか。|What kind of music do you listen to?
歌|うた|song|n|N5|hobbies|この歌が大好きです。|このうたがだいすきです。|I love this song.
趣味|しゅみ|hobby;hobbies|n|N4|hobbies|趣味は何ですか。|しゅみはなんですか。|What are your hobbies?
宿題|しゅくだい|homework|n|N5|school|宿題を忘れました。|しゅくだいをわすれました。|I forgot my homework.
試験|しけん|exam;test|n|N4|school|明日、試験があります。|あした、しけんがあります。|I have an exam tomorrow.
問題|もんだい|problem;question|n|N4|school|問題ありません。|もんだいありません。|No problem.
意味|いみ|meaning|n|N4|language|この言葉の意味は何ですか。|このことばのいみはなんですか。|What does this word mean?
言葉|ことば|word;language|n|N5|language|新しい言葉を覚えました。|あたらしいことばをおぼえました。|I learned a new word.
日本語|にほんご|Japanese;Japanese language|n|N5|language|日本語は難しいですが、面白いです。|にほんごはむずかしいですが、おもしろいです。|Japanese is difficult, but interesting.
英語|えいご|English;English language|n|N5|language|英語を話せますか。|えいごをはなせますか。|Can you speak English?
仕事|しごと|work;job|n|N5|work|仕事は何時に終わりますか。|しごとはなんじにおわりますか。|What time does work end?
会議|かいぎ|meeting;conference|n|N4|work|会議は三時からです。|かいぎはさんじからです。|The meeting is from three.
体|からだ|body|n|N5|health|体に気をつけてください。|からだにきをつけてください。|Please take care of yourself.
頭|あたま|head|n|N5|health|頭が痛いです。|あたまがいたいです。|I have a headache.
目|め|eye;eyes|n|N5|health|目が疲れました。|めがつかれました。|My eyes are tired.
手|て|hand;hands|n|N5|health|手を洗ってください。|てをあらってください。|Please wash your hands.
足|あし|foot;leg|n|N5|health|足が痛いです。|あしがいたいです。|My leg hurts.
口|くち|mouth|n|N5|health|口を開けてください。|くちをあけてください。|Please open your mouth.
耳|みみ|ear;ears|n|N5|health|うさぎは耳が長いです。|うさぎはみみがながいです。|Rabbits have long ears.
お腹|おなか|stomach;belly|n|N5|health|お腹がすきました。|おなかがすきました。|I'm hungry.
風邪|かぜ|cold;a cold|n|N5|health|風邪をひきました。|かぜをひきました。|I caught a cold.|Same reading as 風 (wind).
薬|くすり|medicine;drug|n|N5|health|この薬を一日三回飲んでください。|このくすりをいちにちさんかいのんでください。|Please take this medicine three times a day.
医者|いしゃ|doctor;physician|n|N5|health|医者になりたいです。|いしゃになりたいです。|I want to become a doctor.
気分|きぶん|mood;feeling|n|N4|feelings|今日は気分がいいです。|きょうはきぶんがいいです。|I'm in a good mood today.
世界|せかい|world|n|N4|society|世界を旅行したいです。|せかいをりょこうしたいです。|I want to travel the world.
文化|ぶんか|culture|n|N4|society|日本の文化に興味があります。|にほんのぶんかにきょうみがあります。|I'm interested in Japanese culture.
一つ|ひとつ|one;one thing|n|N5|numbers|りんごを一つください。|りんごをひとつください。|One apple, please.
二つ|ふたつ|two;two things|n|N5|numbers|卵を二つ買いました。|たまごをふたつかいました。|I bought two eggs.
三つ|みっつ|three;three things|n|N5|numbers|質問が三つあります。|しつもんがみっつあります。|I have three questions.
何|なに|what|pn|N5|questions|これは何ですか。|これはなんですか。|What is this?|Read なん before です, counters and words starting with t/d/n sounds.
誰|だれ|who|pn|N5|questions|あの人は誰ですか。|あのひとはだれですか。|Who is that person?
どこ|どこ|where|pn|N5|questions|どこに住んでいますか。|どこにすんでいますか。|Where do you live?
いつ|いつ|when|pn|N5|questions|夏休みはいつからですか。|なつやすみはいつからですか。|When does summer vacation start?
いくら|いくら|how much|adv|N5|questions,shopping|これはいくらですか。|これはいくらですか。|How much is this?
どうして|どうして|why;how come|adv|N5|questions|どうして遅れたんですか。|どうしておくれたんですか。|Why were you late?
これ|これ|this;this one|pn|N5|demonstratives|これは私の傘です。|これはわたしのかさです。|This is my umbrella.|For things near the speaker.
それ|それ|that (near you);that one;that|pn|N5|demonstratives|それは何ですか。|それはなんですか。|What is that?|For things near the listener.
あれ|あれ|that (over there);that one over there;that|pn|N5|demonstratives|あれは富士山です。|あれはふじさんです。|That over there is Mt. Fuji.|For things far from both speaker and listener.
ここ|ここ|here;this place|pn|N5|demonstratives|ここで写真を撮らないでください。|ここでしゃしんをとらないでください。|Please don't take photos here.
あそこ|あそこ|over there;that place|pn|N5|demonstratives|あそこに郵便局があります。|あそこにゆうびんきょくがあります。|There's a post office over there.
行く|いく|go;to go|v5|N5|movement|明日、東京へ行きます。|あした、とうきょうへいきます。|I'm going to Tokyo tomorrow.|Irregular te-form: 行って.
来る|くる|come;to come|vk|N5|movement|友達が家に来ました。|ともだちがいえにきました。|A friend came to my house.
帰る|かえる|go home;return;come back|v5|N5|movement|六時に家に帰ります。|ろくじにいえにかえります。|I go home at six.|Looks like an ichidan verb but is godan: 帰ります, 帰って.
する|する|do;to do|vs|N5|basic|毎晩宿題をします。|まいばんしゅくだいをします。|I do homework every night.
食べる|たべる|eat;to eat|v1|N5|food|毎朝パンを食べます。|まいあさパンをたべます。|I eat bread every morning.
飲む|のむ|drink;to drink|v5|N5|food|水をたくさん飲みます。|みずをたくさんのみます。|I drink a lot of water.
見る|みる|see;look;watch|v1|N5|basic|テレビを見ます。|テレビをみます。|I watch TV.
聞く|きく|hear;listen;ask|v5|N5|basic|音楽を聞くのが好きです。|おんがくをきくのがすきです。|I like listening to music.
話す|はなす|speak;talk|v5|N5|language|母と電話で話しました。|ははとでんわではなしました。|I talked with my mother on the phone.
読む|よむ|read;to read|v5|N5|basic|毎晩本を読みます。|まいばんほんをよみます。|I read a book every night.
書く|かく|write;to write|v5|N5|basic|手紙を書きました。|てがみをかきました。|I wrote a letter.
買う|かう|buy;to buy|v5|N5|shopping|スーパーで野菜を買います。|スーパーでやさいをかいます。|I buy vegetables at the supermarket.
会う|あう|meet;to meet;see (a person)|v5|N5|people|駅で友達に会いました。|えきでともだちにあいました。|I met a friend at the station.
待つ|まつ|wait;to wait|v5|N5|basic|ちょっと待ってください。|ちょっとまってください。|Please wait a moment.
持つ|もつ|hold;have;carry|v5|N5|basic|傘を持っていますか。|かさをもっていますか。|Do you have an umbrella?
立つ|たつ|stand;stand up|v5|N5|movement|ここに立ってください。|ここにたってください。|Please stand here.
遊ぶ|あそぶ|play;hang out|v5|N5|hobbies|子供たちが外で遊んでいます。|こどもたちがそとであそんでいます。|The children are playing outside.
死ぬ|しぬ|die;to die|v5|N5|basic|水がないと、花は死にます。|みずがないと、はなはしにます。|Without water, flowers die.
休む|やすむ|rest;take a day off;take a break|v5|N5|health|今日は学校を休みます。|きょうはがっこうをやすみます。|I'm taking the day off school today.
泳ぐ|およぐ|swim;to swim|v5|N5|hobbies|海で泳ぎました。|うみでおよぎました。|I swam in the sea.
歩く|あるく|walk;to walk|v5|N5|movement|駅まで歩きます。|えきまであるきます。|I walk to the station.
入る|はいる|enter;go in;come in|v5|N5|movement|部屋に入ってもいいですか。|へやにはいってもいいですか。|May I come into the room?|Looks like an ichidan verb but is godan: 入って.
出る|でる|leave;go out;exit|v1|N5|movement|八時に家を出ます。|はちじにいえをでます。|I leave home at eight.
起きる|おきる|wake up;get up|v1|N5|daily|毎朝六時に起きます。|まいあさろくじにおきます。|I get up at six every morning.
寝る|ねる|sleep;go to bed|v1|N5|daily|十一時に寝ます。|じゅういちじにねます。|I go to bed at eleven.
教える|おしえる|teach;tell;show|v1|N5|school|兄が数学を教えてくれました。|あにがすうがくをおしえてくれました。|My older brother taught me math.
分かる|わかる|understand;know|v5|N5|basic|日本語が少し分かります。|にほんごがすこしわかります。|I understand a little Japanese.|Takes が for the thing understood.
ある|ある|exist;be (inanimate);have|v5|N5|basic|時間がありますか。|じかんがありますか。|Do you have time?|Negative is ない, not あらない.
いる|いる|exist;be (animate)|v1|N5|basic|庭に猫がいます。|にわにねこがいます。|There's a cat in the garden.
作る|つくる|make;to make;cook|v5|N5|basic|母が晩ご飯を作りました。|ははがばんごはんをつくりました。|My mother made dinner.
使う|つかう|use;to use|v5|N5|basic|このパソコンを使ってもいいですか。|このパソコンをつかってもいいですか。|May I use this computer?
言う|いう|say;to say|v5|N5|language|先生は何と言いましたか。|せんせいはなんといいましたか。|What did the teacher say?
知る|しる|know;get to know|v5|N5|basic|その人を知っていますか。|そのひとをしっていますか。|Do you know that person?|"I know" is 知っています; "I don't know" is 知りません.
住む|すむ|live;reside|v5|N5|home|大阪に住んでいます。|おおさかにすんでいます。|I live in Osaka.
働く|はたらく|work;to work|v5|N5|work|父は病院で働いています。|ちちはびょういんではたらいています。|My father works at a hospital.
始まる|はじまる|begin;start|v5|N5|time|授業は九時に始まります。|じゅぎょうはくじにはじまります。|Class begins at nine.|Intransitive: something begins. Compare 始める.
終わる|おわる|end;finish|v5|N5|time|映画は何時に終わりますか。|えいがはなんじにおわりますか。|What time does the movie end?
開ける|あける|open;to open|v1|N5|home|窓を開けましょうか。|まどをあけましょうか。|Shall I open the window?
閉める|しめる|close;shut|v1|N5|home|寒いので窓を閉めました。|さむいのでまどをしめました。|It was cold, so I closed the window.
着る|きる|wear;put on (clothes)|v1|N5|shopping|今日はコートを着ます。|きょうはコートをきます。|I'll wear a coat today.|For clothes on the upper body or whole body.
借りる|かりる|borrow;to borrow|v1|N5|basic|友達にペンを借りました。|ともだちにペンをかりました。|I borrowed a pen from a friend.
貸す|かす|lend;to lend|v5|N5|basic|辞書を貸してください。|じしょをかしてください。|Please lend me your dictionary.
撮る|とる|take (a photo);take|v5|N5|hobbies|ここで写真を撮りましょう。|ここでしゃしんをとりましょう。|Let's take a photo here.
乗る|のる|ride;get on;board|v5|N5|travel|バスに乗ります。|バスにのります。|I get on the bus.|Takes に: バスに乗る.
降りる|おりる|get off;get down|v1|N5|travel|次の駅で降ります。|つぎのえきでおります。|I get off at the next station.
忘れる|わすれる|forget;to forget|v1|N5|basic|彼の名前を忘れました。|かれのなまえをわすれました。|I forgot his name.
覚える|おぼえる|memorize;remember;learn|v1|N4|school|新しい漢字を覚えました。|あたらしいかんじをおぼえました。|I memorized new kanji.
思う|おもう|think;to think|v5|N4|basic|明日は雨だと思います。|あしたはあめだとおもいます。|I think it will rain tomorrow.
売る|うる|sell;to sell|v5|N4|shopping|この店は古い本を売っています。|このみせはふるいほんをうっています。|This store sells old books.
送る|おくる|send;to send|v5|N4|things|友達にメールを送りました。|ともだちにメールをおくりました。|I sent an email to a friend.
手伝う|てつだう|help;assist|v5|N4|people|母を手伝いました。|ははをてつだいました。|I helped my mother.
急ぐ|いそぐ|hurry;to hurry|v5|N4|time|急いでください。|いそいでください。|Please hurry.
答える|こたえる|answer;reply|v1|N4|school|質問に答えてください。|しつもんにこたえてください。|Please answer the question.
決める|きめる|decide;to decide|v1|N4|basic|旅行の日を決めました。|りょこうのひをきめました。|We decided the day of the trip.
集める|あつめる|collect;gather|v1|N4|hobbies|切手を集めています。|きってをあつめています。|I collect stamps.
運ぶ|はこぶ|carry;transport|v5|N4|basic|この箱を運んでください。|このはこをはこんでください。|Please carry this box.
頑張る|がんばる|do one's best;hang in there;try hard|v5|N4|feelings|試験、頑張ってください。|しけん、がんばってください。|Good luck on the exam.
遅れる|おくれる|be late;be delayed|v1|N4|time|会議に遅れてすみません。|かいぎにおくれてすみません。|Sorry for being late to the meeting.
困る|こまる|be troubled;be in trouble|v5|N4|feelings|道が分からなくて困りました。|みちがわからなくてこまりました。|I was in trouble because I didn't know the way.
調べる|しらべる|look up;investigate;check|v1|N4|school|辞書で言葉を調べました。|じしょでことばをしらべました。|I looked up the word in a dictionary.
続ける|つづける|continue;keep doing|v1|N4|basic|日本語の勉強を続けます。|にほんごのべんきょうをつづけます。|I will continue studying Japanese.
始める|はじめる|begin;start (something)|v1|N4|time|来月からピアノを始めます。|らいげつからピアノをはじめます。|I'm starting piano next month.|Transitive: you start something. Compare 始まる.
勉強|べんきょう|study;studying|vs|N5|school|図書館で勉強します。|としょかんでべんきょうします。|I study at the library.
料理|りょうり|cooking;cuisine;dish|vs|N5|food|日本料理が好きです。|にほんりょうりがすきです。|I like Japanese cuisine.
散歩|さんぽ|walk;stroll|vs|N5|hobbies|毎朝犬と散歩します。|まいあさいぬとさんぽします。|I take a walk with my dog every morning.
掃除|そうじ|cleaning|vs|N5|home|週末に部屋を掃除します。|しゅうまつにへやをそうじします。|I clean my room on weekends.
洗濯|せんたく|laundry;washing|vs|N5|home|毎日洗濯をします。|まいにちせんたくをします。|I do laundry every day.
質問|しつもん|question|vs|N5|school|質問がありますか。|しつもんがありますか。|Do you have any questions?
結婚|けっこん|marriage;getting married|vs|N5|people|姉は去年結婚しました。|あねはきょねんけっこんしました。|My older sister got married last year.
旅行|りょこう|travel;trip|vs|N5|travel|来月、沖縄へ旅行します。|らいげつ、おきなわへりょこうします。|Next month I'm traveling to Okinawa.
練習|れんしゅう|practice|vs|N4|school|毎日ピアノを練習します。|まいにちピアノをれんしゅうします。|I practice piano every day.
準備|じゅんび|preparation;preparing|vs|N4|basic|旅行の準備をしています。|りょこうのじゅんびをしています。|I'm preparing for the trip.
説明|せつめい|explanation|vs|N4|school|もう一度説明してください。|もういちどせつめいしてください。|Please explain once more.
連絡|れんらく|contact;getting in touch|vs|N4|work|着いたら連絡します。|ついたられんらくします。|I'll contact you when I arrive.
予約|よやく|reservation;booking|vs|N4|travel|レストランを予約しました。|レストランをよやくしました。|I made a restaurant reservation.
経験|けいけん|experience|vs|N4|work|海外で働いた経験があります。|かいがいではたらいたけいけんがあります。|I have experience working abroad.
心配|しんぱい|worry;concern|vs|N4|feelings|心配しないでください。|しんぱいしないでください。|Please don't worry.
約束|やくそく|promise;appointment|vs|N4|people|約束を守ります。|やくそくをまもります。|I keep my promises.
運動|うんどう|exercise;physical exercise|vs|N4|health|毎日少し運動します。|まいにちすこしうんどうします。|I exercise a little every day.
出発|しゅっぱつ|departure;departing|vs|N4|travel|バスは八時に出発します。|バスははちじにしゅっぱつします。|The bus departs at eight.
大きい|おおきい|big;large|ai|N5|description|大きい犬ですね。|おおきいいぬですね。|What a big dog.
小さい|ちいさい|small;little|ai|N5|description|この部屋は小さいです。|このへやはちいさいです。|This room is small.
新しい|あたらしい|new;fresh|ai|N5|description|新しい靴を買いました。|あたらしいくつをかいました。|I bought new shoes.
古い|ふるい|old|ai|N5|description|この建物はとても古いです。|このたてものはとてもふるいです。|This building is very old.|For things, not people's age (use 年を取った or 年上).
高い|たかい|expensive;high;tall|ai|N5|description,shopping|東京のホテルは高いです。|とうきょうのホテルはたかいです。|Hotels in Tokyo are expensive.
安い|やすい|cheap;inexpensive|ai|N5|shopping|この店の野菜は安いです。|このみせのやさいはやすいです。|The vegetables at this shop are cheap.
低い|ひくい|low;short (height)|ai|N5|description|弟は背が低いです。|おとうとはせがひくいです。|My younger brother is short.
暑い|あつい|hot (weather);hot|ai|N5|weather|今日はとても暑いです。|きょうはとてもあついです。|It's very hot today.|For weather; 熱い (same reading) is for hot objects.
寒い|さむい|cold (weather);cold|ai|N5|weather|今日は寒いですね。|きょうはさむいですね。|It's cold today, isn't it?|For weather; 冷たい is cold to the touch.
冷たい|つめたい|cold (to the touch);cold|ai|N5|description|冷たい水が飲みたいです。|つめたいみずがのみたいです。|I want to drink cold water.
暖かい|あたたかい|warm|ai|N5|weather|春は暖かいです。|はるはあたたかいです。|Spring is warm.
いい|いい|good;nice;fine|ai|N5|description|このカメラはとてもいいです。|このカメラはとてもいいです。|This camera is very good.|Conjugates from よい: よくない, よかった.
悪い|わるい|bad|ai|N5|description|天気が悪いです。|てんきがわるいです。|The weather is bad.
面白い|おもしろい|interesting;funny|ai|N5|feelings|この映画は面白かったです。|このえいがはおもしろかったです。|This movie was interesting.
楽しい|たのしい|fun;enjoyable|ai|N5|feelings|旅行はとても楽しかったです。|りょこうはとてもたのしかったです。|The trip was a lot of fun.
難しい|むずかしい|difficult;hard|ai|N5|school|この問題は難しいです。|このもんだいはむずかしいです。|This problem is difficult.
易しい|やさしい|easy;simple|ai|N5|school|このテストは易しかったです。|このテストはやさしかったです。|This test was easy.|Same reading as 優しい (kind).
優しい|やさしい|kind;gentle|ai|N4|people|祖母はとても優しいです。|そぼはとてもやさしいです。|My grandmother is very kind.|Same reading as 易しい (easy).
忙しい|いそがしい|busy|ai|N5|work|今週は忙しいです。|こんしゅうはいそがしいです。|I'm busy this week.
おいしい|おいしい|delicious;tasty|ai|N5|food|このケーキはおいしいです。|このケーキはおいしいです。|This cake is delicious.
長い|ながい|long|ai|N5|description|この川はとても長いです。|このかわはとてもながいです。|This river is very long.
短い|みじかい|short (length);short|ai|N5|description|夏休みは短いです。|なつやすみはみじかいです。|Summer vacation is short.
早い|はやい|early|ai|N5|time|今日は早いですね。|きょうははやいですね。|You're early today.|速い (same reading) means fast.
速い|はやい|fast;quick|ai|N4|description|新幹線はとても速いです。|しんかんせんはとてもはやいです。|The shinkansen is very fast.|早い (same reading) means early.
遅い|おそい|late;slow|ai|N5|time|もう遅いから寝ましょう。|もうおそいからねましょう。|It's late, so let's go to bed.
近い|ちかい|near;close|ai|N5|position|駅は家から近いです。|えきはいえからちかいです。|The station is close to my house.
遠い|とおい|far;distant|ai|N5|position|学校は少し遠いです。|がっこうはすこしとおいです。|School is a little far.
多い|おおい|many;a lot;numerous|ai|N5|quantity|この町は公園が多いです。|このまちはこうえんがおおいです。|This town has many parks.
少ない|すくない|few;scarce;little|ai|N5|quantity|この店は客が少ないです。|このみせはきゃくがすくないです。|This shop has few customers.
明るい|あかるい|bright;cheerful|ai|N5|description|この部屋は明るいです。|このへやはあかるいです。|This room is bright.
暗い|くらい|dark;gloomy|ai|N5|description|外はもう暗いです。|そとはもうくらいです。|It's already dark outside.
重い|おもい|heavy|ai|N5|description|この箱は重いです。|このはこはおもいです。|This box is heavy.
軽い|かるい|light (weight);light|ai|N5|description|このパソコンは軽いです。|このパソコンはかるいです。|This laptop is light.
痛い|いたい|painful;sore;hurts|ai|N5|health|お腹が痛いです。|おなかがいたいです。|My stomach hurts.
危ない|あぶない|dangerous;watch out|ai|N5|description|夜の山は危ないです。|よるのやまはあぶないです。|Mountains at night are dangerous.
白い|しろい|white|ai|N5|colors|白い猫を見ました。|しろいねこをみました。|I saw a white cat.
黒い|くろい|black|ai|N5|colors|黒いかばんを持っています。|くろいかばんをもっています。|I have a black bag.
赤い|あかい|red|ai|N5|colors|赤いりんごを買いました。|あかいりんごをかいました。|I bought red apples.
青い|あおい|blue|ai|N5|colors|海が青くてきれいです。|うみがあおくてきれいです。|The sea is blue and beautiful.
若い|わかい|young|ai|N5|people|先生はまだ若いです。|せんせいはまだわかいです。|The teacher is still young.
広い|ひろい|wide;spacious;big (area)|ai|N5|description|この公園は広いです。|このこうえんはひろいです。|This park is spacious.
狭い|せまい|narrow;cramped;small (area)|ai|N5|description|私の部屋は狭いです。|わたしのへやはせまいです。|My room is cramped.
甘い|あまい|sweet|ai|N5|food|このお菓子は甘すぎます。|このおかしはあますぎます。|This snack is too sweet.
嬉しい|うれしい|happy;glad|ai|N4|feelings|会えて嬉しいです。|あえてうれしいです。|I'm glad to see you.
寂しい|さびしい|lonely|ai|N4|feelings|一人で寂しいです。|ひとりでさびしいです。|I'm lonely by myself.
恥ずかしい|はずかしい|embarrassed;embarrassing|ai|N4|feelings|間違えて恥ずかしかったです。|まちがえてはずかしかったです。|I was embarrassed that I made a mistake.
好き|すき|like;liked;fond of|an|N5|feelings|私は猫が好きです。|わたしはねこがすきです。|I like cats.|The thing liked takes が.
嫌い|きらい|dislike;hate;disliked|an|N5|feelings|野菜が嫌いです。|やさいがきらいです。|I dislike vegetables.|Ends in い but is a な-adjective.
上手|じょうず|good at;skillful|an|N5|feelings|歌が上手ですね。|うたがじょうずですね。|You're good at singing.|Not used about yourself; say 得意 instead.
下手|へた|bad at;unskillful;poor at|an|N5|feelings|私は絵が下手です。|わたしはえがへたです。|I'm bad at drawing.
元気|げんき|healthy;energetic;well|an|N5|health|お元気ですか。|おげんきですか。|How are you?
静か|しずか|quiet|an|N5|description|図書館では静かにしてください。|としょかんではしずかにしてください。|Please be quiet in the library.
有名|ゆうめい|famous|an|N5|description|この寺はとても有名です。|このてらはとてもゆうめいです。|This temple is very famous.
便利|べんり|convenient;handy|an|N5|description|スマホは便利です。|スマホはべんりです。|Smartphones are convenient.
きれい|きれい|pretty;beautiful;clean|an|N5|description|この部屋はきれいです。|このへやはきれいです。|This room is clean.|Ends in い but is a な-adjective (綺麗).
大丈夫|だいじょうぶ|all right;okay;fine|an|N5|feelings|大丈夫ですか。|だいじょうぶですか。|Are you okay?
暇|ひま|free (time);not busy;free|an|N5|time|明日は暇です。|あしたはひまです。|I'm free tomorrow.
にぎやか|にぎやか|lively;bustling|an|N5|description|この町はにぎやかです。|このまちはにぎやかです。|This town is lively.
大切|たいせつ|important;precious|an|N4|feelings|家族は大切です。|かぞくはたいせつです。|Family is important.
簡単|かんたん|simple;easy|an|N4|school|この料理は簡単です。|このりょうりはかんたんです。|This dish is easy to make.
親切|しんせつ|kind;helpful|an|N4|people|駅員さんはとても親切でした。|えきいんさんはとてもしんせつでした。|The station attendant was very kind.
丈夫|じょうぶ|sturdy;durable;strong|an|N4|description|このかばんは丈夫です。|このかばんはじょうぶです。|This bag is sturdy.
残念|ざんねん|unfortunate;a shame;disappointing|an|N4|feelings|行けなくて残念です。|いけなくてざんねんです。|It's a shame I can't go.
特別|とくべつ|special|an|N4|description|今日は特別な日です。|きょうはとくべつなひです。|Today is a special day.
必要|ひつよう|necessary;needed|an|N4|basic|パスポートが必要です。|パスポートがひつようです。|A passport is necessary.
とても|とても|very|adv|N5|degree|このケーキはとても甘いです。|このケーキはとてもあまいです。|This cake is very sweet.
少し|すこし|a little;a bit;slightly|adv|N5|degree|少し休みましょう。|すこしやすみましょう。|Let's rest a little.
たくさん|たくさん|a lot;many;much|adv|N5|quantity|宿題がたくさんあります。|しゅくだいがたくさんあります。|I have a lot of homework.
ちょっと|ちょっと|a little;a moment;a bit|adv|N5|degree|ちょっと高いですね。|ちょっとたかいですね。|It's a little expensive, isn't it?
あまり|あまり|not very;not much|adv|N5|degree|あまり寒くないです。|あまりさむくないです。|It's not very cold.|Used with a negative verb or adjective.
全然|ぜんぜん|not at all;never|adv|N5|degree|全然分かりません。|ぜんぜんわかりません。|I don't understand at all.|Normally used with a negative.
一緒に|いっしょに|together|adv|N5|people|一緒に帰りましょう。|いっしょにかえりましょう。|Let's go home together.
一番|いちばん|most;number one;best|adv|N5|degree|果物の中でいちごが一番好きです。|くだもののなかでいちごがいちばんすきです。|Of all fruits, I like strawberries the most.
まっすぐ|まっすぐ|straight;straight ahead|adv|N5|travel|この道をまっすぐ行ってください。|このみちをまっすぐいってください。|Please go straight down this road.
ゆっくり|ゆっくり|slowly;leisurely|adv|N5|degree|もう少しゆっくり話してください。|もうすこしゆっくりはなしてください。|Please speak a little more slowly.
もっと|もっと|more|adv|N5|degree|もっと練習したいです。|もっとれんしゅうしたいです。|I want to practice more.
本当に|ほんとうに|really;truly|adv|N5|degree|本当にありがとうございました。|ほんとうにありがとうございました。|Thank you very much indeed.
多分|たぶん|probably;perhaps;maybe|adv|N5|degree|多分、雨が降るでしょう。|たぶん、あめがふるでしょう。|It will probably rain.
きっと|きっと|surely;certainly|adv|N4|degree|明日はきっと晴れます。|あしたはきっとはれます。|It will surely be sunny tomorrow.
特に|とくに|especially;particularly|adv|N4|degree|特に問題はありません。|とくにもんだいはありません。|There are no particular problems.
でも|でも|but;however|conj|N5|connectors|高いです。でも、買います。|たかいです。でも、かいます。|It's expensive. But I'll buy it.
そして|そして|and then;and|conj|N5|connectors|朝ご飯を食べました。そして、学校に行きました。|あさごはんをたべました。そして、がっこうにいきました。|I ate breakfast. Then I went to school.
だから|だから|so;therefore|conj|N5|connectors|雨です。だから、出かけません。|あめです。だから、でかけません。|It's raining. So I won't go out.
それから|それから|after that;and then|conj|N5|connectors|宿題をして、それから寝ました。|しゅくだいをして、それからねました。|I did my homework, and after that I went to sleep.
コーヒー|コーヒー|coffee|n|N5|food,loanword|コーヒーを一杯ください。|コーヒーをいっぱいください。|A cup of coffee, please.
テレビ|テレビ|television;TV|n|N5|things,loanword|テレビを消してください。|テレビをけしてください。|Please turn off the TV.
パソコン|パソコン|computer;personal computer;laptop|n|N5|things,loanword|新しいパソコンが欲しいです。|あたらしいパソコンがほしいです。|I want a new computer.
カメラ|カメラ|camera|n|N5|things,loanword|このカメラは古いです。|このカメラはふるいです。|This camera is old.
ホテル|ホテル|hotel|n|N5|travel,loanword|駅の近くのホテルに泊まりました。|えきのちかくのホテルにとまりました。|I stayed at a hotel near the station.
レストラン|レストラン|restaurant|n|N5|food,loanword|駅の前にレストランがあります。|えきのまえにレストランがあります。|There is a restaurant in front of the station.
トイレ|トイレ|toilet;restroom;bathroom|n|N5|places,loanword|トイレはどこですか。|トイレはどこですか。|Where is the restroom?
パン|パン|bread|n|N5|food,loanword|このパンはおいしいです。|このパンはおいしいです。|This bread is delicious.
バス|バス|bus|n|N5|travel,loanword|バスはもう出ました。|バスはもうでました。|The bus already left.
ドア|ドア|door|n|N5|things,loanword|ドアを閉めてください。|ドアをしめてください。|Please close the door.
テスト|テスト|test;quiz|n|N5|school,loanword|テストは難しかったです。|テストはむずかしかったです。|The test was difficult.
ペン|ペン|pen|n|N5|things,loanword|ペンを貸してください。|ペンをかしてください。|Please lend me a pen.
ノート|ノート|notebook|n|N5|school,loanword|ノートに名前を書きました。|ノートになまえをかきました。|I wrote my name in my notebook.
スマホ|スマホ|smartphone;phone|n|N4|things,loanword|スマホを家に忘れました。|スマホをいえにわすれました。|I left my smartphone at home.
ジュース|ジュース|juice|n|N5|food,loanword|オレンジジュースをください。|オレンジジュースをください。|Orange juice, please.
ゲーム|ゲーム|game;video game|n|N5|hobbies,loanword|弟は毎日ゲームをします。|おとうとはまいにちゲームをします。|My younger brother plays games every day.
パーティー|パーティー|party|n|N5|hobbies,loanword|土曜日にパーティーがあります。|どようびにパーティーがあります。|There's a party on Saturday.
シャワー|シャワー|shower|n|N5|home,loanword|朝シャワーを浴びます。|あさシャワーをあびます。|I take a shower in the morning.
エレベーター|エレベーター|elevator;lift|n|N5|places,loanword|エレベーターで五階に行きます。|エレベーターでごかいにいきます。|I take the elevator to the fifth floor.
タクシー|タクシー|taxi;cab|n|N5|travel,loanword|駅からタクシーに乗りました。|えきからタクシーにのりました。|I took a taxi from the station.
スーパー|スーパー|supermarket|n|N5|shopping,loanword|スーパーで牛乳を買いました。|スーパーでぎゅうにゅうをかいました。|I bought milk at the supermarket.
コンビニ|コンビニ|convenience store|n|N4|shopping,loanword|コンビニでお弁当を買います。|コンビニでおべんとうをかいます。|I buy a boxed lunch at the convenience store.
アパート|アパート|apartment|n|N5|home,loanword|駅の近くのアパートに住んでいます。|えきのちかくのアパートにすんでいます。|I live in an apartment near the station.
メール|メール|email;e-mail;message|n|N4|things,loanword|あとでメールを送ります。|あとでメールをおくります。|I'll send an email later.
アイスクリーム|アイスクリーム|ice cream|n|N5|food,loanword|夏はアイスクリームが食べたくなります。|なつはアイスクリームがたべたくなります。|In summer I feel like eating ice cream.
経済|けいざい|economy;economics|n|N3|society|日本の経済について勉強しています。|にほんのけいざいについてべんきょうしています。|I'm studying the Japanese economy.
政治|せいじ|politics;government|n|N3|society|政治に興味がありません。|せいじにきょうみがありません。|I'm not interested in politics.
環境|かんきょう|environment;surroundings|n|N3|society|環境を守ることは大切です。|かんきょうをまもることはたいせつです。|Protecting the environment is important.
技術|ぎじゅつ|technology;technique;skill|n|N3|work|新しい技術を学びました。|あたらしいぎじゅつをまなびました。|I learned a new technique.
将来|しょうらい|future;in the future|n|N3|time|将来、先生になりたいです。|しょうらい、せんせいになりたいです。|In the future I want to be a teacher.
習慣|しゅうかん|habit;custom|n|N3|society|早起きは良い習慣です。|はやおきはよいしゅうかんです。|Waking up early is a good habit.
関係|かんけい|relationship;connection;relation|n|N3|people|二人はどんな関係ですか。|ふたりはどんなかんけいですか。|What is the relationship between the two of them?
様子|ようす|state;condition;appearance|n|N3|description|彼の様子が少し変です。|かれのようすがすこしへんです。|He seems a little strange.
状況|じょうきょう|situation;circumstances|n|N3|society|今の状況を説明してください。|いまのじょうきょうをせつめいしてください。|Please explain the current situation.
努力|どりょく|effort;endeavor|vs|N3|work|毎日努力しています。|まいにちどりょくしています。|I make an effort every day.
成功|せいこう|success|vs|N3|work|計画は成功しました。|けいかくはせいこうしました。|The plan succeeded.
失敗|しっぱい|failure;mistake|vs|N3|work|失敗してもいいです。|しっぱいしてもいいです。|It's okay to fail.
増える|ふえる|increase;grow in number|v1|N3|quantity|観光客が増えました。|かんこうきゃくがふえました。|The number of tourists increased.
減る|へる|decrease;go down|v5|N3|quantity|体重が減りました。|たいじゅうがへりました。|My weight went down.|Godan despite the -eru ending: 減って.
比べる|くらべる|compare|v1|N3|basic|二つの店の値段を比べました。|ふたつのみせのねだんをくらべました。|I compared the prices of the two shops.
選ぶ|えらぶ|choose;select|v5|N3|basic|好きな色を選んでください。|すきないろをえらんでください。|Please choose your favorite color.
伝える|つたえる|convey;tell;pass on|v1|N3|language|ご家族によろしく伝えてください。|ごかぞくによろしくつたえてください。|Please give my regards to your family.
必ず|かならず|without fail;certainly;always|adv|N3|degree|必ず連絡します。|かならずれんらくします。|I will contact you without fail.
相変わらず|あいかわらず|as usual;as ever|adv|N3|time|彼は相変わらず元気です。|かれはあいかわらずげんきです。|He is as energetic as ever.
複雑|ふくざつ|complicated;complex|an|N3|description|この問題は複雑です。|このもんだいはふくざつです。|This problem is complicated.
自由|じゆう|free;freedom|an|N3|society|自由に使ってください。|じゆうにつかってください。|Please feel free to use it.
苦手|にがて|weak at;not good with;poor at|an|N3|feelings|数学が苦手です。|すうがくがにがてです。|I'm not good at math.
得意|とくい|good at;strong point|an|N3|feelings|料理が得意です。|りょうりがとくいです。|Cooking is my strong point.
意外|いがい|unexpected;surprising|an|N3|feelings|テストは意外に簡単でした。|テストはいがいにかんたんでした。|The test was surprisingly easy.
把握|はあく|grasp;understanding|vs|N2|work|状況を把握しています。|じょうきょうをはあくしています。|I have a grasp of the situation.
維持|いじ|maintenance;preservation;keeping|vs|N2|society|健康を維持するために運動します。|けんこうをいじするためにうんどうします。|I exercise to maintain my health.
傾向|けいこう|tendency;trend|n|N2|society|若者は本を読まない傾向があります。|わかものはほんをよまないけいこうがあります。|Young people tend not to read books.
貴重|きちょう|valuable;precious|an|N2|description|貴重な経験をしました。|きちょうなけいけんをしました。|I had a valuable experience.
曖昧|あいまい|vague;ambiguous|an|N2|language|彼の答えは曖昧でした。|かれのこたえはあいまいでした。|His answer was vague.
慎重|しんちょう|careful;cautious;prudent|an|N2|feelings|慎重に運転してください。|しんちょうにうんてんしてください。|Please drive carefully.
訪れる|おとずれる|visit|v1|N2|travel|毎年多くの人が京都を訪れます。|まいとしおおくのひとがきょうとをおとずれます。|Many people visit Kyoto every year.
迎える|むかえる|welcome;greet;receive|v1|N2|people|笑顔で客を迎えました。|えがおできゃくをむかえました。|We welcomed the guests with smiles.
諦める|あきらめる|give up;abandon|v1|N2|feelings|夢を諦めないでください。|ゆめをあきらめないでください。|Please don't give up on your dreams.
妥協|だきょう|compromise|vs|N2|work|お互いに妥協しました。|おたがいにだきょうしました。|We compromised with each other.
懸念|けねん|concern;apprehension;worry|vs|N1|society|経済への影響が懸念されています。|けいざいへのえいきょうがけねんされています。|There are concerns about the impact on the economy.
措置|そち|measure;step;action|n|N1|society|政府は新たな措置を講じました。|せいふはあらたなそちをこうじました。|The government took new measures.
顕著|けんちょ|remarkable;striking;conspicuous|an|N1|description|効果が顕著に現れました。|こうかがけんちょにあらわれました。|The effect appeared strikingly.
寄与|きよ|contribution|vs|N1|society|彼は研究の発展に寄与しました。|かれはけんきゅうのはってんにきよしました。|He contributed to the development of the research.
踏まえる|ふまえる|take into account;be based on|v1|N1|work|結果を踏まえて計画を立てます。|けっかをふまえてけいかくをたてます。|We'll make a plan based on the results.
覆す|くつがえす|overturn;overthrow;reverse|v5|N1|society|判決が覆されました。|はんけつがくつがえされました。|The verdict was overturned.
`;
