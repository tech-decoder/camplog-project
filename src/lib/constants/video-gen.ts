import { VideoAdStyle, VideoAspectRatio, VideoDuration } from "@/lib/types/generation-jobs";

export const VIDEO_AD_STYLES: {
  value: VideoAdStyle;
  label: string;
  description: string;
  prompt_guide: string;
}[] = [
  {
    value: "product_hero",
    label: "Product Hero",
    description: "Cinematic product reveal with dramatic lighting and camera movement",
    prompt_guide: `PRODUCT HERO SHOT:
Slow orbital or dolly push-in camera revealing the product on a clean surface.
Studio rim lighting with subtle glow around edges.
Shallow depth of field, 85mm lens look.
Ambient electronic music builds slowly.
Focus on texture, material quality, and fine details.`,
  },
  {
    value: "ugc_testimonial",
    label: "UGC Style",
    description: "Authentic handheld style showing the product or environment naturally",
    prompt_guide: `UGC / AUTHENTIC STYLE:
Handheld camera with slight natural shake.
Natural daylight or ring light, slightly grainy film texture.
Casual, authentic energy — feels like real footage.
Ambient room or outdoor sounds, no heavy music.
Show the product being used or interacted with naturally.`,
  },
  {
    value: "lifestyle_scene",
    label: "Lifestyle Scene",
    description: "Aspirational lifestyle showing the brand or product in use",
    prompt_guide: `LIFESTYLE / ASPIRATIONAL:
Smooth tracking or steadicam shot following action through the scene.
Golden hour or warm natural lighting, 35mm film look.
Gentle acoustic or upbeat music.
Show the product in context of an aspirational lifestyle.
Cinematic color grade, natural lens flare optional.`,
  },
  {
    value: "food_sensory",
    label: "Food & Sensory",
    description: "Extreme close-ups emphasizing texture, motion, and sensory appeal",
    prompt_guide: `FOOD / SENSORY CLOSE-UP:
Extreme macro close-up or overhead angle.
Warm backlight creating golden glow.
Shallow depth of field, macro lens.
ASMR-style sound effects: sizzling, pouring, crunch, steam.
Focus on movement: cheese pull, sauce pour, steam rising, ice crackling.
No dialogue, let visuals and sounds sell the product.`,
  },
  {
    value: "breaking_news",
    label: "Breaking News",
    description: "Pattern interrupt news-style opening to stop the scroll",
    prompt_guide: `BREAKING NEWS / PATTERN INTERRUPT:
Quick zoom or push-in camera movement.
Professional studio or news desk environment.
Bright, professional lighting with shallow depth of field.
News broadcast ambience, urgent but professional tone.
Clean, polished aesthetic that mimics real news broadcasts.`,
  },
  {
    value: "storefront_flyby",
    label: "Storefront Flyby",
    description: "Aerial or tracking shot of a store exterior",
    prompt_guide: `STOREFRONT / EXTERIOR FLYBY:
Aerial drone shot or smooth tracking shot approaching a store exterior.
Golden hour or bright daylight, wide establishing shot.
Ambient city or nature sounds, gentle background music.
Show the full building, signage, parking lot.
Transition from wide to medium shot.`,
  },
];

export const VIDEO_FORMAT_OPTIONS: { value: VideoAspectRatio; label: string }[] = [
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
];

export const VIDEO_DURATION_OPTIONS: {
  value: VideoDuration;
  label: string;
  cost: string;
}[] = [
  { value: 4, label: "4 seconds", cost: "$0.60" },
  { value: 6, label: "6 seconds", cost: "$0.90" },
  { value: 8, label: "8 seconds", cost: "$1.20" },
];

export const VIDEO_MODEL_ID = "veo-3.0-fast-generate-001";

export const GLOBAL_VIDEO_CREATIVE_RULES = `GLOBAL VIDEO RULES (apply to ALL video ad styles):

CAMERA & MOTION:
- Always specify camera movement explicitly (dolly, pan, orbit, zoom, tracking, crane, static)
- Include shot type (extreme close-up, close-up, medium, wide, overhead, POV)
- Describe camera angle (eye-level, low angle, high angle, bird's eye)
- One concept per video — do not overload with multiple scenes

LIGHTING & ATMOSPHERE:
- Specify lighting source and quality (golden hour, studio rim light, natural daylight, neon)
- Describe the mood the lighting should create
- Include color temperature hints (warm, cool, neutral)

AUDIO (Veo 3 generates synchronized audio):
- Describe ambient sounds explicitly
- Specify music genre and energy level
- If you want no dialogue, state "No dialogue" explicitly
- Sound effects should match the visual action

STYLE:
- Describe the visual aesthetic (cinematic, documentary, UGC, clean/minimal, gritty)
- Include lens references when relevant (35mm, 85mm, macro, wide-angle)
- Mention film grain, depth of field, or color grade if important
- Resolution: 720p, 24fps

RESTRICTIONS:
- No generated people or faces (personGeneration: dont_allow)
- Brand identity through products, environments, colors — NOT text or logos
- Keep prompts under 150 words for best results
- English prompts only
`;
