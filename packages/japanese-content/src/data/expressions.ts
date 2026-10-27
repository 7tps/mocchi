/**
 * Common expressions (original content written for this project).
 *
 * Line format: expression | reading | meanings (;) | JLPT | when to use | example | example reading | example translation
 */
export const EXPRESSIONS_SOURCE = String.raw`
おはようございます|おはようございます|good morning|N5|Polite morning greeting; おはよう with friends.|先生、おはようございます。|せんせい、おはようございます。|Good morning, teacher.
こんにちは|こんにちは|hello;good afternoon|N5|Daytime greeting. The final は is read "wa".|こんにちは、田中さん。|こんにちは、たなかさん。|Hello, Mr./Ms. Tanaka.
こんばんは|こんばんは|good evening|N5|Evening greeting.|こんばんは、いい夜ですね。|こんばんは、いいよるですね。|Good evening — it's a nice night.
おやすみなさい|おやすみなさい|good night|N5|Said before going to bed.|もう寝ます。おやすみなさい。|もうねます。おやすみなさい。|I'm going to bed. Good night.
ありがとうございます|ありがとうございます|thank you|N5|Polite thanks; ありがとう with friends.|手伝ってくれて、ありがとうございます。|てつだってくれて、ありがとうございます。|Thank you for helping me.
どういたしまして|どういたしまして|you're welcome|N5|Reply to thanks. In daily life, people often just say いいえ.|「ありがとう。」「どういたしまして。」|「ありがとう。」「どういたしまして。」|"Thanks." "You're welcome."
すみません|すみません|excuse me;sorry|N5|Apologizing lightly, getting attention, or thanking for trouble.|すみません、駅はどこですか。|すみません、えきはどこですか。|Excuse me, where is the station?
ごめんなさい|ごめんなさい|I'm sorry|N5|Personal apology; more emotional than すみません.|遅れてごめんなさい。|おくれてごめんなさい。|Sorry I'm late.
いただきます|いただきます|thank you for the meal (before eating);let's eat|N5|Said before eating.|では、いただきます。|では、いただきます。|Well then, let's eat.
ごちそうさまでした|ごちそうさまでした|thank you for the meal (after eating);that was delicious|N5|Said after eating.|おいしかったです。ごちそうさまでした。|おいしかったです。ごちそうさまでした。|That was delicious. Thank you for the meal.
いってきます|いってきます|I'm off;see you later|N5|Said when leaving home; reply is いってらっしゃい.|じゃあ、いってきます。|じゃあ、いってきます。|Well, I'm off.
いってらっしゃい|いってらっしゃい|have a good day;see you later|N5|Said to someone leaving home.|気をつけて、いってらっしゃい。|きをつけて、いってらっしゃい。|Take care, see you later.
ただいま|ただいま|I'm home|N5|Said when arriving home; reply is おかえりなさい.|ただいま。今日は疲れた。|ただいま。きょうはつかれた。|I'm home. I'm tired today.
おかえりなさい|おかえりなさい|welcome home|N5|Said to someone returning home.|おかえりなさい。ご飯できてるよ。|おかえりなさい。ごはんできてるよ。|Welcome home. Dinner's ready.
はじめまして|はじめまして|nice to meet you|N5|Said when meeting someone for the first time.|はじめまして、スミスです。|はじめまして、スミスです。|Nice to meet you, I'm Smith.
よろしくお願いします|よろしくおねがいします|nice to meet you;please treat me well;I look forward to working with you|N5|Said after introductions or when asking a favor.|これからよろしくお願いします。|これからよろしくおねがいします。|I look forward to working with you.
お願いします|おねがいします|please|N5|Requesting something.|コーヒーをお願いします。|コーヒーをおねがいします。|Coffee, please.
さようなら|さようなら|goodbye|N5|Fairly formal or final; friends say じゃあね or またね.|先生、さようなら。|せんせい、さようなら。|Goodbye, teacher.
じゃあね|じゃあね|see you;bye|N5|Casual goodbye between friends.|また明日。じゃあね。|またあした。じゃあね。|See you tomorrow. Bye.
お疲れ様です|おつかれさまです|thank you for your hard work;good work|N4|Common at work for greetings and leaving.|今日もお疲れ様でした。|きょうもおつかれさまでした。|Thanks for your hard work today too.
失礼します|しつれいします|excuse me (entering or leaving)|N4|Said when entering or leaving a room or office.|失礼します。入ってもいいですか。|しつれいします。はいってもいいですか。|Excuse me. May I come in?
いらっしゃいませ|いらっしゃいませ|welcome (to a shop)|N5|Said by shop staff; customers do not reply with it.|いらっしゃいませ。何名様ですか。|いらっしゃいませ。なんめいさまですか。|Welcome. How many people?
おめでとうございます|おめでとうございます|congratulations|N5|Congratulating someone.|ご結婚おめでとうございます。|ごけっこんおめでとうございます。|Congratulations on your wedding.
気をつけて|きをつけて|take care;be careful|N4|Said when someone is leaving or doing something risky.|雪の日は気をつけてね。|ゆきのひはきをつけてね。|Be careful on snowy days.
お大事に|おだいじに|get well soon;take care|N4|Said to someone who is sick.|風邪ですか。お大事に。|かぜですか。おだいじに。|You have a cold? Get well soon.
久しぶり|ひさしぶり|long time no see|N4|Casual; polite form お久しぶりです.|久しぶり！元気だった？|ひさしぶり！げんきだった？|Long time no see! How have you been?
もしもし|もしもし|hello (on the phone)|N5|Used only on the phone.|もしもし、田中です。|もしもし、たなかです。|Hello, this is Tanaka.
いいえ|いいえ|no;not at all|N5|Polite "no"; also a modest reply to thanks.|いいえ、違います。|いいえ、ちがいます。|No, that's wrong.
そうですね|そうですね|that's right;let me see|N5|Agreeing, or buying time to think.|そうですね、明日はどうですか。|そうですね、あしたはどうですか。|Let me see, how about tomorrow?
大丈夫です|だいじょうぶです|I'm okay;no thank you|N5|Can mean "I'm fine" or a polite refusal.|袋は大丈夫です。|ふくろはだいじょうぶです。|I don't need a bag, thanks.
`;
