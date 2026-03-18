import { getOpenAIClient } from "@/lib/openai/client";
import { generateTextWithGeminiFlash } from "@/lib/gemini/text-client";
import { AdCopyFieldType } from "@/lib/types/ad-copies";

// ---------------------------------------------------------------------------
// Language normalisation
// Maps any user-facing language string (including native spellings) to a
// canonical lowercase key used for map lookups throughout this file.
// Adding a new language = one alias entry here + one entry in each map below.
// ---------------------------------------------------------------------------
function normalizeLanguage(lang: string): string {
  const aliases: Record<string, string> = {
    english: "english",
    spanish: "spanish", español: "spanish", espanol: "spanish",
    french: "french", français: "french", francais: "french",
    swedish: "swedish", svenska: "swedish",
    japanese: "japanese", "日本語": "japanese",
  };
  return aliases[lang.toLowerCase()] ?? "english";
}

// ---------------------------------------------------------------------------
// System prompts — one per language
// Each tells the model WHO it is, WHAT the algorithm rewards, and the
// NON-NEGOTIABLE copywriting rules for that locale.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPTS: Record<string, string> = {

  english: `You are a senior direct-response copywriter for Meta ads, specialising in content arbitrage campaigns that drive traffic to AdSense-monetised informational guides.

Meta's Andromeda and GEM systems score ads on ENGAGEMENT PROBABILITY — predicted CTR, dwell time, and return visits. They reward copy that reads naturally and triggers real human emotional responses. They penalise keyword repetition that sounds robotic, because their models are trained on human language and recognise low-quality patterns.

YOUR NON-NEGOTIABLE RULES:
- Primary keyword: max 2–3 mentions across the ENTIRE primary text. Never twice in the same line.
- Every sentence must pass the human test: read it out loud. If it sounds like a search query, rewrite it.
- "Etihad Airways jobs or Etihad Airways jobs near me" is NOT a sentence — it is two search queries glued together. Never write copy like this.
- Copy should feel like a well-informed person sharing something useful — not a keyword list with emojis bolted on.
- Frame all copy as independent informational guides (not job applications or direct sales).
- Geographic anchors ("near you", city name, country) appear ONCE, naturally embedded in a sentence.
- Em dash rule: NEVER use em dashes (—) in the copy you generate. They are a statistical fingerprint of AI-generated text and reduce copy credibility. Use a period, colon, or comma instead.

Keyword hierarchy for employment campaigns:
- PRIMARY — use in headline (required) and primary text 1-2x: "jobs", "job openings", "job guide"
- SECONDARY — primary text max 1x, never leads the sentence: "careers", "how to apply", "hiring"
- DESCRIPTIONS ONLY — long-tail variants, never in primary text: "roles", "positions"
- BANNED — never appear anywhere: "opportunities", "team members", "workforce"`,

  spanish: `Eres un redactor senior de respuesta directa para anuncios de Meta, especializado en campañas de arbitraje de contenido que dirigen tráfico hacia sitios web de guías informativas monetizados con Google AdSense.

Los sistemas Andromeda y GEM de Meta califican los anuncios según la PROBABILIDAD DE ENGAGEMENT — CTR predicho, tiempo en página y visitas de retorno. Recompensan el copy que se lee naturalmente y genera respuestas emocionales reales. Penalizan la repetición de palabras clave que suena robótica.

TUS REGLAS NO NEGOCIABLES:
- Palabra clave principal: máximo 2–3 menciones en todo el texto principal. Nunca dos veces en la misma línea.
- Cada oración debe superar la prueba humana: léela en voz alta. Si suena como una consulta de búsqueda, reescríbela.
- El copy debe sentirse como una persona bien informada compartiendo algo útil — no una lista de keywords con emojis.
- Presenta todo el contenido como guías informativas independientes (no solicitudes de empleo ni ventas directas).
- Anclas geográficas ("cerca de ti", nombre de ciudad) aparecen UNA vez, integradas naturalmente en una oración.
- Todo el contenido en español neutro latinoamericano.
- Regla de raya: NUNCA uses rayas largas (—) en el copy. Son una huella estadística de texto generado por IA. Usa punto, dos puntos o coma en su lugar.

Jerarquía de palabras clave para campañas de empleo:
- PRIMARIAS — obligatorias en titular, 1-2x en texto principal: "empleos", "empleo", "oferta de empleo"
- SECUNDARIAS — máx 1x en texto, nunca encabeza: "contratación", "cómo aplicar"
- SOLO EN DESCRIPCIONES — variantes de cola larga: "puestos", "posiciones", "vacantes"
- PROHIBIDAS — nunca aparecen: "oportunidades laborales", "oportunidades de trabajo"`,

  french: `Vous êtes un rédacteur publicitaire senior spécialisé dans les annonces Meta pour les campagnes d'arbitrage de contenu qui dirigent le trafic vers des guides informatifs monétisés avec Google AdSense.

Les systèmes Andromeda et GEM de Meta évaluent les annonces sur la PROBABILITÉ D'ENGAGEMENT — CTR prédit, temps passé sur la page et visites de retour. Ils récompensent le texte qui se lit naturellement et déclenche de vraies réponses émotionnelles. Ils pénalisent la répétition de mots-clés qui sonne robotique.

RÈGLES NON NÉGOCIABLES :
- Mot-clé principal : 2–3 mentions maximum dans tout le texte principal. Jamais deux fois dans la même ligne.
- Chaque phrase doit passer le test humain : lisez-la à voix haute. Si elle ressemble à une requête de recherche, réécrivez-la.
- Utilisez "vous" (pas "tu"). Ton : professionnel mais accessible. Les lecteurs français sont sceptiques — le texte doit paraître crédible.
- Présentez tout le contenu comme des guides informatifs indépendants (pas des candidatures ou des ventes directes).
- Ancres géographiques (ville, pays, "près de chez vous") : UNE seule fois, intégrée naturellement dans une phrase.
- Respectez la ponctuation française : espace avant : ; ! ?
- Règle du tiret : N'utilisez JAMAIS de tirets longs (—) dans le texte. C'est une empreinte statistique du texte généré par IA. Utilisez un point, deux-points ou une virgule à la place.

Hiérarchie des mots-clés pour les campagnes d'emploi :
- PRIMAIRES — obligatoires en titre, 1-2x dans le texte : "emploi(s)", "offres d'emploi", "travailler chez"
- SECONDAIRES — max 1x dans le texte, jamais en tête : "recrutement", "comment postuler", "candidature"
- DESCRIPTIONS UNIQUEMENT — variantes longue traîne : "postes", "fonctions"
- INTERDITS — n'apparaissent jamais : "opportunités professionnelles", "opportunités de carrière"`,

  swedish: `Du är en senior direct response-copywriter för Meta-annonser, specialiserad på content arbitrage-kampanjer som driver trafik till AdSense-monetiserade informationsguider.

Metas Andromeda- och GEM-system bedömer annonser utifrån ENGAGEMANGSSANNOLIKHET — förutsagt CTR, tid på sidan och återbesök. De belönar text som läses naturligt och utlöser verkliga känslomässiga reaktioner. De straffar nyckelordsupprepning som låter robotaktigt.

ICKE FÖRHANDLINGSBARA REGLER:
- Primärt nyckelord: max 2–3 gånger i hela primärtexten. Aldrig två gånger på samma rad.
- Varje mening måste klara det mänskliga testet: läs den högt. Om den låter som en sökfråga, skriv om den.
- Använd "du" (inte "ni") — "ni" låter gammaldags i moderna annonser. Ton: direkt och informativ, ingen hype.
- Presentera allt innehåll som oberoende informationsguider (inte jobbansökningar eller direktförsäljning).
- Geografiska ankare ("nära dig", stad, "i Sverige") förekommer EN gång, naturligt inbäddade i en mening.
- Korrekt stavning av å, ä, ö är obligatorisk — fel stavning förstör trovärdigheten omedelbart.
- Tankstrecksregel: Använd ALDRIG tankstreck (—) i copy. Det är ett statistiskt fingeravtryck av AI-genererad text och minskar trovärdigheten. Använd punkt, kolon eller komma istället.

Nyckelordshierarki för jobbkampanjer:
- PRIMÄRA — obligatoriska i rubrik, 1-2x i text: "jobb", "lediga jobb", "jobbguide"
- SEKUNDÄRA — max 1x i text, leder aldrig: "anställning", "hur du ansöker", "rekrytering"
- BARA I BESKRIVNINGAR — långsvanssvarianter: "tjänster", "roller"
- FÖRBJUDNA — förekommer aldrig: "möjligheter", "karriärmöjligheter"`,

  japanese: `あなたはMetaの広告専門シニアダイレクトレスポンスコピーライターです。Google AdSenseで収益化された情報ガイドサイトへのトラフィックを誘導するコンテンツアービトラージキャンペーンを専門としています。

MetaのAndromedaとGEMシステムは「エンゲージメント確率」で広告を評価します。予測CTR、滞在時間、再訪問率が基準です。自然に読めるコピーを評価し、ロボット的なキーワード繰り返しにはペナルティを課します。

絶対ルール：
- 主要キーワード：テキスト全体で最大2〜3回。同じ行に2回は絶対NG。
- すべての文は「人間テスト」に合格すること：声に出して読む。検索クエリのように聞こえたら書き直す。
- 丁寧語（です・ます調）を使用すること。タメ口は広告では失礼に聞こえる。
- すべてのコンテンツを独立した情報ガイドとして提示する（直接応募や販売ではない）。
- ブランド名はカタカナで記載する（例：マクドナルド、エティハド航空）。
- 地理的アンカー（「近くの」「お近くの」「都市名」）は一度だけ、文の中に自然に入れる。
- 文は短く明確に。長い複合文は読者を失う。
- ダッシュルール：コピーにはエムダッシュ（—または——）を絶対に使用しないこと。AI生成テキストの統計的な特徴であり、信頼性を下げます。代わりに句点（。）、読点（、）、またはコロン（：）を使用してください。

雇用キャンペーンのキーワード階層：
- 主要（ヘッドライン必須、テキスト1〜2回）：「求人」「求人情報」「採用情報」
- 補助（テキスト最大1回、冒頭不可）：「採用」「応募方法」
- 説明文のみ（本文には使わない）：「役職」「ポジション」
- 禁止：「キャリアの機会」「チャンス」などの曖昧な機会表現`,
};

// ---------------------------------------------------------------------------
// Field instructions — per language, per field type
// Each entry encodes the Sprint / Story / Deep Dive format system with
// locale-appropriate phrasing, examples, and angle variety requirements.
// ---------------------------------------------------------------------------
const COPY_INSTRUCTIONS: Record<string, Record<AdCopyFieldType, string>> = {

  // -------------------------------------------------------------------------
  english: {
    headline: `Generate META AD HEADLINES in ALL CAPS. Each must be under 40 characters.
Write punchy, specific phrases — not just "[brand] jobs near you" repeated with synonyms.
Every headline must contain "JOBS" or "JOB" — never just brand + action verb alone.
Strong patterns:
- "[BRAND] IS HIRING: HOW TO APPLY"
- "HOW TO LAND A JOB AT [BRAND]"
- "[BRAND] JOBS: THE FULL GUIDE"
- "[BRAND] JOBS: WHAT MOST PEOPLE MISS"
- "[BRAND] JOBS GUIDE [YEAR]"
- "WORK AT [BRAND]: STEP-BY-STEP"
- "[BRAND] JOBS: ARE YOU ELIGIBLE?"
- "EVERYTHING ABOUT [BRAND] JOBS"
Rules: ALL CAPS, under 40 characters, brand name once per headline maximum, no em dashes (—), no sentence that reads like a keyword list.
Extract the brand name from the campaign name.`,

    primary_text: `Generate META AD PRIMARY TEXT for content arbitrage campaigns.
Produce 5 variations using THREE different formats — NOT all the same structure.

CRITICAL: Every sentence must pass the human test — read it out loud. If it sounds like a search query or a keyword list, rewrite it. Meta's Andromeda algorithm rewards ENGAGEMENT PROBABILITY, not keyword density.

---

FORMAT A — SPRINT (use for variations 1, 2, 3):
Exactly 3 lines. Each line is ONE complete sentence (never a fragment or a search query glued together).
- Line 1: Opens with 1 relevant emoji. Specific hook or insight — something the reader didn't know or hadn't considered. Brand name max ONCE.
- Line 2: What the article covers — specific roles, steps, or details. Ends with 📋 or 📝
- Line 3: Reinforce it's an independent guide + curiosity or urgency trigger. Ends with 🔎 or ✅
Brand name appears max 2× across all 3 lines. Never repeat the same phrase twice in the same variation.

Keyword rule for primary text: Use "jobs" as the primary word (not "roles", "positions", or "opportunities"). "Roles" and "positions" may only appear in the Description field. "Opportunities", "team members", and "workforce" are banned entirely.

Good Sprint example (statement format — use for variations 2, 3):
✈️ Etihad Airways is hiring across multiple departments. Most people don't know where to start.
From cabin crew to ground operations, warehouse jobs to HQ: here's the full picture. 📋
This independent guide covers requirements, pay, and how to apply for Etihad jobs near you. 🔎

SPRINT QUESTION FORMAT (use specifically for variation 1):
- Line 1: Emoji at START, sentence ends with "?" — mirrors the reader's active search intent. Brand name max ONCE.
- Line 2: Starts with 📋 emoji. One sentence covering the specific job types or steps they'll find inside.
- Line 3: Starts with 📍 emoji. One sentence — step-by-step guide framing or geographic anchor.

Good question-format example:
✈️ Looking for Etihad Airways jobs near you?
📋 Learn how to apply for cabin crew, warehouse, and ground operations jobs at Etihad.
📍 Step-by-step application guide: requirements, pay, and how to get hired.

Bad Sprint example (DO NOT do this for any variation):
✈️ Searching for Etihad Airways jobs or Etihad Airways jobs near me?
📝 Find top tips for Etihad Airways hiring, Etihad Airways warehouse jobs, and Etihad Airways store jobs.
(The bad example repeats the same phrase in the same line and reads like a keyword list.)

---

FORMAT B — STORY (use for variation 4):
2 short paragraphs. NO emoji until the very last word of the entire copy.
- Para 1 (2–3 sentences): Opens with a real insight, problem, or counterintuitive observation about the topic. The reader should feel understood before they know what you're about to tell them. Brand name appears naturally, once.
- Para 2 (2–3 sentences): What they'll get from clicking — specific and concrete. Geographic anchor. Ends with ONE emoji (the only one).
Tone: like a well-informed friend sharing something useful, not an ad.

---

FORMAT C — DEEP DIVE (use for variation 5):
3–4 paragraphs. Lower raw CTR than Sprint — but the readers who click stay longer and generate more AdSense revenue. Judge this format by revenue per click, not CTR.
- Para 1: Counterintuitive insight or real problem. No brand name yet.
- Para 2: Specific details — roles, steps, what most applicants miss. Brand name appears here, naturally, once.
- Para 3: What the guide covers — specific sections. Clicking should feel like the obvious next move.
- Para 4 (optional): Close with a re-hook targeting a specific sub-audience. ONE emoji at the very end, nothing else.

---

ANGLE VARIETY across the 5 variations:
1. Sprint — Direct Search / Question Hook (use QUESTION FORMAT: emoji start, line 1 ends with ?, lines 2-3 start with 📋 and 📍)
2. Sprint — Curiosity Hook (statement format: "Most people who apply don't realise...")
3. Sprint — Social Proof (statement format: volume or FOMO with specific numbers or scale)
4. Story — Question Hook (cold traffic, discovery audience who isn't actively searching)
5. Deep Dive — Trust Builder (engagement cluster, 35+ audience, high dwell time)

Extract the brand/topic from the campaign name. Separate each variation with a blank line.`,

    description: `Generate META AD DESCRIPTIONS for content arbitrage campaigns.
Produce 5 descriptions — the style must match the corresponding primary text format:

For SPRINT variations (1–3) — KEYWORD-DENSE style:
Start with ⭐⭐⭐⭐⭐. Keywords appear inside readable sentence fragments separated by commas cleanly — NOT crammed mid-phrase. 150–250 characters.
Good example: "⭐⭐⭐⭐⭐ Independent guide covering Etihad Airways jobs, cabin crew requirements, ground staff jobs, warehouse openings, how to apply online: step-by-step application instructions included."
Bad example: "⭐⭐⭐⭐⭐ Etihad Airways jobs, Etihad Airways jobs near me, Etihad Airways hiring, Etihad Airways warehouse jobs..." (keyword repetition)

For STORY variation (4) and DEEP DIVE variation (5) — CONVERSATIONAL style:
Start with ⭐⭐⭐⭐⭐. One or two clean, complete sentences. Should read like a human wrote it.
Good example: "⭐⭐⭐⭐⭐ Everything you need to know about applying for Etihad Airways jobs in one place. Roles, requirements, and the full process explained simply."

Rules: extract brand/topic from campaign name. Never repeat the same phrase more than twice across the entire description.`,
  },

  // -------------------------------------------------------------------------
  spanish: {
    headline: `Genera TITULARES PARA ANUNCIOS DE META en MAYÚSCULAS. Cada uno debe tener menos de 40 caracteres.
Frases directas y específicas — no listas de palabras clave repetidas.
Al menos 3 de 8 patrones deben contener "EMPLEO" o "EMPLEOS".
Patrones fuertes:
- "[MARCA] ESTÁ CONTRATANDO: CÓMO APLICAR"
- "TRABAJA EN [MARCA]: GUÍA COMPLETA"
- "EMPLEO EN [MARCA]: LO QUE DEBES SABER"
- "CÓMO CONSEGUIR EMPLEO EN [MARCA]"
- "EMPLEOS EN [MARCA] [AÑO]"
- "[MARCA]: ¿CUMPLES LOS REQUISITOS?"
- "GUÍA DE EMPLEOS EN [MARCA]"
- "TODO SOBRE EMPLEOS EN [MARCA]"
Todos en MAYÚSCULAS, menos de 40 caracteres, nombre de marca máximo una vez por titular, sin rayas largas (—).
Extrae el nombre de la marca del nombre de la campaña.`,

    primary_text: `Genera TEXTO PRINCIPAL para anuncios de Meta de campañas de arbitraje de contenido.
Produce 5 variaciones usando TRES formatos diferentes — NO todas la misma estructura.

CRÍTICO: Cada oración debe superar la prueba humana — léela en voz alta. Si suena como una lista de palabras clave o una consulta de búsqueda, reescríbela.

---

Regla de palabras clave: Usa "empleos" como palabra principal (no "vacantes", "puestos" u "oportunidades" en el texto principal). "Puestos" y "posiciones" solo en la descripción. "Oportunidades laborales" está prohibido.

FORMATO A — SPRINT (usa para variaciones 2, 3):
Exactamente 3 líneas. Cada línea es UNA oración completa. Sin rayas largas (—) en ninguna línea.
- Línea 1: Comienza con 1 emoji relevante. Gancho específico en forma de afirmación. Nombre de marca máximo UNA vez.
- Línea 2: Qué cubre el artículo — empleos, pasos o detalles específicos. Termina con 📋 o 📝
- Línea 3: Refuerza que es una guía independiente + curiosidad o urgencia. Termina con 🔎 o ✅
Nombre de marca máximo 2 veces en las 3 líneas. Nunca repitas la misma frase dos veces.

FORMATO SPRINT PREGUNTA (usa específicamente para variación 1):
- Línea 1: Emoji al INICIO, oración termina con "?" — refleja exactamente lo que el lector está buscando. Nombre de marca máximo UNA vez.
- Línea 2: Comienza con 📋. Una oración sobre los tipos de empleos o pasos que encontrarán.
- Línea 3: Comienza con 📍. Una oración — guía paso a paso o ancla geográfica.

Buen ejemplo formato pregunta:
✈️ ¿Buscas empleos en Etihad cerca de ti?
📋 Aprende cómo aplicar a empleos de almacén, cabina y operaciones en Etihad.
📍 Guía paso a paso: requisitos, sueldo y cómo conseguir el empleo.

---

FORMATO B — HISTORIA (usa para variación 4):
2 párrafos cortos. SIN emoji hasta la última palabra de todo el texto.
- Párrafo 1 (2–3 oraciones): Abre con una observación real o contraintuitiva. Nombre de marca aparece naturalmente, una vez.
- Párrafo 2 (2–3 oraciones): Qué obtendrán al hacer clic — específico y concreto. Ancla geográfica. Termina con UN emoji.
Tono: como un amigo bien informado compartiendo algo útil.

---

FORMATO C — ANÁLISIS PROFUNDO (usa para variación 5):
3–4 párrafos. CTR más bajo que Sprint pero lectores de mayor calidad.
- Párrafo 1: Dato contraintuitivo. Sin nombre de marca aún.
- Párrafo 2: Detalles específicos. Nombre de marca aparece aquí, naturalmente, una vez.
- Párrafo 3: Qué cubre la guía. El clic debe sentirse como el siguiente paso obvio.
- Párrafo 4 (opcional): Reenganche para subaudiencia específica. UN emoji al final.

---

ÁNGULOS para las 5 variaciones:
1. Sprint — Búsqueda directa / Pregunta (usa FORMATO PREGUNTA: emoji al inicio, línea 1 termina con ?, líneas 2-3 comienzan con 📋 y 📍)
2. Sprint — Gancho de curiosidad (formato afirmación: "La mayoría no sabe que...")
3. Sprint — Prueba social (formato afirmación: volumen o FOMO con números)
4. Historia — Gancho de pregunta (tráfico frío)
5. Análisis profundo — Constructor de confianza (audiencia 35+)

Extrae la marca/tema del nombre de la campaña. Separa cada variación con una línea en blanco. Todo en español neutro latinoamericano.`,

    description: `Genera DESCRIPCIONES PARA ANUNCIOS DE META de campañas de arbitraje de contenido.
Produce 5 descripciones — el estilo debe coincidir con el formato del texto principal correspondiente:

Para variaciones SPRINT (1–3) — estilo DENSO EN PALABRAS CLAVE:
Comienza con ⭐⭐⭐⭐⭐. Las palabras clave aparecen en fragmentos legibles separados por comas — NO acumuladas en frases forzadas. 150–250 caracteres.
Ejemplo: "⭐⭐⭐⭐⭐ Guía independiente sobre empleos en [Marca], requisitos por puesto, cómo aplicar en línea y qué esperar en el proceso de selección: paso a paso."

Para variación HISTORIA (4) y ANÁLISIS PROFUNDO (5) — estilo CONVERSACIONAL:
Comienza con ⭐⭐⭐⭐⭐. Una o dos oraciones limpias y completas.
Ejemplo: "⭐⭐⭐⭐⭐ Todo lo que necesitas saber para aplicar a empleos en [Marca]. Puestos disponibles, requisitos y el proceso explicado de forma simple."

Reglas: extrae marca/tema del nombre de la campaña. Nunca repitas la misma frase más de dos veces. Todo en español neutro latinoamericano.`,
  },

  // -------------------------------------------------------------------------
  french: {
    headline: `Générez des TITRES POUR LES ANNONCES META en MAJUSCULES. Chaque titre doit faire moins de 40 caractères.
Phrases directes et spécifiques — pas des listes de mots-clés répétés.
Au moins 3 modèles sur 8 doivent contenir "EMPLOI" ou "EMPLOIS".
Modèles efficaces :
- "[MARQUE] RECRUTE: COMMENT POSTULER"
- "TRAVAILLER CHEZ [MARQUE] : GUIDE COMPLET"
- "EMPLOI [MARQUE] : CE QU'IL FAUT SAVOIR"
- "COMMENT OBTENIR UN EMPLOI CHEZ [MARQUE]"
- "OFFRES D'EMPLOI [MARQUE] [ANNÉE]"
- "GUIDE D'EMPLOI [MARQUE]"
- "[MARQUE] : ÊTES-VOUS ÉLIGIBLE ?"
- "TOUT SUR LES EMPLOIS [MARQUE]"
Tous en MAJUSCULES, moins de 40 caractères, nom de marque une fois maximum par titre, sans tirets longs (—). Respectez les accents (é, è, ê, à, ç).
Extrayez le nom de la marque du nom de la campagne.`,

    primary_text: `Générez du TEXTE PRINCIPAL pour les annonces Meta de campagnes d'arbitrage de contenu.
Produisez 5 variations en utilisant TROIS formats différents — pas tous la même structure.

CRITIQUE : Chaque phrase doit passer le test humain — lisez-la à voix haute. Si elle ressemble à une requête de recherche ou une liste de mots-clés, réécrivez-la. Utilisez "vous" tout au long. Respectez les accents (é, è, ê, à, ç, ô, û) et la ponctuation française (espace avant : ; ! ?).

---

Règle des mots-clés : Utilisez "emplois" ou "emploi" comme mot principal (pas "postes", "fonctions" ou "opportunités" dans le texte principal). "Postes" et "fonctions" sont réservés à la description uniquement.

FORMAT A — SPRINT (pour les variations 2, 3) :
Exactement 3 lignes. Chaque ligne est UNE phrase complète. Aucun tiret long (—) dans aucune ligne.
- Ligne 1 : Commence par 1 emoji. Accroche spécifique en mode affirmation. Nom de marque max UNE fois.
- Ligne 2 : Ce que couvre l'article — emplois, étapes ou détails spécifiques. Se termine par 📋 ou 📝
- Ligne 3 : Renforce que c'est un guide indépendant + déclencheur de curiosité. Se termine par 🔎 ou ✅
Nom de marque max 2× sur les 3 lignes. Ne répétez jamais la même expression deux fois.

Bon exemple Sprint (affirmation) :
✈️ Etihad Airways recrute dans plusieurs secteurs. La plupart des candidats ne savent pas par où commencer.
Des hôtesses de l'air aux opérations au sol, des entrepôts jusqu'au siège social: voici le tableau complet. 📋
Ce guide indépendant couvre les conditions, la rémunération et comment postuler aux emplois Etihad près de chez vous. 🔎

FORMAT SPRINT QUESTION (pour la variation 1 spécifiquement) :
- Ligne 1 : Emoji au DÉBUT, phrase se termine par "?" — reflète exactement ce que le lecteur cherche. Nom de marque max UNE fois.
- Ligne 2 : Commence par 📋. Une phrase sur les types d'emplois ou les étapes qu'ils trouveront.
- Ligne 3 : Commence par 📍. Une phrase — guide étape par étape ou ancre géographique.

Bon exemple format question :
✈️ Vous cherchez des emplois chez Etihad près de chez vous ?
📋 Découvrez comment postuler aux emplois de cabine, entrepôt et opérations chez Etihad.
📍 Guide étape par étape : conditions, salaire et comment être recruté.

---

FORMAT B — HISTOIRE (pour la variation 4) :
2 courts paragraphes. AUCUN emoji avant le tout dernier mot.
- Para 1 (2–3 phrases) : Ouvre avec une observation réelle ou contre-intuitive. Ton : comme un ami bien informé. Nom de marque une fois.
- Para 2 (2–3 phrases) : Ce qu'ils obtiendront en cliquant — spécifique et concret. Ancre géographique. Se termine par UN emoji.

---

FORMAT C — ANALYSE APPROFONDIE (pour la variation 5) :
3–4 paragraphes. CTR plus bas que Sprint — mais les lecteurs qui cliquent restent plus longtemps.
- Para 1 : Insight contre-intuitif. Pas de nom de marque encore.
- Para 2 : Détails spécifiques. Nom de marque apparaît ici, naturellement, une fois.
- Para 3 : Ce que couvre le guide. Cliquer doit sembler être l'étape évidente suivante.
- Para 4 (optionnel) : Re-accroche pour un sous-public spécifique. UN emoji à la toute fin.

---

ANGLES pour les 5 variations :
1. Sprint — Recherche directe / Question (utilisez FORMAT QUESTION : emoji au début, ligne 1 se termine par ?, lignes 2-3 commencent par 📋 et 📍)
2. Sprint — Accroche curiosité (format affirmation : "La plupart des candidats ignorent que...")
3. Sprint — Preuve sociale (format affirmation : volume ou FOMO avec des chiffres)
4. Histoire — Accroche question (trafic froid, audience de découverte)
5. Analyse approfondie — Créateur de confiance (audience 35+)

Extrayez la marque/sujet du nom de la campagne. Séparez chaque variation par une ligne vide.`,

    description: `Générez des DESCRIPTIONS POUR LES ANNONCES META de campagnes d'arbitrage de contenu.
Produisez 5 descriptions — le style doit correspondre au format du texte principal :

Pour les variations SPRINT (1–3) — style DENSE EN MOTS-CLÉS :
Commencez par ⭐⭐⭐⭐⭐. Les mots-clés apparaissent dans des fragments lisibles séparés par des virgules — PAS entassés en milieu de phrase. 150–250 caractères. Respectez la ponctuation française (espace avant : ! ?).
Exemple : "⭐⭐⭐⭐⭐ Guide indépendant sur les emplois [Marque], les exigences par poste, comment postuler en ligne et les étapes du processus de recrutement: expliqués simplement."

Pour la variation HISTOIRE (4) et ANALYSE APPROFONDIE (5) — style CONVERSATIONNEL :
Commencez par ⭐⭐⭐⭐⭐. Une ou deux phrases complètes et naturelles.
Exemple : "⭐⭐⭐⭐⭐ Tout ce que vous devez savoir pour postuler chez [Marque]. Emplois disponibles, conditions requises et processus de candidature expliqué simplement."

Règles : extrayez la marque/sujet du nom de la campagne. Ne répétez jamais la même expression plus de deux fois.`,
  },

  // -------------------------------------------------------------------------
  swedish: {
    headline: `Generera META-ANNONSRUBRIKER med VERSALER. Varje rubrik måste vara under 40 tecken.
Direkta, specifika fraser — inte upprepade nyckelordslistor.
Starka mönster (varje rubrik ska innehålla "JOBB" eller "LEDIGA JOBB") :
- "[VARUMÄRKE] ANSTÄLLER: HUR DU ANSÖKER"
- "JOBBA HOS [VARUMÄRKE]: KOMPLETT GUIDE"
- "JOBB PÅ [VARUMÄRKE]: DET DU BEHÖVER VETA"
- "HUR DU FÅR JOBB HOS [VARUMÄRKE]"
- "LEDIGA JOBB PÅ [VARUMÄRKE] [ÅR]"
- "JOBBGUIDE FÖR [VARUMÄRKE]"
- "[VARUMÄRKE]: UPPFYLLER DU KRAVEN?"
- "ALLT OM JOBB HOS [VARUMÄRKE]"
Alla med VERSALER, under 40 tecken, varumärke max en gång per rubrik, utan tankstreck (—). Korrekt stavning av å, ä, ö är obligatorisk.
Extrahera varumärket från kampanjnamnet.`,

    primary_text: `Generera META-ANNONSTEXT för innehållsarbitrage-kampanjer.
Producera 5 varianter med TRE olika format — inte alla samma struktur.

KRITISKT: Varje mening måste klara det mänskliga testet — läs den högt. Om den låter som en sökfråga eller nyckelordslista, skriv om den. Använd "du" (inte "ni") genomgående. Korrekt stavning av å, ä, ö är obligatorisk.

---

Nyckelordsregel: Använd "jobb" som primärt ord (inte "tjänster", "roller" eller "möjligheter" i primärtexten). "Tjänster" och "roller" är reserverade för beskrivningar. "Möjligheter" och "karriärmöjligheter" är förbjudna.

FORMAT A — SPRINT (för varianter 2, 3):
Exakt 3 rader. Varje rad är EN fullständig mening. Inga tankstreck (—) på någon rad.
- Rad 1: Börjar med 1 relevant emoji. Specifik krok i påståendeform. Varumärke max EN gång.
- Rad 2: Vad artikeln täcker — specifika jobb, steg eller detaljer. Slutar med 📋 eller 📝
- Rad 3: Bekräftar att det är en oberoende guide + nyfikenhetsutlösare. Slutar med 🔎 eller ✅
Varumärke max 2× på alla 3 rader. Upprepa aldrig samma fras två gånger.

Bra Sprint-exempel (påståendeformat):
✈️ Etihad Airways anställer inom flera avdelningar. De flesta vet inte var de ska börja.
Från kabinpersonal till markoperationer, lagerjobb till huvudkontoret: här är hela bilden. 📋
Den här oberoende guiden täcker krav, lön och hur du ansöker till Etihad-jobb nära dig. 🔎

SPRINT FRÅGEFORMAT (använd specifikt för variant 1):
- Rad 1: Emoji i BÖRJAN, mening slutar med "?" — speglar exakt vad läsaren söker. Varumärke max EN gång.
- Rad 2: Börjar med 📋. En mening om de specifika jobben eller stegen de hittar inuti.
- Rad 3: Börjar med 📍. En mening — steg-för-steg-guide eller geografiskt ankare.

Bra exempel frågeformat:
✈️ Letar du efter jobb hos Etihad nära dig?
📋 Lär dig hur du ansöker till lager-, kabinpersonal- och markoperationsjobb hos Etihad.
📍 Steg-för-steg-guide: krav, lön och hur du får jobbet.

---

FORMAT B — BERÄTTELSE (för variant 4):
2 korta stycken. INGEN emoji förrän allra sista ordet.
- Stycke 1 (2–3 meningar): Öppnar med en verklig insikt eller kontraintuitiv observation. Varumärke nämns naturligt, en gång.
- Stycke 2 (2–3 meningar): Vad de får av att klicka — specifikt och konkret. Geografiskt ankare. Slutar med EN emoji.
Ton: som en välinsatt vän som delar något användbart.

---

FORMAT C — DJUPDYKNING (för variant 5):
3–4 stycken. Lägre rå-CTR än Sprint — men de som klickar stannar längre.
- Stycke 1: Kontraintuitiv insikt. Inget varumärke ännu.
- Stycke 2: Specifika detaljer. Varumärke nämns här, naturligt, en gång.
- Stycke 3: Vad guiden täcker. Att klicka ska kännas som det självklara nästa steget.
- Stycke 4 (valfritt): Omhook för specifik undermålgrupp. EN emoji i slutet.

---

VINKLAR för de 5 varianterna:
1. Sprint — Direkt sökning / Fråga (använd FRÅGEFORMAT: emoji i början, rad 1 slutar med ?, rader 2-3 börjar med 📋 och 📍)
2. Sprint — Nyfikenhetskrok (påståendeformat: "De flesta som ansöker vet inte att...")
3. Sprint — Socialt bevis (påståendeformat: volym eller FOMO med siffror)
4. Berättelse — Frågekrok (kall trafik, discovery-målgrupp)
5. Djupdykning — Förtroendeskapare (35+-målgrupp, hög uppehållstid)

Extrahera varumärke/ämne från kampanjnamnet. Separera varje variant med en tom rad.`,

    description: `Generera ANNONSBESKRIVNINGAR FÖR META av innehållsarbitrage-kampanjer.
Producera 5 beskrivningar — stilen ska matcha motsvarande primärtextformat:

För SPRINT-varianter (1–3) — NYCKELORDSRIK stil:
Börja med ⭐⭐⭐⭐⭐. Nyckelord i läsbara fragment separerade med kommatecken — INTE ihoptryckta mitt i fraser. 150–250 tecken.
Exempel: "⭐⭐⭐⭐⭐ Oberoende guide om jobb hos [Varumärke], krav per tjänst, hur du ansöker online och vad du kan förvänta dig under rekryteringsprocessen: steg för steg."

För BERÄTTELSE-variant (4) och DJUPDYKNING (5) — KONVERSATIONELL stil:
Börja med ⭐⭐⭐⭐⭐. En eller två rena, fullständiga meningar.
Exempel: "⭐⭐⭐⭐⭐ Allt du behöver veta för att söka jobb hos [Varumärke]. Lediga jobb, krav och ansökningsprocessen förklarad på ett enkelt sätt."

Regler: extrahera varumärke/ämne från kampanjnamnet. Upprepa aldrig samma fras mer än två gånger. Korrekt stavning av å, ä, ö är obligatorisk.`,
  },

  // -------------------------------------------------------------------------
  japanese: {
    headline: `Meta広告用のヘッドラインをすべて全角大文字（または英語の場合ALL CAPS）で生成してください。各ヘッドラインは40文字以内にしてください。
直接的で具体的なフレーズを使用してください。キーワードの繰り返しリストは避けてください。
最初の3パターンには必ず「求人」を含めてください。
効果的なパターン：
- 「[ブランド]求人情報：応募方法ガイド」
- 「[ブランド]で働くには：完全ガイド」
- 「[ブランド]求人：知っておくべきこと」
- 「[ブランド]の求人に応募する方法」
- 「[ブランド]求人[年]：最新情報」
- 「[ブランド]採用ガイド：ステップ別解説」
- 「[ブランド]：あなたは条件を満たしていますか？」
- 「[ブランド]求人のすべて」
ブランド名は1ヘッドラインにつき最大1回。エムダッシュ（—または——）は使用禁止。キャンペーン名からブランド名を抽出してください。ブランド名はカタカナで記載してください。`,

    primary_text: `コンテンツアービトラージキャンペーン用のMeta広告プライマリテキストを生成してください。
THREE種類の異なるフォーマットを使用して5つのバリエーションを作成してください。すべて同じ構造にしないでください。

重要：すべての文は「人間テスト」に合格すること。声に出して読む。検索クエリのように聞こえたら書き直す。丁寧語（です・ます調）必須。ブランド名はカタカナで記載。

---

キーワードルール：「求人」「求人情報」を主要語として使用してください（「ポジション」「役職」は説明文のみ。「キャリアの機会」「チャンス」などの曖昧な表現は禁止）。

フォーマットA — スプリント（バリエーション2、3に使用）：
正確に3行。各行は完全な1文（検索クエリのような断片は不可）。エムダッシュ（—または——）は絶対に使用しないこと。
- 1行目：関連する絵文字1つで始める。読者が知らなかった具体的なフック（断定形）。ブランド名は最大1回。
- 2行目：記事が扱う内容。具体的な求人、手順、詳細。📋または📝で終わる。
- 3行目：独立したガイドであることを強調＋好奇心や緊急性のトリガー。🔎または✅で終わる。
3行全体でブランド名は最大2回。同じフレーズを2回繰り返さない。

良いスプリントの例（断定形）：
✈️ エティハド航空は複数の部門で採用中です。多くの方はどこから始めればよいかわかりません。
客室乗務員から地上業務、倉庫スタッフから本社求人まで：全体像をご紹介します。 📋
この独立したガイドでは、条件・給与・お近くのエティハド求人への応募方法をステップごとに説明しています。 🔎

スプリント質問フォーマット（バリエーション1に限定使用）：
- 1行目：絵文字を行頭に置き、文は「？」で終わる——読者の検索意図をそのまま反映。ブランド名は最大1回。
- 2行目：行頭に📋。見つかる求人の種類や手順を1文で。
- 3行目：行頭に📍。ステップ別ガイドの案内または地理的アンカーを1文で。

良い質問フォーマットの例：
✈️ エティハド航空の求人をお近くでお探しですか？
📋 客室乗務員、倉庫スタッフ、地上業務など、エティハドの求人への応募方法をご紹介します。
📍 ステップ別ガイド：条件・給与・採用プロセスをわかりやすく解説しています。

---

フォーマットB — ストーリー（バリエーション4に使用）：
2つの短い段落。最後の単語まで絵文字なし。
- 段落1（2〜3文）：実際の洞察や逆説的な観察から始める。ブランド名を自然に1回使用。
- 段落2（2〜3文）：クリックで得られるもの。具体的に。地理的アンカー。最後に絵文字1つ。
トーン：役立つ情報を共有する、知識豊富な友人のように。

---

フォーマットC — ディープダイブ（バリエーション5に使用）：
3〜4段落。スプリントよりクリック率は低いが、クリックした読者は長く滞在する。
- 段落1：逆説的な洞察。ブランド名はまだ使わない。
- 段落2：具体的な詳細（求人の種類、手順、多くの応募者が見落とすこと）。ここでブランド名を自然に1回使用。
- 段落3：ガイドが扱う内容。クリックが明らかな次のステップに感じられるように。
- 段落4（任意）：特定のサブオーディエンスへの再フック。最後に絵文字1つだけ。

---

5つのバリエーションのアングル：
1. スプリント：直接検索/質問フック（質問フォーマット必須：行頭絵文字、1行目は「？」終わり、2-3行目は📋と📍で始める）
2. スプリント：好奇心フック（断定形：「応募する人のほとんどは知らない...」）
3. スプリント：社会的証明（断定形：数字や規模でFOMO）
4. ストーリー：質問フック（コールドトラフィック）
5. ディープダイブ：信頼構築（35歳以上のオーディエンス）

キャンペーン名からブランド/トピックを抽出してください。各バリエーションを空行で区切ってください。`,

    description: `コンテンツアービトラージキャンペーン用のMeta広告説明文を生成してください。
5つの説明文を作成してください。スタイルは対応するプライマリテキストのフォーマットに合わせてください：

スプリントバリエーション（1〜3）：キーワード密度の高いスタイル：
⭐⭐⭐⭐⭐で始めてください。キーワードは読みやすいフレーズで区切って記載。フレーズの途中に詰め込まない。150〜250文字。
例：「⭐⭐⭐⭐⭐ [ブランド]の求人情報、職種別の条件、オンライン応募方法、採用プロセスの流れを網羅した独立したガイド。ステップごとに解説。」

ストーリーバリエーション（4）とディープダイブ（5）：会話スタイル：
⭐⭐⭐⭐⭐で始めてください。1〜2つの自然な完全文。
例：「⭐⭐⭐⭐⭐ [ブランド]への就職に必要な情報がすべてここに。求人情報、応募条件、採用プロセスをシンプルに解説しています。」

ルール：キャンペーン名からブランド/トピックを抽出。同じフレーズを2回以上繰り返さない。丁寧語（です・ます調）必須。ブランド名はカタカナで記載。`,
  },
};

// ---------------------------------------------------------------------------
// Variant parser — unchanged, handles both JSON and line-by-line responses
// ---------------------------------------------------------------------------
function parseVariants(text: string, count: number): string[] {
  const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/, "$1").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.variants && Array.isArray(parsed.variants)) {
      return parsed.variants.map(String).slice(0, count);
    }
    if (Array.isArray(parsed)) {
      return parsed.map(String).slice(0, count);
    }
  } catch {
    // Fall back to line-by-line extraction
    const lines = cleaned
      .split("\n")
      .map((l) => l.replace(/^[\d]+\.\s*/, "").replace(/^["']|["']$/g, "").trim())
      .filter((l) => l.length > 0);
    return lines.slice(0, count);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function generateAdCopy({
  campaignName,
  fieldType,
  existingVariants,
  count = 5,
  language = "English",
}: {
  campaignName: string;
  fieldType: AdCopyFieldType;
  existingVariants: string[];
  count?: number;
  language?: string;
}): Promise<string[]> {
  const langKey = normalizeLanguage(language);
  const langInstructions = COPY_INSTRUCTIONS[langKey] ?? COPY_INSTRUCTIONS["english"];
  const instructions = langInstructions[fieldType];
  const systemPrompt = SYSTEM_PROMPTS[langKey] ?? SYSTEM_PROMPTS["english"];

  const existingContext =
    existingVariants.length > 0
      ? `\n\nExisting variants (do NOT repeat these, generate completely new ones):\n${existingVariants.map((v, i) => `${i + 1}. ${v}`).join("\n")}`
      : "";

  const userPrompt = `Campaign name: "${campaignName}"

${instructions}

Generate exactly ${count} new unique variants.${existingContext}

Return ONLY a JSON object with a "variants" key containing an array of strings. Example: { "variants": ["variant 1", "variant 2", "variant 3"] }`;

  // Primary: OpenAI GPT-4.1
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 2048,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices[0].message.content ?? "{}";
    const variants = parseVariants(text, count);
    if (variants.length > 0) return variants;
    throw new Error("No variants parsed from GPT-4.1 response");
  } catch (err) {
    console.warn(
      "[ai/copy] GPT-4.1 failed, falling back to Gemini 2.5 Flash:",
      err instanceof Error ? err.message : err
    );
    const raw = await generateTextWithGeminiFlash(systemPrompt, userPrompt);
    return parseVariants(raw, count);
  }
}
