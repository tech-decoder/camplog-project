import { getOpenAIClient } from "@/lib/openai/client";
import { generateTextWithGeminiFlash } from "@/lib/gemini/text-client";
import { AdCopyFieldType } from "@/lib/types/ad-copies";

const FIELD_INSTRUCTIONS: Record<AdCopyFieldType, string> = {
  headline:
    `Generate META AD HEADLINES in ALL CAPS. Each must be under 40 characters.
Write punchy, specific phrases — not just "[brand] jobs near you" repeated with synonyms.
Strong patterns:
- "[BRAND] IS HIRING — HERE'S HOW TO APPLY"
- "HOW TO LAND A JOB AT [BRAND]"
- "[BRAND] CAREERS: THE FULL GUIDE"
- "[BRAND] JOBS: WHAT MOST PEOPLE MISS"
- "[BRAND] HIRING GUIDE [YEAR]"
- "WORK AT [BRAND]: STEP-BY-STEP"
- "[BRAND] JOBS — ARE YOU ELIGIBLE?"
- "EVERYTHING ABOUT [BRAND] HIRING"
Rules: ALL CAPS, under 40 characters, brand name once per headline maximum, no sentence that reads like a keyword list.
Extract the brand name from the campaign name.`,

  primary_text:
    `Generate META AD PRIMARY TEXT for content arbitrage campaigns.
Produce 5 variations using THREE different formats — NOT all the same structure.

CRITICAL: Every sentence must pass the human test — read it out loud. If it sounds like a search query or a keyword list, rewrite it. Meta's Andromeda algorithm rewards ENGAGEMENT PROBABILITY, not keyword density.

---

FORMAT A — SPRINT (use for variations 1, 2, 3):
Exactly 3 lines. Each line is ONE complete sentence (never a fragment or a search query glued together).
- Line 1: Opens with 1 relevant emoji. Specific hook or insight — something the reader didn't know or hadn't considered. Brand name max ONCE.
- Line 2: What the article covers — specific roles, steps, or details. Ends with 📋 or 📝
- Line 3: Reinforce it's an independent guide + curiosity or urgency trigger. Ends with 🔎 or ✅
Brand name appears max 2× across all 3 lines. Never repeat the same phrase twice in the same variation.

Good Sprint example:
✈️ Etihad Airways is hiring across multiple departments — and most people don't know where to start.
From cabin crew to ground operations, warehouse roles to HQ positions — here's the full picture. 📋
This independent guide covers requirements, pay, and how to apply for Etihad jobs near you. 🔎

Bad Sprint example (DO NOT do this):
✈️ Searching for Etihad Airways jobs or Etihad Airways jobs near me?
📝 Find top tips for Etihad Airways hiring, Etihad Airways warehouse jobs, and Etihad Airways store jobs.
📍 Get the latest Etihad Airways careers info and a step-by-step Etihad Airways job application guide!
(The bad example repeats the same phrase in the same line and reads like a keyword list.)

---

FORMAT B — STORY (use for variation 4):
2 short paragraphs. NO emoji until the very last word of the entire copy.
- Para 1 (2–3 sentences): Opens with a real insight, problem, or counterintuitive observation about the topic. The reader should feel understood before they know what you're about to tell them. Brand name appears naturally, once.
- Para 2 (2–3 sentences): What they'll get from clicking — specific and concrete. Geographic anchor. Ends with ONE emoji (the only one).
Tone: like a well-informed friend sharing something useful, not an ad.

Good Story example:
Most people who want to work at Etihad Airways don't actually know where to start. The airline posts jobs across multiple platforms, requirements vary significantly by role, and the application process isn't obvious from the outside.

This independent guide walks through every Etihad career path — from cabin crew and ground operations to warehouse and corporate roles in Abu Dhabi — with the actual steps to apply, what each role requires, and how long the hiring process takes. 📋

---

FORMAT C — DEEP DIVE (use for variation 5):
3–4 paragraphs. Lower raw CTR than Sprint — but the readers who click stay longer and generate more AdSense revenue. Judge this format by revenue per click, not CTR.
- Para 1: Counterintuitive insight or real problem. No brand name yet.
- Para 2: Specific details — roles, steps, what most applicants miss. Brand name appears here, naturally, once.
- Para 3: What the guide covers — specific sections. Clicking should feel like the obvious next move.
- Para 4 (optional): Close with a re-hook targeting a specific sub-audience (e.g. "If you've applied before and didn't hear back..."). ONE emoji at the very end, nothing else.

---

ANGLE VARIETY across the 5 variations:
1. Sprint — Discovery/Confirmation (high-intent: user is already searching, confirm you have what they need)
2. Sprint — Curiosity Hook (pattern interrupt: "Most people who apply don't realise...")
3. Sprint — Social Proof (volume or FOMO: specific numbers or scale)
4. Story — Question Hook (cold traffic, discovery audience who isn't actively searching)
5. Deep Dive — Trust Builder (engagement cluster, 35+ audience, high dwell time)

Extract the brand/topic from the campaign name. Separate each variation with a blank line.`,

  description:
    `Generate META AD DESCRIPTIONS for content arbitrage campaigns.
Produce 5 descriptions — the style must match the corresponding primary text format:

For SPRINT variations (1–3) — KEYWORD-DENSE style:
Start with ⭐⭐⭐⭐⭐. Keywords appear inside readable sentence fragments separated by commas cleanly — NOT crammed mid-phrase. 150–250 characters.
Good example: "⭐⭐⭐⭐⭐ Independent guide covering Etihad Airways jobs, cabin crew requirements, ground staff roles, warehouse positions, how to apply online — with step-by-step application instructions."
Bad example: "⭐⭐⭐⭐⭐ Independent informational guide on Etihad Airways jobs, Etihad Airways jobs near me, Etihad Airways hiring updates, Etihad Airways warehouse jobs, Etihad Airways store jobs..." (keyword repetition)

For STORY variation (4) and DEEP DIVE variation (5) — CONVERSATIONAL style:
Start with ⭐⭐⭐⭐⭐. One or two clean, complete sentences. Should read like a human wrote it.
Good example: "⭐⭐⭐⭐⭐ Everything you need to know about applying for Etihad Airways jobs in one place — roles, requirements, and the full process explained simply."

Rules: extract brand/topic from campaign name. Never repeat the same phrase more than twice across the entire description.`,
};

const SPANISH_FIELD_INSTRUCTIONS: Record<AdCopyFieldType, string> = {
  headline:
    `Genera TITULARES PARA ANUNCIOS DE META en MAYÚSCULAS. Cada uno debe tener menos de 40 caracteres.
Frases directas y específicas — no listas de palabras clave repetidas.
Patrones fuertes:
- "[MARCA] ESTÁ CONTRATANDO — CÓMO APLICAR"
- "TRABAJA EN [MARCA]: GUÍA COMPLETA"
- "EMPLEO EN [MARCA]: LO QUE DEBES SABER"
- "CÓMO CONSEGUIR EMPLEO EN [MARCA]"
- "VACANTES EN [MARCA] [AÑO]"
- "[MARCA]: ¿CUMPLES LOS REQUISITOS?"
- "GUÍA DE EMPLEO EN [MARCA]"
- "TODO SOBRE TRABAJAR EN [MARCA]"
Todos en MAYÚSCULAS, menos de 40 caracteres, nombre de marca máximo una vez por titular.
Extrae el nombre de la marca del nombre de la campaña.`,

  primary_text:
    `Genera TEXTO PRINCIPAL para anuncios de Meta de campañas de arbitraje de contenido.
Produce 5 variaciones usando TRES formatos diferentes — NO todas la misma estructura.

CRÍTICO: Cada oración debe superar la prueba humana — léela en voz alta. Si suena como una lista de palabras clave o una consulta de búsqueda, reescríbela. El algoritmo Andromeda de Meta recompensa la PROBABILIDAD DE ENGAGEMENT, no la densidad de palabras clave.

---

FORMATO A — SPRINT (usa para variaciones 1, 2, 3):
Exactamente 3 líneas. Cada línea es UNA oración completa (nunca un fragmento o consulta de búsqueda).
- Línea 1: Comienza con 1 emoji relevante. Gancho específico o dato que el lector no conocía. Nombre de marca máximo UNA vez.
- Línea 2: Qué cubre el artículo — roles, pasos o detalles específicos. Termina con 📋 o 📝
- Línea 3: Refuerza que es una guía independiente + curiosidad o urgencia. Termina con 🔎 o ✅
Nombre de marca máximo 2 veces en las 3 líneas. Nunca repitas la misma frase dos veces.

---

FORMATO B — HISTORIA (usa para variación 4):
2 párrafos cortos. SIN emoji hasta la última palabra de todo el texto.
- Párrafo 1 (2–3 oraciones): Abre con una observación real, problema o dato contraintuitivo. Nombre de marca aparece naturalmente, una vez.
- Párrafo 2 (2–3 oraciones): Qué obtendrán al hacer clic — específico y concreto. Ancla geográfica. Termina con UN emoji.
Tono: como un amigo bien informado compartiendo algo útil.

---

FORMATO C — ANÁLISIS PROFUNDO (usa para variación 5):
3–4 párrafos. CTR más bajo que Sprint — pero los lectores que hacen clic permanecen más tiempo.
- Párrafo 1: Dato contraintuitivo. Sin nombre de marca aún.
- Párrafo 2: Detalles específicos — roles, pasos, errores comunes. Nombre de marca aparece aquí, naturalmente, una vez.
- Párrafo 3: Qué cubre la guía — secciones específicas. El clic debe sentirse como el siguiente paso obvio.
- Párrafo 4 (opcional): Reenganche para una subaudiencia específica. UN emoji al final.

---

VARIEDAD DE ÁNGULOS:
1. Sprint — Descubrimiento/Confirmación (alta intención)
2. Sprint — Gancho de curiosidad ("La mayoría no sabe que...")
3. Sprint — Prueba social (volumen o FOMO con números)
4. Historia — Gancho de pregunta (tráfico frío, audiencia de descubrimiento)
5. Análisis profundo — Constructor de confianza (audiencia 35+)

Extrae la marca/tema del nombre de la campaña. Separa cada variación con una línea en blanco. Todo el contenido en español neutro latinoamericano.`,

  description:
    `Genera DESCRIPCIONES PARA ANUNCIOS DE META de campañas de arbitraje de contenido.
Produce 5 descripciones — el estilo debe coincidir con el formato del texto principal correspondiente:

Para variaciones SPRINT (1–3) — estilo DENSO EN PALABRAS CLAVE:
Comienza con ⭐⭐⭐⭐⭐. Las palabras clave aparecen en fragmentos legibles separados por comas — NO acumuladas en frases forzadas. 150–250 caracteres.
Ejemplo: "⭐⭐⭐⭐⭐ Guía independiente sobre empleos en [Marca], requisitos por puesto, cómo aplicar en línea y qué esperar en el proceso de selección — paso a paso."

Para variación HISTORIA (4) y ANÁLISIS PROFUNDO (5) — estilo CONVERSACIONAL:
Comienza con ⭐⭐⭐⭐⭐. Una o dos oraciones limpias y completas.
Ejemplo: "⭐⭐⭐⭐⭐ Todo lo que necesitas saber para aplicar a empleos en [Marca] — puestos disponibles, requisitos y el proceso explicado de forma simple."

Reglas: extrae marca/tema del nombre de la campaña. Nunca repitas la misma frase más de dos veces. Todo en español neutro latinoamericano.`,
};

const ENGLISH_SYSTEM_PROMPT = `You are a senior direct-response copywriter for Meta ads, specialising in content arbitrage campaigns that drive traffic to AdSense-monetised informational guides.

Meta's Andromeda and GEM systems score ads on ENGAGEMENT PROBABILITY — predicted CTR, dwell time, and return visits. They reward copy that reads naturally and triggers real human emotional responses. They penalise keyword repetition that sounds robotic, because their models are trained on human language and recognise low-quality patterns.

YOUR NON-NEGOTIABLE RULES:
- Primary keyword: max 2–3 mentions across the ENTIRE primary text. Never twice in the same line.
- Every sentence must pass the human test: read it out loud. If it sounds like a search query, rewrite it.
- "Etihad Airways jobs or Etihad Airways jobs near me" is NOT a sentence — it is two search queries glued together. Never write copy like this.
- Copy should feel like a well-informed person sharing something useful — not a keyword list with emojis bolted on.
- Frame all copy as independent informational guides (not job applications or direct sales).
- Geographic anchors ("near you", city name, country) appear ONCE, naturally embedded in a sentence.`;

const SPANISH_SYSTEM_PROMPT = `Eres un redactor senior de respuesta directa para anuncios de Meta, especializado en campañas de arbitraje de contenido que dirigen tráfico hacia sitios web de guías informativas monetizados con Google AdSense.

Los sistemas Andromeda y GEM de Meta califican los anuncios según la PROBABILIDAD DE ENGAGEMENT — CTR predicho, tiempo en página y visitas de retorno. Recompensan el copy que se lee naturalmente y genera respuestas emocionales reales. Penalizan la repetición de palabras clave que suena robótica.

TUS REGLAS NO NEGOCIABLES:
- Palabra clave principal: máximo 2–3 menciones en todo el texto principal. Nunca dos veces en la misma línea.
- Cada oración debe superar la prueba humana: léela en voz alta. Si suena como una consulta de búsqueda, reescríbela.
- El copy debe sentirse como una persona bien informada compartiendo algo útil — no una lista de keywords con emojis.
- Presenta todo el contenido como guías informativas independientes (no solicitudes de empleo ni ventas directas).
- Anclas geográficas ("cerca de ti", nombre de ciudad) aparecen UNA vez, integradas naturalmente en una oración.
- Todo el contenido en español neutro latinoamericano.`;

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
  const isSpanish = language.toLowerCase() === "spanish" || language.toLowerCase() === "español";
  const instructions = isSpanish
    ? SPANISH_FIELD_INSTRUCTIONS[fieldType]
    : FIELD_INSTRUCTIONS[fieldType];
  const systemPrompt = isSpanish ? SPANISH_SYSTEM_PROMPT : ENGLISH_SYSTEM_PROMPT;

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
