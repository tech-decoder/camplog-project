import { getClaudeClient } from "./client";
import { AdCopyFieldType } from "@/lib/types/ad-copies";

const FIELD_INSTRUCTIONS: Record<AdCopyFieldType, string> = {
  headline:
    `Generate META AD HEADLINES in ALL CAPS. Each must be under 40 characters.
Focus on keyword-rich, search-intent matching phrases.
Include the brand name prominently. Use patterns like:
- "[BRAND] JOBS NEAR YOU"
- "HOW TO APPLY FOR [BRAND] JOBS"
- "[BRAND] HIRING: STEP-BY-STEP GUIDE"
- "[BRAND] JOBS APPLICATION GUIDE"
- "[BRAND] CAREERS GUIDE [YEAR]"
- "[BRAND] JOBS: WHAT THEY DON'T TELL YOU"
- "[BRAND] NZ HIRING: STEP-BY-STEP GUIDE"
- "HOW TO GET A [BRAND] JOB IN NZ"
All headlines MUST be ALL CAPS. Extract the brand name from the campaign name.`,

  primary_text:
    `Generate META AD PRIMARY TEXT for content arbitrage campaigns.
Each variant must be EXACTLY 3 short paragraphs, each starting or ending with a relevant emoji.
Each paragraph should be 1-2 sentences max.
Structure:
- Line 1: Hook/discovery with emoji (e.g., "🛒 Looking for [Brand] jobs near you?")
- Line 2: Value proposition with emoji (e.g., "📋 Learn how to apply for [Brand] store jobs and warehouse jobs")
- Line 3: CTA-oriented with emoji (e.g., "📍 Step-by-step [Brand] job application guide")

Pack EVERY line with keywords: "[brand] jobs", "[brand] jobs near me", "[brand] hiring", "[brand] careers", "[brand] warehouse jobs", "[brand] store jobs".

Generate 5 DIFFERENT ANGLE VARIATIONS:
1. Keyword/Discovery (straightforward keyword-rich)
2. Curiosity/Hook ("Most people apply the wrong way...")
3. Social Proof/Volume ("Thousands applied this month...")
4. Question Hook ("Have you applied yet?...")
5. Number Hook ("[Brand] has 100+ locations hiring...")

Extract the brand name from the campaign name. Separate each of the 3 lines with a newline character.`,

  description:
    `Generate META AD DESCRIPTIONS for content arbitrage campaigns.
Each description must:
- Start with ⭐⭐⭐⭐⭐
- Be ONE long run-on sentence (150-250 characters)
- Be packed with keywords: "[brand] jobs", "[brand] jobs near me", "[brand] hiring", "[brand] warehouse jobs", "[brand] store jobs", "[brand] careers", "how to apply"
- Frame as an "independent informational guide"
Example: "⭐⭐⭐⭐⭐ Informational guide explaining [Brand] jobs near me, [Brand] hiring process, [Brand] store jobs, [Brand] warehouse jobs, [Brand] careers and how to apply for [Brand] job openings online."

Extract the brand name from the campaign name.`,
};

const SPANISH_FIELD_INSTRUCTIONS: Record<AdCopyFieldType, string> = {
  headline:
    `Genera TITULARES PARA ANUNCIOS DE META en MAYÚSCULAS. Cada uno debe tener menos de 40 caracteres.
Enfócate en frases ricas en palabras clave que coincidan con la intención de búsqueda.
Incluye el nombre de la marca de forma prominente. Usa patrones como:
- "EMPLEOS EN [MARCA] CERCA DE TI"
- "CÓMO APLICAR EN [MARCA]"
- "[MARCA] CONTRATANDO: GUÍA PASO A PASO"
- "GUÍA DE EMPLEO EN [MARCA]"
- "VACANTES EN [MARCA] [AÑO]"
- "TRABAJAR EN [MARCA]: LO QUE NO TE DICEN"
- "[MARCA] BUSCA PERSONAL AHORA"
- "OPORTUNIDADES DE TRABAJO EN [MARCA]"
Todos los titulares DEBEN estar en MAYÚSCULAS. Extrae el nombre de la marca del nombre de la campaña.`,

  primary_text:
    `Genera TEXTO PRINCIPAL para anuncios de Meta de campañas de arbitraje de contenido.
Cada variante debe tener EXACTAMENTE 3 párrafos cortos, cada uno empezando o terminando con un emoji relevante.
Cada párrafo debe ser de 1-2 oraciones máximo.
Estructura:
- Línea 1: Gancho/descubrimiento con emoji (ej: "🛒 ¿Buscas empleo en [Marca] cerca de ti?")
- Línea 2: Propuesta de valor con emoji (ej: "📋 Aprende cómo aplicar para trabajos en tiendas y almacenes de [Marca]")
- Línea 3: Orientado a la acción con emoji (ej: "📍 Guía paso a paso para solicitar empleo en [Marca]")

Llena CADA línea con palabras clave: "empleos en [marca]", "trabajar en [marca]", "[marca] está contratando", "vacantes en [marca]", "empleo en [marca] cerca de mí".

Genera 5 VARIACIONES CON DIFERENTES ÁNGULOS:
1. Palabras clave/Descubrimiento (directo, rico en keywords)
2. Curiosidad/Gancho ("La mayoría aplica de forma incorrecta...")
3. Prueba social ("Miles aplicaron este mes...")
4. Pregunta gancho ("¿Ya aplicaste?...")
5. Número gancho ("[Marca] tiene más de 100 ubicaciones contratando...")

Extrae el nombre de la marca del nombre de la campaña. Separa cada una de las 3 líneas con un salto de línea.`,

  description:
    `Genera DESCRIPCIONES PARA ANUNCIOS DE META de campañas de arbitraje de contenido.
Cada descripción debe:
- Empezar con ⭐⭐⭐⭐⭐
- Ser UNA oración larga y continua (150-250 caracteres)
- Estar llena de palabras clave: "empleos en [marca]", "trabajar en [marca]", "[marca] contratando", "vacantes en [marca]", "cómo aplicar en [marca]"
- Presentarse como una "guía informativa independiente"
Ejemplo: "⭐⭐⭐⭐⭐ Guía informativa sobre empleos en [Marca] cerca de mí, proceso de contratación en [Marca], trabajos en tiendas de [Marca], vacantes en almacenes de [Marca] y cómo aplicar a ofertas de empleo en [Marca] en línea."

Extrae el nombre de la marca del nombre de la campaña.`,
};

const ENGLISH_SYSTEM_PROMPT = `You are a Meta ads copywriter specializing in content arbitrage campaigns that drive traffic from Facebook/Meta ads to informational guide websites monetized with Google AdSense.

Your copy must be:
- Keyword-dense for Meta's Andromeda and GEM ranking algorithms
- Optimized for high CTR on Facebook feed placement
- Framed as informational guides (NOT direct applications or sales)
- Heavy on search-intent keywords like "[brand] jobs", "[brand] jobs near me", "[brand] hiring", "[brand] careers"

You write keyword-stuffed copy that matches search intent and drives curiosity clicks to guide pages.`;

const SPANISH_SYSTEM_PROMPT = `Eres un redactor experto en anuncios de Meta especializado en campañas de arbitraje de contenido que dirigen tráfico de anuncios de Facebook/Meta hacia sitios web de guías informativas monetizados con Google AdSense.

Tu copy debe:
- Ser denso en palabras clave para los algoritmos Andromeda y GEM de Meta
- Estar optimizado para alto CTR en el feed de Facebook
- Presentarse como guías informativas (NO solicitudes directas ni ventas)
- Usar palabras clave de intención de búsqueda como "empleos en [marca]", "trabajar en [marca]", "[marca] contratando", "vacantes en [marca]"

Escribes copy rico en keywords que coincide con la intención de búsqueda y genera clics de curiosidad hacia páginas de guías. Todo el contenido DEBE ser en español neutro latinoamericano.`;

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
  const claude = getClaudeClient();

  const isSpanish = language.toLowerCase() === "spanish" || language.toLowerCase() === "español";
  const instructions = isSpanish
    ? SPANISH_FIELD_INSTRUCTIONS[fieldType]
    : FIELD_INSTRUCTIONS[fieldType];
  const systemPrompt = isSpanish ? SPANISH_SYSTEM_PROMPT : ENGLISH_SYSTEM_PROMPT;

  const existingContext =
    existingVariants.length > 0
      ? `\n\nExisting variants (do NOT repeat these, generate completely new ones):\n${existingVariants.map((v, i) => `${i + 1}. ${v}`).join("\n")}`
      : "";

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Campaign name: "${campaignName}"

${instructions}

Generate exactly ${count} new unique variants.${existingContext}

Return ONLY a JSON array of strings, no other text. Example: ["variant 1", "variant 2", "variant 3"]`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```(?:json)?\n?([\s\S]*?)```/, "$1")
    .trim();

  try {
    const variants = JSON.parse(cleaned);
    if (Array.isArray(variants)) {
      return variants.map(String).slice(0, count);
    }
  } catch {
    // If JSON parsing fails, try to extract strings line by line
    const lines = cleaned
      .split("\n")
      .map((l) => l.replace(/^[\d]+\.\s*/, "").replace(/^["']|["']$/g, "").trim())
      .filter((l) => l.length > 0);
    return lines.slice(0, count);
  }

  return [];
}
