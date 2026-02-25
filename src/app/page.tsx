"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/landing/motion-wrapper";
import {
  MessageSquare,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Check,
  MessageCircle,
  TableProperties,
  EyeOff,
  Image as ImageIcon,
  BarChart3,
  Clock,
  Shield,
  Loader2,
  ChevronRight,
  Send,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ─── Navbar ──────────────────────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.header
      className={`fixed top-0 inset-x-0 z-50 h-16 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-lg border-b border-slate-200/60 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/camplog.png" alt="CampLog" width={36} height={36} className="rounded-lg" />
          <span className="font-semibold text-lg text-slate-900">CampLog</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            How It Works
          </a>
          <a href="#waitlist" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            Join Waitlist
          </a>
        </nav>

        <a href="#waitlist">
          <Button size="sm" className="bg-[#366ae8] text-white hover:bg-[#2b5bc9] rounded-lg px-5">
            Get Early Access
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </a>
      </div>
    </motion.header>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#366ae8]/[0.04] to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#366ae8]/8 text-[#366ae8] text-sm font-medium mb-6 border border-[#366ae8]/15">
                <Shield className="h-3.5 w-3.5" />
                Built for Ad Arbitrage Teams
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-900 leading-[1.1]">
                Stop Tracking Campaign Changes in{" "}
                <span className="relative inline-block">
                  <span className="text-[#366ae8]">Spreadsheets</span>
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-lg">
                Your team makes dozens of campaign changes daily. CampLog captures them
                in a simple chat interface, then tracks the impact automatically with AI.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="#waitlist">
                  <Button size="lg" className="bg-[#366ae8] text-white hover:bg-[#2b5bc9] rounded-lg px-8 text-base">
                    Join the Waitlist
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </a>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="rounded-lg px-8 text-base border-slate-200 text-slate-700 hover:bg-slate-50">
                    See How It Works
                  </Button>
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="mt-8 flex items-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#366ae8]" />
                  Free during beta
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#366ae8]" />
                  No credit card
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#366ae8]" />
                  AI-powered
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Product Mockup */}
          <FadeIn direction="right" delay={0.2}>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400">app.camplog.dev</span>
                  </div>
                </div>
                <div className="p-6 space-y-4 bg-slate-50/20 min-h-[300px]">
                  <div className="flex justify-end">
                    <div className="bg-[#366ae8] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm">
                      Increased Coca-Cola spend 30% in CA and 25% in AU
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-700 mb-3">Logged 2 changes:</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#366ae8]/5 border border-[#366ae8]/10">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#366ae8] bg-[#366ae8]/10 px-2 py-0.5 rounded">
                            <TrendingUp className="h-3 w-3" /> Increase Spend
                          </span>
                          <span className="text-xs text-slate-600">Coca-Cola CA +30%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#366ae8]/5 border border-[#366ae8]/10">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#366ae8] bg-[#366ae8]/10 px-2 py-0.5 rounded">
                            <TrendingUp className="h-3 w-3" /> Increase Spend
                          </span>
                          <span className="text-xs text-slate-600">Coca-Cola AU +25%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-2 top-28 bg-white shadow-lg shadow-slate-200/50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-[#366ae8] flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Extraction
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -left-2 bottom-16 bg-white shadow-lg shadow-slate-200/50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 flex items-center gap-1.5"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Screenshot Support
                  </motion.div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ─── Pain Points ────────────────────────────────────────────────────── */

function PainSection() {
  const pains = [
    {
      icon: MessageCircle,
      title: "Scattered Conversations",
      description: "Changes logged in group chats, Slack threads, and personal notes. Good luck finding that bid change from last Tuesday.",
    },
    {
      icon: TableProperties,
      title: "Manual Spreadsheets",
      description: "Copy-pasting into shared sheets that nobody updates consistently. Metrics entered wrong. Rows missing.",
    },
    {
      icon: EyeOff,
      title: "No Impact Visibility",
      description: "You changed the bid 3 days ago \u2014 did it help? Without before/after tracking, you\u2019re flying blind.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            The Campaign Change Chaos
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            You make changes all day. Tracking them is where things break down.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {pains.map((pain) => (
            <StaggerItem key={pain.title}>
              <div className="bg-white border border-slate-100 rounded-xl p-7 h-full hover:border-[#366ae8]/20 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-[#366ae8]/8 flex items-center justify-center mb-4">
                  <pain.icon className="h-5 w-5 text-[#366ae8]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{pain.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{pain.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────────────── */

function FeaturesSection() {
  const features = [
    {
      badge: "Chat Interface",
      icon: MessageSquare,
      title: "Log Changes Like You\u2019re Texting a Colleague",
      description: "Type naturally or paste a dashboard screenshot. CampLog\u2019s AI extracts campaign name, action type, geo, and metrics automatically.",
      bullets: ["Natural language understanding", "Screenshot + image extraction", "Clipboard paste support", "Confidence scoring on extractions"],
      mockup: "chat",
    },
    {
      badge: "AI Extraction",
      icon: Sparkles,
      title: "AI That Speaks Performance Marketing",
      description: "Trained on ad arbitrage terminology \u2014 FB spend, geo targeting, bid adjustments, ROAS, margins. Not a generic chatbot.",
      bullets: ["High extraction accuracy", "Understands campaign screenshots", "Parses FB and AdSense data", "Learns your naming conventions"],
      mockup: "extraction",
    },
    {
      badge: "Impact Tracking",
      icon: TrendingUp,
      title: "See What Actually Moved the Needle",
      description: "Every change gets a review date. Log post-change metrics and get an automatic impact verdict with AI analysis.",
      bullets: ["Before/after metric comparison", "Automatic review reminders", "AI-generated impact verdicts", "Margin and ROI tracking"],
      mockup: "impact",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Everything You Need to Track Changes
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            From logging to impact analysis, CampLog handles the entire workflow.
          </p>
        </FadeIn>

        <div className="space-y-20">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${i % 2 === 1 ? "lg:grid-flow-dense" : ""}`}
            >
              <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
                <FadeIn>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#366ae8]/8 text-[#366ae8] text-sm font-medium mb-4">
                    <feature.icon className="h-3.5 w-3.5" />
                    {feature.badge}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-[#366ae8]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-[#366ae8]" />
                        </div>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              </div>

              <FadeIn direction={i % 2 === 0 ? "right" : "left"} className={i % 2 === 1 ? "lg:col-start-1" : ""}>
                {feature.mockup === "chat" ? (
                  <ChatMockup />
                ) : feature.mockup === "extraction" ? (
                  <ExtractionMockup />
                ) : (
                  <ImpactMockup />
                )}
              </FadeIn>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature Mockups ───────────────────────────────────────────────── */

function ChatMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#366ae8]" />
          <span className="text-sm font-medium text-slate-700">Chat</span>
        </div>
        <div className="text-xs text-slate-400">Today</div>
      </div>
      <div className="p-5 space-y-3 min-h-[240px]">
        <div className="flex justify-end">
          <div className="bg-[#366ae8] text-white rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[75%] text-sm">
            Paused Walmart PR, margins dropped below 5%
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-[#366ae8] text-white rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[75%] text-sm flex items-center gap-2">
            <Upload className="h-3.5 w-3.5 flex-shrink-0" />
            <span>dashboard_screenshot.png</span>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-slate-50 rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] border border-slate-100">
            <p className="text-sm text-slate-700">Got it. Logged 1 change with metrics from screenshot:</p>
            <div className="mt-2 p-2.5 rounded-lg bg-[#366ae8]/5 border border-[#366ae8]/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#366ae8] bg-[#366ae8]/10 px-2 py-0.5 rounded">Pause Campaign</span>
                <span className="text-xs text-slate-600">Walmart PR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <span className="text-sm text-slate-400 flex-1">Type a message...</span>
          <Send className="h-4 w-4 text-[#366ae8]" />
        </div>
      </div>
    </div>
  );
}

function ExtractionMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#366ae8]" />
          <span className="text-sm font-medium text-slate-700">AI Extraction</span>
        </div>
        <span className="text-xs text-[#366ae8] bg-[#366ae8]/8 px-2 py-0.5 rounded font-medium">98% confidence</span>
      </div>
      <div className="p-5 space-y-4 min-h-[240px]">
        <div className="text-sm text-slate-500 italic bg-slate-50 rounded-lg p-3 border border-slate-100">
          &ldquo;Increased Coca-Cola spend 30% in CA, also bumped AU by 25%. Current margins at 18%&rdquo;
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Campaign", value: "Coca-Cola" },
            { label: "Action", value: "Increase Spend" },
            { label: "Geo", value: "CA, AU" },
            { label: "Change", value: "+30%, +25%" },
            { label: "Margin", value: "18%" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/70">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</span>
              <span className="text-sm font-medium text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImpactMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#366ae8]" />
          <span className="text-sm font-medium text-slate-700">Impact Review</span>
        </div>
        <span className="text-xs font-medium text-[#366ae8] bg-[#366ae8]/8 px-2 py-0.5 rounded">Positive</span>
      </div>
      <div className="p-5 space-y-4 min-h-[240px]">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Coca-Cola CA +30% Spend</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Before</p>
            <p className="text-sm font-bold text-slate-800">$1,240</p>
            <p className="text-[10px] text-slate-400">Revenue</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">After</p>
            <p className="text-sm font-bold text-slate-800">$1,890</p>
            <p className="text-[10px] text-slate-400">Revenue</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#366ae8]/5 border border-[#366ae8]/10">
            <p className="text-[10px] text-[#366ae8] uppercase tracking-wide mb-1">Delta</p>
            <p className="text-sm font-bold text-[#366ae8]">+52.4%</p>
            <p className="text-[10px] text-[#366ae8]/70">Revenue</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { metric: "FB Spend", before: "$420", after: "$546", delta: "+30%", direction: "up" },
            { metric: "Revenue", before: "$1,240", after: "$1,890", delta: "+52.4%", direction: "up" },
            { metric: "Margin %", before: "18.2%", after: "24.1%", delta: "+5.9pp", direction: "up" },
            { metric: "FB CPC", before: "$0.42", after: "$0.38", delta: "-9.5%", direction: "down" },
          ].map((row) => (
            <div key={row.metric} className="flex items-center justify-between py-1.5 px-3 rounded-lg text-xs">
              <span className="text-slate-500 w-20">{row.metric}</span>
              <span className="text-slate-600">{row.before}</span>
              <ArrowRight className="h-3 w-3 text-slate-300" />
              <span className="text-slate-800 font-medium">{row.after}</span>
              <span className="text-[#366ae8] font-medium flex items-center gap-0.5 w-16 justify-end">
                {row.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {row.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────── */

function HowItWorksSection() {
  const steps = [
    { number: 1, title: "Log It", description: "Type or paste your campaign change in the chat. Screenshots work too.", icon: MessageSquare },
    { number: 2, title: "Extract It", description: "AI identifies the campaign, action type, geo, and metrics from your message.", icon: Sparkles },
    { number: 3, title: "Track It", description: "Days later, log post-change metrics. Get an instant impact verdict.", icon: TrendingUp },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Three Steps to Clarity</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">From change to insight in under a minute.</p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-slate-200" />

          {steps.map((step) => (
            <StaggerItem key={step.number} className="relative text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#366ae8] text-white flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-[#366ae8]/20">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="text-xs font-semibold text-[#366ae8] mb-1.5">STEP {step.number}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Dashboard Preview ──────────────────────────────────────────────── */

function DashboardPreview() {
  return (
    <section className="py-20 md:py-28 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Your Campaign Command Center</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">A unified dashboard for every change, metric, and insight.</p>
        </FadeIn>

        <FadeIn>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/30 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Changes Today", value: "8", icon: BarChart3, color: "text-[#366ae8] bg-[#366ae8]/8" },
                  { label: "Pending Reviews", value: "3", icon: Clock, color: "text-[#366ae8]/80 bg-[#366ae8]/5" },
                  { label: "Avg Margin", value: "24.5%", icon: TrendingUp, color: "text-[#366ae8] bg-[#366ae8]/8" },
                  { label: "Total Changes", value: "147", icon: BarChart3, color: "text-slate-600 bg-slate-100" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stat.color}`}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                        <p className="text-xs text-slate-500">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-900 mb-3">Recent Changes</p>
                <div className="space-y-2">
                  {[
                    { action: "Increase Spend", campaign: "Coca-Cola CA +30%", verdict: "Positive", vClass: "bg-[#366ae8]/8 text-[#366ae8]", aClass: "bg-[#366ae8]/8 text-[#366ae8]" },
                    { action: "Pause Campaign", campaign: "Wendy\u2019s PR", verdict: "\u2014", vClass: "bg-slate-100 text-slate-400", aClass: "bg-slate-100 text-slate-600" },
                    { action: "Decrease Spend", campaign: "Walmart PR -25%", verdict: "Review Due", vClass: "bg-[#366ae8]/5 text-[#366ae8]/70", aClass: "bg-[#366ae8]/5 text-[#366ae8]/80" },
                  ].map((row) => (
                    <div key={row.campaign} className="flex items-center gap-3 p-2.5 rounded-lg">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${row.aClass}`}>{row.action}</span>
                      <span className="text-sm text-slate-700 flex-1">{row.campaign}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${row.vClass}`}>{row.verdict}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Waitlist ────────────────────────────────────────────────────────── */

function WaitlistSection() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    profession: "",
    years_experience: "",
    company: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setFormState("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong");
        setFormState("error");
      }
    } catch {
      setErrorMsg("Failed to submit. Please try again.");
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <section id="waitlist" className="py-20 md:py-28 bg-[#366ae8]">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">You&apos;re on the list!</h2>
          <p className="text-lg text-blue-100">
            We&apos;ll notify you at <span className="font-medium text-white">{form.email}</span> when
            CampLog is ready for you. Thanks for your interest.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="py-20 md:py-28 bg-[#366ae8] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]" />

      <div className="relative max-w-2xl mx-auto px-6">
        <FadeIn className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Get Early Access</h2>
          <p className="mt-4 text-lg text-blue-100 max-w-lg mx-auto">
            CampLog is currently in private beta. Join the waitlist and be among the first to try it.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="bg-white rounded-2xl p-8 shadow-xl shadow-black/10">
            {formState === "error" && (
              <div className="mb-6 p-3 rounded-lg bg-[#366ae8]/5 border border-[#366ae8]/15 text-sm text-[#366ae8]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wl-name" className="text-sm text-slate-700">Full Name</Label>
                  <Input
                    id="wl-name"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Your name"
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="wl-email" className="text-sm text-slate-700">Work Email</Label>
                  <Input
                    id="wl-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@company.com"
                    className="mt-1.5 h-11"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wl-company" className="text-sm text-slate-700">Company (optional)</Label>
                <Input
                  id="wl-company"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  placeholder="Your company name"
                  className="mt-1.5 h-11"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-700">Your Role</Label>
                  <Select value={form.profession} onValueChange={(v) => setForm((p) => ({ ...p, profession: v }))}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="media_buyer">Media Buyer</SelectItem>
                      <SelectItem value="performance_marketer">Performance Marketer</SelectItem>
                      <SelectItem value="campaign_manager">Campaign Manager</SelectItem>
                      <SelectItem value="team_lead">Team Lead / Manager</SelectItem>
                      <SelectItem value="agency_owner">Agency Owner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-slate-700">Years of Experience</Label>
                  <Select value={form.years_experience} onValueChange={(v) => setForm((p) => ({ ...p, years_experience: v }))}>
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1 - 3 years</SelectItem>
                      <SelectItem value="3-5">3 - 5 years</SelectItem>
                      <SelectItem value="5-10">5 - 10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-[#366ae8] text-white hover:bg-[#2b5bc9] rounded-lg text-base h-12"
                disabled={formState === "loading" || !form.profession || !form.years_experience}
              >
                {formState === "loading" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</>
                ) : (
                  <>Join the Waitlist <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                We respect your privacy. No spam, ever.
              </p>
            </form>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/camplog.png" alt="CampLog" width={36} height={36} className="rounded-lg" />
              <span className="font-semibold text-lg text-slate-900">CampLog</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              Campaign change tracking built for performance marketing teams. Stop losing
              decisions to chat threads and broken spreadsheets.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-slate-500 hover:text-[#366ae8] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-sm text-slate-500 hover:text-[#366ae8] transition-colors">How It Works</a></li>
              <li><a href="#waitlist" className="text-sm text-slate-500 hover:text-[#366ae8] transition-colors">Join Waitlist</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link href="/privacy" className="text-sm text-slate-500 hover:text-[#366ae8] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-slate-500 hover:text-[#366ae8] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">&copy; 2026 CampLog. All rights reserved.</p>
          <p className="text-sm text-slate-400">
            Built at{" "}
            <a href="https://ltv.co" target="_blank" rel="noopener noreferrer" className="text-[#366ae8] hover:text-[#2b5bc9]">
              LTV
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <PainSection />
      <FeaturesSection />
      <HowItWorksSection />
      <DashboardPreview />
      <WaitlistSection />
      <Footer />
    </div>
  );
}
