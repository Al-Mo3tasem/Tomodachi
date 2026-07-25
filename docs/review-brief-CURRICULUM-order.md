# Tomodachi — Final Curriculum Order Review (self-contained)

> **How to use:** paste this ENTIRE file to a Japanese-pedagogy expert or AI model. Confirms the BUILT lesson order (an earlier review approved the plan; this checks the finished sequence).

## 1. PROMPT

You are an expert in **JLPT N5 curriculum design and Japanese second-language acquisition**. Below is the FINAL, built linear lesson order for a beginner Japanese app for Arabic speakers — 133 lessons woven into one path, plus the grammar sub-sequence. Judge it for: (1) dependency correctness (nothing taught before its prerequisites — e.g. a grammar point before the verb form it needs); (2) pacing and cognitive load; (3) motivation for beginners. This order was already revised once by four reviewers (copula-first grammar, dakuten-before-greetings, food-before-を, katakana after early vocab) — your job is to catch anything that survived. Flag any specific lesson that is mis-placed. Answer ONLY in the section-4 schema.

## 2. CONTEXT

- Tracks & counts: Hiragana 16 lessons, Katakana 16, Vocab 47 (thematic clusters + 5 katakana-loanword mini-lessons), Grammar 54 (one point per lesson). Kanji is NOT yet in the path (authored later).
- Locked rules: hiragana rows 1–10 before any vocabulary; grammar in dependency order with です first; no more than ~3 same-type lessons in a row.
- `globalOrder` is reshuffle-safe, so any change you suggest is cheap to apply.

## 3a. THE FULL LINEAR PATH (globalOrder → lessonKey — English title)

```
  1  hiragana:01                  The あ Row — Vowels
  2  hiragana:02                  The か Row — K Sounds
  3  hiragana:03                  The さ Row — S Sounds
  4  hiragana:04                  The た Row — T Sounds
  5  hiragana:05                  The な Row — N Sounds
  6  hiragana:06                  The は Row — H Sounds
  7  hiragana:07                  The ま Row — M Sounds
  8  hiragana:08                  The や Row — Y Sounds
  9  hiragana:09                  The ら Row — R Sounds
 10  hiragana:10                  わ, を and ん — The Last Three
 11  vocab:greetings:1            Greetings
 12  hiragana:11                  Dakuten I — G and Z Sounds
 13  grammar:desu_copula          です — Polite Be
 14  hiragana:12                  Dakuten II — D and B Sounds
 15  vocab:greetings_more:1       More Greetings
 16  grammar:wa_topic             は — the Topic Particle
 17  hiragana:13                  Handakuten — P Sounds
 18  grammar:ka_question          か — Question Marker
 19  vocab:demonstratives:1       This, That & Question Words · 1
 20  hiragana:14                  Yōon I — きゃ, しゃ, ちゃ
 21  grammar:no_possessive        の — Possession and Noun Links
 22  vocab:demonstratives:2       This, That & Question Words · 2
 23  hiragana:15                  Yōon II — にゃ, ひゃ, みゃ, りゃ
 24  grammar:ga_subject           が — the Subject Marker
 25  hiragana:16                  Yōon III — ぎゃ, じゃ, びゃ, ぴゃ
 26  vocab:numbers:1              Numbers · 1
 27  grammar:mo_also              も — Also and Too
 28  vocab:numbers:2              Numbers · 2
 29  vocab:verbs:1                Everyday Verbs · 1
 30  grammar:masu_polite          ます — Polite Verb Ending
 31  vocab:food:1                 Food & Drink · 1
 32  grammar:wo_object            を — the Object Particle
 33  vocab:verbs:2                Everyday Verbs · 2
 34  katakana:01                  Katakana ア Row — Vowels
 35  vocab:food:2                 Food & Drink · 2
 36  vocab:places:1               Places · 1
 37  grammar:ni_target            に — Target, Time, Place
 38  katakana:02                  Katakana カ Row — K Sounds
 39  vocab:places:2               Places · 2
 40  grammar:de_location          で — Action Place and Means
 41  vocab:adjectives:1           Everyday Adjectives · 1
 42  katakana:03                  Katakana サ Row — S Sounds
 43  grammar:he_direction         へ — Direction Particle
 44  vocab:adjectives:2           Everyday Adjectives · 2
 45  grammar:to_with_and          と — With and Complete And
 46  katakana:04                  Katakana タ Row — T Sounds
 47  vocab:time:1                 Time & Days · 1
 48  grammar:kara_from            から — From the Starting Point
 49  grammar:made_until           まで — Until the Endpoint
 50  katakana:05                  Katakana ナ Row — N Sounds
 51  vocab:time:2                 Time & Days · 2
 52  grammar:ya_and_etc           や — Partial And
 53  vocab:time:3                 Time & Days · 3
 54  katakana:06                  Katakana ハ Row — H Sounds
 55  grammar:arimasu_inanimate    あります — Inanimate Existence
 56  grammar:imasu_animate        います — Animate Existence
 57  vocab:family:1               Family & People · 1
 58  katakana:07                  Katakana マ Row — M Sounds
 59  grammar:ne_confirm           ね — Shared Feeling
 60  vocab:family:2               Family & People · 2
 61  katakana:08                  Katakana ヤ Row — Y Sounds
 62  grammar:yo_assert            よ — New Information
 63  vocab:counters:1             Counters
 64  katakana:09                  Katakana ラ Row — R Sounds
 65  grammar:masen_neg            ません — Polite Negative Verbs
 66  vocab:transport:1            Getting Around · 1
 67  katakana:10                  ワ, ヲ and ン — And a Famous Trap
 68  vocab:katakana_words:1       Katakana Words · 1
 69  grammar:mashita_past         ました — Polite Past Verbs
 70  vocab:transport:2            Getting Around · 2
 71  katakana:11                  Katakana Dakuten I — G and Z
 72  vocab:katakana_words:2       Katakana Words · 2
 73  grammar:masendeshita         ませんでした — Polite Past Negative
 74  vocab:body:1                 Body & Feelings · 1
 75  katakana:12                  Katakana Dakuten II — D and B
 76  vocab:katakana_words:3       Katakana Words · 3
 77  grammar:mashou               ましょう — Let's Do It
 78  vocab:body:2                 Body & Feelings · 2
 79  katakana:13                  Katakana Handakuten — P
 80  vocab:katakana_words:4       Katakana Words · 4
 81  vocab:katakana_words:5       Katakana Words · 5
 82  vocab:nature:1               Weather & Nature · 1
 83  katakana:14                  Katakana Yōon I — キャ, シャ, チャ
 84  grammar:deshita_past         でした — Polite Past Be
 85  vocab:nature:2               Weather & Nature · 2
 86  katakana:15                  Katakana Yōon II — ニャ, ヒャ, ミャ, リャ
 87  grammar:ja_nai_neg           じゃない — Not Be
 88  vocab:adverbs:1              Adverbs & Connectors · 1
 89  katakana:16                  Katakana Yōon III — ギャ, ジャ, ビャ, ピャ
 90  grammar:tai_want             たい — Want to Do
 91  vocab:adverbs:2              Adverbs & Connectors · 2
 92  grammar:i_adj                い-Adjectives — Built-In Predicates
 93  vocab:adjectives:3           Everyday Adjectives · 3
 94  grammar:i_adj_neg            くない — Negative い-Adjectives
 95  vocab:home_verbs:1           Home & Routine Verbs · 1
 96  grammar:i_adj_past           かった — Past い-Adjectives
 97  vocab:colors:1               Colors & More Adjectives · 1
 98  grammar:na_adj               な-Adjectives — Noun-Like Adjectives
 99  vocab:colors:2               Colors & More Adjectives · 2
100  grammar:na_adj_neg           じゃない — Negative な-Adjectives
101  vocab:home_verbs:2           Home & Routine Verbs · 2
102  grammar:na_adj_past          でした — Past な-Adjectives
103  vocab:colors:3               Colors & More Adjectives · 3
104  grammar:te_form              て Form — Verb Connector
105  vocab:home_verbs:3           Home & Routine Verbs · 3
106  grammar:te_kudasai           てください — Polite Requests
107  vocab:objects:1              Everyday Objects · 1
108  grammar:te_iru               ている — Ongoing State
109  vocab:objects:2              Everyday Objects · 2
110  grammar:te_mo_ii             てもいい — Permission
111  vocab:objects:3              Everyday Objects · 3
112  grammar:te_wa_ikenai         てはいけない — Prohibition
113  vocab:school:1               School & Study · 1
114  grammar:da_copula            だ — Plain Be
115  grammar:nai_neg              ない — Plain Negative Verbs
116  vocab:school:2               School & Study · 2
117  grammar:ta_past              た — Plain Past Verbs
118  vocab:social_verbs:1         Work, Play & Exchange Verbs · 1
119  grammar:koto_ga_dekiru       ことができる — Can Do
120  vocab:social_verbs:2         Work, Play & Exchange Verbs · 2
121  grammar:dochira_which        どちら — Which of Two
122  grammar:yori_than            より — Than in Comparisons
123  grammar:ichiban_most         一番 — The Most
124  grammar:kara_because         から — Because
125  grammar:dakara_so            だから — So and Therefore
126  grammar:demo_but             でも — But at Sentence Start
127  grammar:kedo_but             けど — But and Although
128  grammar:sorekara_then        それから — And Then
129  grammar:toki_when            時 — When Something Happens
130  grammar:mae_ni_before        前に — Before Doing
131  grammar:ato_de_after         後で — After Doing
132  grammar:nagara_while         ながら — While Doing
133  grammar:deshou_probably      でしょう — Probably and Soft Guess
```

## 3b. THE GRAMMAR SUB-SEQUENCE (A-hybrid, function-first — the 54 points in teaching order)

```
 1  です — Polite Be
 2  は — the Topic Particle
 3  か — Question Marker
 4  の — Possession and Noun Links
 5  が — the Subject Marker
 6  も — Also and Too
 7  ます — Polite Verb Ending
 8  を — the Object Particle
 9  に — Target, Time, Place
10  で — Action Place and Means
11  へ — Direction Particle
12  と — With and Complete And
13  から — From the Starting Point
14  まで — Until the Endpoint
15  や — Partial And
16  あります — Inanimate Existence
17  います — Animate Existence
18  ね — Shared Feeling
19  よ — New Information
20  ません — Polite Negative Verbs
21  ました — Polite Past Verbs
22  ませんでした — Polite Past Negative
23  ましょう — Let's Do It
24  でした — Polite Past Be
25  じゃない — Not Be
26  たい — Want to Do
27  い-Adjectives — Built-In Predicates
28  くない — Negative い-Adjectives
29  かった — Past い-Adjectives
30  な-Adjectives — Noun-Like Adjectives
31  じゃない — Negative な-Adjectives
32  でした — Past な-Adjectives
33  て Form — Verb Connector
34  てください — Polite Requests
35  ている — Ongoing State
36  てもいい — Permission
37  てはいけない — Prohibition
38  だ — Plain Be
39  ない — Plain Negative Verbs
40  た — Plain Past Verbs
41  ことができる — Can Do
42  どちら — Which of Two
43  より — Than in Comparisons
44  一番 — The Most
45  から — Because
46  だから — So and Therefore
47  でも — But at Sentence Start
48  けど — But and Although
49  それから — And Then
50  時 — When Something Happens
51  前に — Before Doing
52  後で — After Doing
53  ながら — While Doing
54  でしょう — Probably and Soft Guess
```

## 4. REQUIRED OUTPUT SCHEMA

```json
{
  "reviewer": "<name + one-line credential>",
  "overall_verdict": "approve | approve_with_changes | rework",
  "dependency_errors": [
    { "lesson": "<lessonKey or globalOrder>", "problem": "<what prerequisite is missing>", "fix": "<move where>" }
  ],
  "pacing_issues": [
    { "location": "<globalOrder range>", "issue": "<too dense / too sparse / too many same-type>", "fix": "<specific>" }
  ],
  "grammar_order_issues": [
    { "point": "<e.g. を>", "problem": "<...>", "fix": "<move before/after ...>" }
  ],
  "notable_good_choices": ["<what to keep deliberately>"],
  "confidence_notes": "<where you're least sure>"
}
```
