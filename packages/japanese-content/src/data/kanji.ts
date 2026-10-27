/**
 * Curated kanji (original content written for this project).
 *
 * Line format:
 *   kanji | most useful reading (hiragana) | on'yomi (katakana, comma) | kun'yomi (hiragana, "." marks okurigana) | meanings (;) | JLPT | compounds word:reading:meaning (,) | note?
 *
 * Readings are ordered by usefulness; rare readings are deliberately omitted.
 */
export const KANJI_SOURCE = String.raw`
一|いち|イチ,イツ|ひと.つ|one|N5|一つ:ひとつ:one thing,一人:ひとり:one person,一番:いちばん:number one
二|に|ニ|ふた.つ|two|N5|二つ:ふたつ:two things,二人:ふたり:two people
三|さん|サン|みっ.つ|three|N5|三つ:みっつ:three things,三月:さんがつ:March
四|よん|シ|よん,よ,よっ.つ|four|N5|四月:しがつ:April,四人:よにん:four people|し is avoided in many words because it sounds like 死 (death).
五|ご|ゴ|いつ.つ|five|N5|五月:ごがつ:May,五つ:いつつ:five things
六|ろく|ロク|むっ.つ|six|N5|六時:ろくじ:six o'clock
七|なな|シチ|なな,なな.つ|seven|N5|七時:しちじ:seven o'clock,七つ:ななつ:seven things
八|はち|ハチ|やっ.つ|eight|N5|八時:はちじ:eight o'clock,八百屋:やおや:greengrocer
九|きゅう|キュウ,ク|ここの.つ|nine|N5|九時:くじ:nine o'clock,九月:くがつ:September
十|じゅう|ジュウ|とお|ten|N5|十分:じゅっぷん:ten minutes,十日:とおか:the tenth day
百|ひゃく|ヒャク||hundred|N5|三百:さんびゃく:three hundred,百円:ひゃくえん:100 yen
千|せん|セン|ち|thousand|N5|三千:さんぜん:three thousand,千円:せんえん:1000 yen
万|まん|マン,バン||ten thousand|N5|一万円:いちまんえん:10,000 yen
円|えん|エン|まる.い|yen;circle|N5|百円:ひゃくえん:100 yen
日|にち|ニチ,ジツ|ひ,か|day;sun|N5|毎日:まいにち:every day,日曜日:にちようび:Sunday,今日:きょう:today|今日 (きょう) and 明日 (あした) have special readings.
月|つき|ゲツ,ガツ|つき|moon;month|N5|月曜日:げつようび:Monday,一月:いちがつ:January
火|ひ|カ|ひ|fire|N5|火曜日:かようび:Tuesday,花火:はなび:fireworks
水|みず|スイ|みず|water|N5|水曜日:すいようび:Wednesday,水:みず:water
木|き|モク,ボク|き|tree;wood|N5|木曜日:もくようび:Thursday,木:き:tree
金|かね|キン|かね|gold;money|N5|金曜日:きんようび:Friday,お金:おかね:money
土|つち|ド,ト|つち|soil;earth|N5|土曜日:どようび:Saturday
年|ねん|ネン|とし|year|N5|今年:ことし:this year,去年:きょねん:last year,来年:らいねん:next year
時|じ|ジ|とき|time;hour|N5|時間:じかん:time,時計:とけい:clock,時々:ときどき:sometimes
分|ふん|ブン,フン|わ.かる,わ.ける|minute;part;understand|N5|五分:ごふん:five minutes,分かる:わかる:understand
半|はん|ハン|なか.ば|half|N5|三時半:さんじはん:half past three
今|いま|コン,キン|いま|now|N5|今:いま:now,今年:ことし:this year
何|なに|カ|なに,なん|what|N5|何時:なんじ:what time,何:なに:what
人|ひと|ジン,ニン|ひと|person|N5|日本人:にほんじん:Japanese person,三人:さんにん:three people
子|こ|シ,ス|こ|child|N5|子供:こども:child,女の子:おんなのこ:girl
女|おんな|ジョ,ニョ|おんな|woman;female|N5|女の人:おんなのひと:woman,彼女:かのじょ:she
男|おとこ|ダン,ナン|おとこ|man;male|N5|男の子:おとこのこ:boy,男性:だんせい:male
父|ちち|フ|ちち|father|N5|お父さん:おとうさん:father,父:ちち:my father
母|はは|ボ|はは|mother|N5|お母さん:おかあさん:mother,母:はは:my mother
友|とも|ユウ|とも|friend|N5|友達:ともだち:friend
先|さき|セン|さき|ahead;previous|N5|先生:せんせい:teacher,先週:せんしゅう:last week
生|せい|セイ,ショウ|い.きる,う.まれる,なま|life;birth;raw|N5|学生:がくせい:student,先生:せんせい:teacher,誕生日:たんじょうび:birthday
学|がく|ガク|まな.ぶ|study;learning|N5|学校:がっこう:school,大学:だいがく:university,学生:がくせい:student
校|こう|コウ||school|N5|学校:がっこう:school,高校:こうこう:high school
名|な|メイ,ミョウ|な|name|N5|名前:なまえ:name,有名:ゆうめい:famous
本|ほん|ホン|もと|book;origin;main|N5|本:ほん:book,日本:にほん:Japan
大|おお|ダイ,タイ|おお.きい|big;large|N5|大きい:おおきい:big,大学:だいがく:university,大切:たいせつ:important
小|ちい|ショウ|ちい.さい,こ|small;little|N5|小さい:ちいさい:small,小学校:しょうがっこう:elementary school
中|なか|チュウ|なか|inside;middle|N5|中:なか:inside,中国:ちゅうごく:China
上|うえ|ジョウ|うえ,あ.がる,のぼ.る|above;up|N5|上:うえ:above,上手:じょうず:skillful
下|した|カ,ゲ|した,さ.がる,くだ.さる|below;down|N5|下:した:below,下手:へた:unskillful,地下鉄:ちかてつ:subway
左|ひだり|サ|ひだり|left|N5|左:ひだり:left
右|みぎ|ウ,ユウ|みぎ|right|N5|右:みぎ:right
前|まえ|ゼン|まえ|before;front|N5|前:まえ:front,午前:ごぜん:a.m.,名前:なまえ:name
後|あと|ゴ,コウ|うし.ろ,あと,のち|after;behind|N5|午後:ごご:p.m.,後ろ:うしろ:behind
外|そと|ガイ,ゲ|そと,ほか|outside;other|N5|外:そと:outside,外国:がいこく:foreign country
山|やま|サン|やま|mountain|N5|山:やま:mountain,富士山:ふじさん:Mt. Fuji
川|かわ|セン|かわ|river|N5|川:かわ:river
田|た|デン|た|rice field|N5|田中:たなか:Tanaka (surname)
天|てん|テン|あめ|heaven;sky|N5|天気:てんき:weather
気|き|キ,ケ||spirit;energy;mood|N5|天気:てんき:weather,元気:げんき:healthy,気分:きぶん:mood
雨|あめ|ウ|あめ|rain|N5|雨:あめ:rain
花|はな|カ|はな|flower|N5|花:はな:flower,花火:はなび:fireworks
東|ひがし|トウ|ひがし|east|N5|東京:とうきょう:Tokyo,東:ひがし:east
西|にし|セイ,サイ|にし|west|N5|西:にし:west
南|みなみ|ナン|みなみ|south|N5|南:みなみ:south
北|きた|ホク|きた|north|N5|北:きた:north,北海道:ほっかいどう:Hokkaido
口|くち|コウ|くち|mouth|N5|口:くち:mouth,入口:いりぐち:entrance
目|め|モク|め|eye|N5|目:め:eye
耳|みみ|ジ|みみ|ear|N5|耳:みみ:ear
手|て|シュ|て|hand|N5|手:て:hand,上手:じょうず:skillful,手紙:てがみ:letter
足|あし|ソク|あし,た.りる|foot;leg;be enough|N5|足:あし:foot,足りる:たりる:be enough
見|み|ケン|み.る,み.せる|see;look|N5|見る:みる:see,見せる:みせる:show
行|い|コウ,ギョウ|い.く,おこな.う|go;conduct|N5|行く:いく:go,旅行:りょこう:travel,銀行:ぎんこう:bank
来|く|ライ|く.る,き.ます|come;next|N5|来る:くる:come,来年:らいねん:next year,来週:らいしゅう:next week
食|た|ショク|た.べる|eat;food|N5|食べる:たべる:eat,食事:しょくじ:meal
飲|の|イン|の.む|drink|N5|飲む:のむ:drink,飲み物:のみもの:drink (beverage)
買|か|バイ|か.う|buy|N5|買う:かう:buy,買い物:かいもの:shopping
読|よ|ドク|よ.む|read|N5|読む:よむ:read
書|か|ショ|か.く|write|N5|書く:かく:write,図書館:としょかん:library
話|はな|ワ|はな.す,はなし|talk;story|N5|話す:はなす:speak,電話:でんわ:telephone
聞|き|ブン|き.く|hear;ask|N5|聞く:きく:listen,新聞:しんぶん:newspaper
言|い|ゲン,ゴン|い.う,こと|say;word|N5|言う:いう:say,言葉:ことば:word
出|で|シュツ|で.る,だ.す|exit;go out|N5|出る:でる:leave,出発:しゅっぱつ:departure
入|はい|ニュウ|はい.る,い.れる|enter;put in|N5|入る:はいる:enter,入口:いりぐち:entrance
休|やす|キュウ|やす.む|rest|N5|休む:やすむ:rest,休み:やすみ:holiday|A person (亻) leaning against a tree (木).
会|あ|カイ|あ.う|meet;association|N5|会う:あう:meet,会社:かいしゃ:company,会議:かいぎ:meeting
社|しゃ|シャ|やしろ|company;shrine|N5|会社:かいしゃ:company,社会:しゃかい:society
国|くに|コク|くに|country|N5|国:くに:country,外国:がいこく:foreign country,中国:ちゅうごく:China
語|ご|ゴ|かた.る|language;word|N5|日本語:にほんご:Japanese,英語:えいご:English
高|たか|コウ|たか.い|tall;high;expensive|N5|高い:たかい:expensive,高校:こうこう:high school
安|やす|アン|やす.い|cheap;peaceful|N5|安い:やすい:cheap,安心:あんしん:relief
新|あたら|シン|あたら.しい|new|N5|新しい:あたらしい:new,新聞:しんぶん:newspaper
古|ふる|コ|ふる.い|old|N5|古い:ふるい:old
長|なが|チョウ|なが.い|long;leader|N5|長い:ながい:long,社長:しゃちょう:company president
白|しろ|ハク|しろ,しろ.い|white|N5|白い:しろい:white
電|でん|デン||electricity|N5|電車:でんしゃ:train,電話:でんわ:telephone,電気:でんき:electricity
車|くるま|シャ|くるま|car;vehicle|N5|車:くるま:car,電車:でんしゃ:train,自転車:じてんしゃ:bicycle
駅|えき|エキ||station|N5|駅:えき:station
道|みち|ドウ|みち|road;way|N5|道:みち:road,北海道:ほっかいどう:Hokkaido
毎|まい|マイ||every|N5|毎日:まいにち:every day,毎朝:まいあさ:every morning
午|ご|ゴ||noon|N5|午前:ごぜん:a.m.,午後:ごご:p.m.
春|はる|シュン|はる|spring|N4|春:はる:spring
夏|なつ|カ|なつ|summer|N4|夏:なつ:summer,夏休み:なつやすみ:summer vacation
秋|あき|シュウ|あき|autumn|N4|秋:あき:autumn
冬|ふゆ|トウ|ふゆ|winter|N4|冬:ふゆ:winter
家|いえ|カ,ケ|いえ,や|house;home|N4|家:いえ:house,家族:かぞく:family
族|ぞく|ゾク||family;tribe|N4|家族:かぞく:family
兄|あに|キョウ,ケイ|あに|older brother|N4|兄:あに:older brother,兄弟:きょうだい:siblings
姉|あね|シ|あね|older sister|N4|姉:あね:older sister
弟|おとうと|ダイ,テイ|おとうと|younger brother|N4|弟:おとうと:younger brother
妹|いもうと|マイ|いもうと|younger sister|N4|妹:いもうと:younger sister
朝|あさ|チョウ|あさ|morning|N4|朝:あさ:morning,朝ご飯:あさごはん:breakfast
昼|ひる|チュウ|ひる|noon;daytime|N4|昼:ひる:noon,昼ご飯:ひるごはん:lunch
夜|よる|ヤ|よる,よ|night|N4|夜:よる:night,今夜:こんや:tonight
早|はや|ソウ|はや.い|early;fast|N4|早い:はやい:early
近|ちか|キン|ちか.い|near|N4|近い:ちかい:near,近所:きんじょ:neighborhood
遠|とお|エン|とお.い|far|N4|遠い:とおい:far
色|いろ|ショク|いろ|color|N4|色:いろ:color,景色:けしき:scenery
赤|あか|セキ|あか,あか.い|red|N4|赤い:あかい:red
青|あお|セイ|あお,あお.い|blue;green|N4|青い:あおい:blue|Traditionally covers green too, e.g. 青信号 (green light).
黒|くろ|コク|くろ,くろ.い|black|N4|黒い:くろい:black
肉|にく|ニク||meat|N4|肉:にく:meat
魚|さかな|ギョ|さかな,うお|fish|N4|魚:さかな:fish
料|りょう|リョウ||fee;materials|N4|料理:りょうり:cooking
理|り|リ||reason;logic|N4|料理:りょうり:cooking,無理:むり:impossible
茶|ちゃ|チャ,サ||tea|N4|お茶:おちゃ:tea,喫茶店:きっさてん:coffee shop
店|みせ|テン|みせ|shop|N4|店:みせ:shop,喫茶店:きっさてん:coffee shop
病|びょう|ビョウ|やまい|illness|N4|病院:びょういん:hospital,病気:びょうき:illness
院|いん|イン||institution|N4|病院:びょういん:hospital
医|い|イ||medicine;doctor|N4|医者:いしゃ:doctor
体|からだ|タイ|からだ|body|N4|体:からだ:body
頭|あたま|トウ,ズ|あたま|head|N4|頭:あたま:head
思|おも|シ|おも.う|think|N4|思う:おもう:think
知|し|チ|し.る|know|N4|知る:しる:know
待|ま|タイ|ま.つ|wait|N4|待つ:まつ:wait
持|も|ジ|も.つ|hold;have|N4|持つ:もつ:hold
使|つか|シ|つか.う|use|N4|使う:つかう:use
作|つく|サク,サ|つく.る|make|N4|作る:つくる:make
始|はじ|シ|はじ.める,はじ.まる|begin|N4|始める:はじめる:begin,始まる:はじまる:begin
終|お|シュウ|お.わる|end|N4|終わる:おわる:end
歩|ある|ホ|ある.く|walk|N4|歩く:あるく:walk
歌|うた|カ|うた,うた.う|song;sing|N4|歌:うた:song,歌う:うたう:sing
楽|たの|ガク,ラク|たの.しい|fun;music;comfort|N4|楽しい:たのしい:fun,音楽:おんがく:music
悪|わる|アク|わる.い|bad|N4|悪い:わるい:bad
重|おも|ジュウ|おも.い|heavy|N4|重い:おもい:heavy
軽|かる|ケイ|かる.い|light|N4|軽い:かるい:light
明|あか|メイ|あか.るい|bright|N4|明るい:あかるい:bright
暗|くら|アン|くら.い|dark|N4|暗い:くらい:dark
経|けい|ケイ|へ.る|pass through;manage|N3|経済:けいざい:economy,経験:けいけん:experience
済|さい|サイ|す.む|finish;settle|N3|経済:けいざい:economy
環|かん|カン||ring;surround|N3|環境:かんきょう:environment
境|きょう|キョウ|さかい|boundary|N3|環境:かんきょう:environment
努|ど|ド|つと.める|effort|N3|努力:どりょく:effort
維|い|イ||fiber;maintain|N2|維持:いじ:maintenance
慎|しん|シン|つつし.む|careful;humble|N2|慎重:しんちょう:careful
懸|け|ケン,ケ|か.ける|suspend;hang|N1|懸念:けねん:concern
顕|けん|ケン||appear;manifest|N1|顕著:けんちょ:remarkable
`;
