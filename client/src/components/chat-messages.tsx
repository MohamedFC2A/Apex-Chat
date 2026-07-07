import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useChatStore } from "@/lib/store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User,
  Sparkles,
  Brain,
  Zap,
  Cpu,
  Crown,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Skull,
  ChevronUp,
  Clock,
  Terminal,
  Shield,
  BookOpen,
  Palette,
  Target,
  RotateCw,
  BarChart3,
  Lock,
  Globe,
  Key,
  FolderOpen,
  Folder,
  Hammer,
  Wrench,
  Settings,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Rocket,
  Bot,
  AlertTriangle,
  Search,
  Trophy,
  Info,
  Activity,
  ExternalLink,
  X,
  Monitor,
  Smartphone,
  Code2,
  Play,
  Maximize2,
  Download,
  FileDown,
} from "lucide-react";
import type { Message, AIModel } from "@shared/schema";
import { OmniStatusCard } from "@/components/omni-status-card";
import { ApexCoderDashboard } from "@/components/apex-coder-dashboard";
import {
  MCQQuizLoadingCard,
  MCQQuizWidget,
} from "@/components/mcq-quiz-widget";
import { PDFExportWidget } from "@/components/pdf-export-widget";
import { PDFLoadingCard } from "@/components/pdf-loading-card";
import type { OmniState } from "@/lib/omni-service";
import type { UnboundState } from "@/lib/unbound-service";
import {
  ThinkingBubble,
  SearchTopologyVisualizer,
} from "@/components/chat-message";
import { ModelLetterIcon } from "@/components/model-letter-icon";
import { detectQuizIntent } from "@shared/mcq";
import { detectPdfIntent } from "@shared/pdf";
import type { AgentMaskConfiguration } from "@shared/types/v2";
import ReactMarkdown from "react-markdown";
import katex from "katex";

import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractSourcesAndClean } from "@/lib/sources-helper";
import { MODEL_INFO } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

function MarkdownImage({
  src,
  alt,
  ...props
}: {
  src?: string;
  alt?: string;
  [key: string]: any;
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Sync state if the src prop changes dynamically
  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError && src && !src.includes("images.weserv.nl")) {
      // Proxy image request to bypass hotlinking protection
      setImageSrc(`https://images.weserv.nl/?url=${encodeURIComponent(src)}`);
      setHasError(true);
    } else {
      // Hide image completely if proxy also fails
      setImageSrc("");
    }
  };

  if (!imageSrc) return null;

  return (
    <div className="my-4 block clear-both overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 p-1.5 shadow-xl max-w-sm sm:max-w-md mx-auto hover:border-violet-500/30 transition-all duration-300">
      <img
        src={imageSrc}
        alt={alt || "Image"}
        referrerPolicy="no-referrer"
        onError={handleError}
        className="w-full h-48 sm:h-56 object-cover rounded-lg hover:scale-[1.02] transition-transform duration-300"
        {...props}
      />
    </div>
  );
}

function extractTextFromChildren(children: React.ReactNode): string {
  let text = "";
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      text += child;
    } else if (React.isValidElement(child) && child.props.children) {
      text += extractTextFromChildren(child.props.children);
    }
  });
  return text;
}

// ─── Company domain map for accurate logo fetching ────────────────────────────
const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Tech Giants
  apple: "apple.com",
  سامسونج: "samsung.com",
  samsung: "samsung.com",
  google: "google.com",
  جوجل: "google.com",
  microsoft: "microsoft.com",
  مايكروسوفت: "microsoft.com",
  amazon: "amazon.com",
  أمازون: "amazon.com",
  meta: "meta.com",
  ميتا: "meta.com",
  facebook: "facebook.com",
  فيسبوك: "facebook.com",
  tesla: "tesla.com",
  تسلا: "tesla.com",
  nvidia: "nvidia.com",
  إنفيديا: "nvidia.com",
  intel: "intel.com",
  إنتل: "intel.com",
  amd: "amd.com",
  qualcomm: "qualcomm.com",
  كوالكوم: "qualcomm.com",
  snapdragon: "qualcomm.com",
  // Phones
  iphone: "apple.com",
  آيفون: "apple.com",
  galaxy: "samsung.com",
  جالاكسي: "samsung.com",
  huawei: "huawei.com",
  هواوي: "huawei.com",
  xiaomi: "xiaomi.com",
  شاومي: "xiaomi.com",
  oneplus: "oneplus.com",
  oppo: "oppo.com",
  vivo: "vivo.com",
  realme: "realme.com",
  nokia: "nokia.com",
  نوكيا: "nokia.com",
  sony: "sony.com",
  سوني: "sony.com",
  lg: "lg.com",
  motorola: "motorola.com",
  asus: "asus.com",
  // Software / AI
  openai: "openai.com",
  anthropic: "anthropic.com",
  claude: "anthropic.com",
  chatgpt: "openai.com",
  gemini: "google.com",
  grok: "x.ai",
  netflix: "netflix.com",
  نتفليكس: "netflix.com",
  spotify: "spotify.com",
  سبوتيفاي: "spotify.com",
  twitter: "twitter.com",
  x: "x.com",
  تويتر: "twitter.com",
  instagram: "instagram.com",
  انستغرام: "instagram.com",
  tiktok: "tiktok.com",
  "تيك توك": "tiktok.com",
  youtube: "youtube.com",
  يوتيوب: "youtube.com",
  whatsapp: "whatsapp.com",
  واتساب: "whatsapp.com",
  telegram: "telegram.org",
  تيليغرام: "telegram.org",
  snapchat: "snapchat.com",
  "سناب شات": "snapchat.com",
  // Cars
  bmw: "bmw.com",
  bمw: "bmw.com",
  mercedes: "mercedes-benz.com",
  مرسيدس: "mercedes-benz.com",
  toyota: "toyota.com",
  تويوتا: "toyota.com",
  honda: "honda.com",
  هوندا: "honda.com",
  ford: "ford.com",
  hyundai: "hyundai.com",
  هيونداي: "hyundai.com",
  kia: "kia.com",
  كيا: "kia.com",
  audi: "audi.com",
  porsche: "porsche.com",
  lamborghini: "lamborghini.com",
  ferrari: "ferrari.com",
  chevrolet: "chevrolet.com",
  // Other brands
  nike: "nike.com",
  نايك: "nike.com",
  adidas: "adidas.com",
  أديداس: "adidas.com",
  "coca-cola": "coca-cola.com",
  "كوكا كولا": "coca-cola.com",
  pepsi: "pepsi.com",
  بيبسي: "pepsi.com",
  mcdonalds: "mcdonalds.com",
  ماكدونالدز: "mcdonalds.com",
  starbucks: "starbucks.com",
  ستاربكس: "starbucks.com",
  // Chips & Hardware
  mediatek: "mediatek.com",
  هيليو: "mediatek.com",
  dimensity: "mediatek.com",
  exynos: "samsung.com",
  "apple m": "apple.com",
  m1: "apple.com",
  m2: "apple.com",
  m3: "apple.com",
  m4: "apple.com",
};

/** Checks if cleaned title matches a known company → returns its domain */
function detectCompanyDomain(cleaned: string): string | null {
  const lower = cleaned.toLowerCase().trim();
  // Exact match first
  if (COMPANY_DOMAIN_MAP[lower]) return COMPANY_DOMAIN_MAP[lower];
  // Partial match (title starts with or contains company name)
  for (const [key, domain] of Object.entries(COMPANY_DOMAIN_MAP)) {
    if (
      lower === key ||
      lower.startsWith(key + " ") ||
      lower.endsWith(" " + key)
    ) {
      return domain;
    }
  }
  return null;
}

function EntityHeaderImage({ title }: { title: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isLogo, setIsLogo] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setImgUrl(null);
    setIsLogo(false);
    setErrorCount(0);
    const cleaned = title.trim();
    if (!cleaned) return;

    const lower = cleaned.toLowerCase();
    const skipWords = [
      "الميزة",
      "الخاصية",
      "مقارنة",
      "الوجه",
      "العنصر",
      "attributes",
      "attribute",
      "feature",
      "features",
      "property",
      "properties",
      "comparison",
      "vs",
      "versus",
      "aspect",
      "aspects",
      "criteria",
      "criterion",
      "spec",
      "specs",
      "specification",
      "specifications",
      "metric",
      "metrics",
      "parameter",
      "parameters",
      "value",
      "values",
      "details",
      "detail",
      // English table descriptors
      "price",
      "cost",
      "rating",
      "score",
      "weight",
      "dimensions",
      "camera",
      "processor",
      "chipset",
      "battery",
      "storage",
      "ram",
      "screen",
      "display",
      "resolution",
      "os",
      "system",
      "release",
      "year",
      "date",
      "model",
      "launch",
      "availability",
      "status",
      "name",
      "title",
      "type",
      "category",
      "description",
      "summary",
      "conclusion",
      "pros",
      "cons",
      "advantages",
      "disadvantages",
      "speed",
      "performance",
      "graphics",
      "gpu",
      "cpu",
      "ports",
      "connectivity",
      "sensors",
      "colors",
      "design",
      "material",
      "warranty",
      "size",
      "brand",
      // Arabic table descriptors
      "السعر",
      "التكلفة",
      "التقييم",
      "الوزن",
      "الأبعاد",
      "الكاميرا",
      "المعالج",
      "البطارية",
      "مساحة التخزين",
      "الرام",
      "الشاشة",
      "الدقة",
      "نظام التشغيل",
      "تاريخ الإصدار",
      "السنة",
      "الاسم",
      "النوع",
      "الفئة",
      "الوصف",
      "الملخص",
      "العيوب",
      "المميزات",
      "السرعة",
      "الأداء",
      "كارت الشاشة",
      "الاتصال",
      "المنافذ",
      "الألوان",
      "التصميم",
      "المادة",
      "الضمان",
      "الحجم",
      "الشركة",
    ];

    const isNumericOrShort =
      /^\s*[\d\.\-\+\$\€\£\¥\%\s\,\/\:\\]+\s*$/.test(cleaned) ||
      cleaned.length < 2 ||
      cleaned.length > 40;

    if (skipWords.includes(lower) || isNumericOrShort) return;

    let active = true;

    const fetchImage = async () => {
      try {
        // ── 1. Company logo path ──────────────────────────────────────────────
        const domain = detectCompanyDomain(cleaned);
        if (domain) {
          // Use DuckDuckGo favicon (reliable, no CORS issues, hi-res)
          const logoUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
          if (active) {
            setImgUrl(logoUrl);
            setIsLogo(true);
          }
          return;
        }

        // ── 2. Wikipedia path for people, places, products ───────────────────
        const isArabic = /[\u0600-\u06FF]/.test(cleaned);
        const lang = isArabic ? "ar" : "en";

        // Direct title lookup first (most accurate)
        let thumbnail: string | null = null;
        const directUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleaned)}&prop=pageimages&format=json&pithumbsize=400&redirects=true&origin=*`;
        const resDirect = await fetch(directUrl);
        const dataDirect = await resDirect.json();
        const pagesDirect = dataDirect.query?.pages;
        if (pagesDirect) {
          const pageId = Object.keys(pagesDirect)[0];
          if (pageId !== "-1") {
            thumbnail = pagesDirect[pageId]?.thumbnail?.source ?? null;
          }
        }

        // Fallback: search generator (fuzzier but finds more results)
        if (!thumbnail) {
          const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleaned)}&gsrlimit=3&prop=pageimages&format=json&pithumbsize=400&origin=*`;
          const res = await fetch(searchUrl);
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            // Pick the page whose title most closely matches our query
            const entries = Object.values(pages) as any[];
            const best =
              entries.find(
                (p: any) =>
                  p.title?.toLowerCase().includes(lower) ||
                  lower.includes(p.title?.toLowerCase()),
              ) ?? entries[0];
            thumbnail = best?.thumbnail?.source ?? null;
          }
        }

        // Also try English Wikipedia as last resort for Arabic queries
        if (!thumbnail && isArabic) {
          const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleaned)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=400&origin=*`;
          const res = await fetch(enSearchUrl);
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            thumbnail = pages[pageId]?.thumbnail?.source ?? null;
          }
        }

        if (active && thumbnail) {
          setImgUrl(thumbnail);
          setIsLogo(false);
        }
      } catch (err) {
        console.error("EntityHeaderImage: fetch error for", cleaned, err);
      }
    };

    fetchImage();
    return () => {
      active = false;
    };
  }, [title]);

  const handleError = () => {
    const next = errorCount + 1;
    setErrorCount(next);
    if (next === 1 && imgUrl && !imgUrl.includes("images.weserv.nl")) {
      // Try weserv proxy on first error
      setImgUrl(
        `https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}&w=200&h=200&fit=contain&bg=white`,
      );
    } else {
      setImgUrl(null);
    }
  };

  if (!imgUrl) return null;

  return (
    <div className="flex flex-col items-center justify-center my-1.5 w-full animate-in fade-in zoom-in duration-300">
      <div
        className={`w-11 h-11 md:w-13 md:h-13 rounded-xl border shadow-md hover:scale-105 transition-all duration-300 overflow-hidden flex items-center justify-center ${
          isLogo
            ? "bg-white border-zinc-300/40 p-1.5"
            : "bg-zinc-900 border-violet-500/30"
        }`}
      >
        <img
          src={imgUrl}
          alt={title}
          referrerPolicy="no-referrer"
          onError={handleError}
          className={`transition-all duration-300 ${
            isLogo
              ? "w-full h-full object-contain"
              : "w-full h-full object-cover object-top rounded-lg"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Smart HTML Extractor ─────────────────────────────────────────────────────
// Detects any complete HTML page in a markdown message (with or without lang tag)
function extractHtmlFromContent(content: string): string | null {
  // 1. Find the HTML block (fenced with ```html)
  const htmlRegex = /```(?:html|htm)\s*\n([\s\S]*?)```/gi;
  let htmlCode: string | null = null;
  let match;
  while ((match = htmlRegex.exec(content)) !== null) {
    htmlCode = match[1].trim();
  }

  if (!htmlCode) {
    // Try bare HTML
    const bareHtml = content.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>)/i);
    if (bareHtml) {
      htmlCode = bareHtml[1].trim();
    } else {
      // Look for a generic code block that looks like HTML
      const genericRegex = /```(?:\w*)\s*\n([\s\S]*?)```/gi;
      const blocks: string[] = [];
      while ((match = genericRegex.exec(content)) !== null) {
        blocks.push(match[1].trim());
      }
      for (let i = blocks.length - 1; i >= 0; i--) {
        const inner = blocks[i];
        if (
          /<!DOCTYPE\s+html/i.test(inner) ||
          /^<html/i.test(inner) ||
          /<\/html>/i.test(inner)
        ) {
          htmlCode = inner;
          break;
        }
      }
    }
  }

  if (!htmlCode) return null;

  // 2. Extract CSS block (fenced with ```css)
  const cssRegex = /```css\s*\n([\s\S]*?)```/gi;
  let cssCode: string | null = null;
  while ((match = cssRegex.exec(content)) !== null) {
    cssCode = match[1].trim();
  }

  // 3. Extract JS block (fenced with ```javascript or ```js)
  const jsRegex = /```(?:javascript|js)\s*\n([\s\S]*?)```/gi;
  let jsCode: string | null = null;
  while ((match = jsRegex.exec(content)) !== null) {
    jsCode = match[1].trim();
  }

  // Assemble HTML + CSS + JS if available
  let bundled = htmlCode;
  const htmlAlreadyHasCss =
    /<style[\s>]/i.test(bundled) ||
    /<link[^>]+rel=["']stylesheet["']/i.test(bundled);
  const htmlAlreadyHasJs = /<script[\s>]/i.test(bundled);

  // Inject viewport meta if head/html tags exist but viewport is missing
  if (!/<meta[^>]*name=["']viewport["']/i.test(bundled)) {
    if (/<head[^>]*>/i.test(bundled)) {
      bundled = bundled.replace(
        /(<\/head>)/i,
        `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n$1`,
      );
    } else if (/<html[^>]*>/i.test(bundled)) {
      bundled = bundled.replace(
        /(<html[^>]*>)/i,
        `$1\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`,
      );
    }
  }

  // Inject UTF-8 charset if charset meta is missing
  if (!/charset/i.test(bundled)) {
    if (/<head[^>]*>/i.test(bundled)) {
      bundled = bundled.replace(/(<\/head>)/i, `  <meta charset="UTF-8">\n$1`);
    }
  }

  // Inject CSS
  if (cssCode && !htmlAlreadyHasCss) {
    const styleTag = `\n  <style>\n${cssCode}\n  </style>\n`;
    if (/<\/head>/i.test(bundled)) {
      bundled = bundled.replace(/(<\/head>)/i, `${styleTag}$1`);
    } else if (/<body/i.test(bundled)) {
      bundled = bundled.replace(/(<body[^>]*>)/i, `$1${styleTag}`);
    } else {
      bundled = styleTag + bundled;
    }
  }

  // Inject JS
  if (jsCode && !htmlAlreadyHasJs) {
    const scriptTag = `\n  <script>\n${jsCode}\n  </script>\n`;
    if (/<\/body>/i.test(bundled)) {
      bundled = bundled.replace(/(<\/body>)/i, `${scriptTag}$1`);
    } else {
      bundled = bundled + scriptTag;
    }
  }

  return bundled;
}

function getMCQQuizState(content: string): {
  hasPendingBlock: boolean;
  sanitizedContent: string;
} {
  const completeBlockRegex = /```mcq-quiz\s*\n[\s\S]*?```/gi;
  const completeMatches = content.match(completeBlockRegex) || [];
  const contentWithoutCompleteBlocks = content.replace(completeBlockRegex, "");
  const pendingBlockRegex = /```mcq-quiz\s*\n[\s\S]*$/i;
  const hasPendingBlock = pendingBlockRegex.test(contentWithoutCompleteBlocks);

  if (!hasPendingBlock) {
    return { hasPendingBlock: false, sanitizedContent: content };
  }

  return {
    hasPendingBlock: true,
    sanitizedContent: content.replace(pendingBlockRegex, "").trimEnd(),
  };
}

function getPDFDocumentState(content: string): {
  hasPendingBlock: boolean;
  sanitizedContent: string;
} {
  const completeBlockRegex = /```pdf-document\s*\n[\s\S]*?```/gi;
  const completeMatches = content.match(completeBlockRegex) || [];
  const contentWithoutCompleteBlocks = content.replace(completeBlockRegex, "");
  const pendingBlockRegex = /```pdf-document\s*\n[\s\S]*$/i;
  const hasPendingBlock = pendingBlockRegex.test(contentWithoutCompleteBlocks);

  if (
    !hasPendingBlock ||
    (completeMatches.length === 0 && !pendingBlockRegex.test(content))
  ) {
    return {
      hasPendingBlock,
      sanitizedContent: hasPendingBlock
        ? content.replace(pendingBlockRegex, "").trimEnd()
        : content,
    };
  }

  return {
    hasPendingBlock: true,
    sanitizedContent: content.replace(pendingBlockRegex, "").trimEnd(),
  };
}

// ─── Status Cleaners & Tracking ───────────────────────────────────────────────
// ─── Status Cleaners & Tracking ───────────────────────────────────────────────
function cleanStatusMarkers(content: string): string {
  let cleaned = content;
  // 1. Remove [🤖 ...] lines
  cleaned = cleaned.replace(/^\s*\[🤖[^\]]*\]\s*$/gm, "");

  // 2. Remove intermediate code blocks wrapped in <html_code>, <css_code>, <js_code>
  cleaned = cleaned.replace(
    /<(html_code|css_code|js_code)>[\s\S]*?<\/\1>/gi,
    "",
  );

  // 3. Hide streaming intermediate blocks that are not yet closed
  cleaned = cleaned.replace(
    /<(html_code|css_code|js_code)>[\s\S]*/gi,
    (match, tag) => {
      if (!match.includes(`</${tag}>`)) {
        return "";
      }
      return match;
    },
  );

  // 4. Remove <plan>...</plan> block from markdown rendering so it doesn't clutter the chat
  cleaned = cleaned.replace(/<plan>[\s\S]*?<\/plan>/gi, "");
  // Hide streaming unclosed plan tags
  cleaned = cleaned.replace(/<plan>[\s\S]*/gi, "");

  // 5. Remove Web Search Context and Image Links blocks
  cleaned = cleaned.replace(
    /=== REAL-TIME WEB SEARCH CONTEXT ===[\s\S]*?(?=(?:\*\*\[Phase|\[Phase|\#\# APEX|### Architecture|\`\`\`html|$))/i,
    "",
  );
  cleaned = cleaned.replace(
    /=== REAL TOPIC IMAGE LINKS ===[\s\S]*?(?=(?:\*\*\[Phase|\[Phase|\#\# APEX|### Architecture|\`\`\`html|$))/i,
    "",
  );

  // 6. Split by lines and remove logging lines
  const lines = cleaned.split("\n");
  let inFencedCodeBlock = false;
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFencedCodeBlock = !inFencedCodeBlock;
      return true;
    }
    if (inFencedCodeBlock) return true;
    if (!trimmed) return true; // keep blank lines for markdown spacing

    // Check if it is a phase header or search/architect activity log
    if (
      trimmed.startsWith("**[Phase") ||
      trimmed.startsWith("[Phase") ||
      trimmed.startsWith("**Phase")
    )
      return false;
    if (trimmed.startsWith("Searching Google for")) return false;
    if (trimmed.startsWith("Collecting supporting references")) return false;
    if (trimmed.startsWith("Analyzing requirements")) return false;
    if (trimmed.startsWith("Updating system specification")) return false;
    if (trimmed.startsWith("Updating the formal specification")) return false;
    if (trimmed.startsWith("Preparing a formal project specification"))
      return false;
    if (trimmed.startsWith("Constructing semantic DOM")) return false;
    if (trimmed.startsWith("Constructing the semantic multi-page DOM"))
      return false;
    if (trimmed.startsWith("Extracting DOM tokens")) return false;
    if (trimmed.startsWith("Registering DOM selectors")) return false;
    if (trimmed.startsWith("Generating styles and logic")) return false;
    if (trimmed.startsWith("Producing the responsive style layer"))
      return false;
    if (trimmed.startsWith("Compiling assets into")) return false;
    if (trimmed.startsWith("Compiling the approved assets")) return false;
    if (trimmed.startsWith("Auditing integration consistency")) return false;
    if (trimmed.startsWith("AI Customization Questionnaire is active"))
      return false;
    if (trimmed.startsWith("Please confirm the configuration choices"))
      return false;

    // Check if it is an agent output line starting with >
    if (trimmed.startsWith(">")) return false;

    // Check if it is a general metadata line from spec generation
    if (
      trimmed.startsWith("Project:") ||
      trimmed.startsWith("Colors:") ||
      trimmed.startsWith("Fonts:") ||
      trimmed.startsWith("System Specification") ||
      trimmed.startsWith("Goal:") ||
      trimmed.startsWith("Description:")
    )
      return false;
    if (
      trimmed.startsWith("HTML generated -") ||
      trimmed.startsWith("**HTML generated**")
    )
      return false;
    if (
      trimmed.startsWith("Markup package completed -") ||
      trimmed.startsWith("**Markup package completed**")
    )
      return false;
    if (
      trimmed.startsWith("Selector Map built -") ||
      trimmed.startsWith("**Selector Map built**")
    )
      return false;
    if (
      trimmed.startsWith("Selector registry completed -") ||
      trimmed.startsWith("**Selector registry completed**")
    )
      return false;
    if (
      trimmed.startsWith("Parallel compilation complete") ||
      trimmed.startsWith("**Parallel compilation complete**")
    )
      return false;
    if (
      trimmed.startsWith("Presentation and logic package completed") ||
      trimmed.startsWith("**Presentation and logic package completed**")
    )
      return false;
    if (
      trimmed.startsWith("Bundle assembled -") ||
      trimmed.startsWith("**Bundle assembled**")
    )
      return false;
    if (
      trimmed.startsWith("Release bundle assembled -") ||
      trimmed.startsWith("**Release bundle assembled**")
    )
      return false;
    if (
      trimmed.startsWith("Quality review completed -") ||
      trimmed.startsWith("**Quality review completed**")
    )
      return false;
    if (
      trimmed.startsWith("**Spec generated**") ||
      trimmed.startsWith("**Spec updated**")
    )
      return false;
    if (
      trimmed.startsWith("**Specification approved for confirmation**") ||
      trimmed.startsWith("**Specification updated**")
    )
      return false;
    if (
      trimmed.startsWith("Resuming with selected choices:") ||
      trimmed.startsWith("**Resuming with selected choices:**")
    )
      return false;
    if (
      trimmed.startsWith("Confirmed configuration:") ||
      trimmed.startsWith("**Confirmed configuration:**")
    )
      return false;

    // Remove individual Source/Image references if they slipped through
    if (
      trimmed.startsWith("[Source") ||
      trimmed.startsWith("Snippet:") ||
      trimmed.startsWith("Link:")
    )
      return false;
    if (trimmed.startsWith("[Image") || trimmed.startsWith("URL:"))
      return false;

    return true;
  });

  return filteredLines.join("\n").trim();
}

// ─── Plan Extractors & Parsers ────────────────────────────────────────────────
function extractPlanFromContent(content: string): string | null {
  const regex = /<plan>([\s\S]*?)<\/plan>/i;
  const match = content.match(regex);
  if (match) return match[1].trim();

  // If streaming and not closed yet, match from <plan> to the end
  const openMatch = content.match(/<plan>([\s\S]*)/i);
  if (openMatch && !openMatch[1].includes("</plan>")) {
    return openMatch[1].trim();
  }
  return null;
}

interface PlanItem {
  id: string;
  text: string;
  completed: boolean;
}

interface PlanSection {
  title: string;
  items: PlanItem[];
}

function parsePlanContent(planText: string, content: string): PlanSection[] {
  if (!planText) return [];

  const sections: PlanSection[] = [];

  // Track status to dynamically set checked states
  const htmlCompleted =
    content.includes("[🤖 CSS Specialist:") ||
    content.includes("<css_code>") ||
    content.includes("[🤖 JavaScript Specialist:") ||
    content.includes("<js_code>") ||
    content.includes("[🤖 Integration Auditor:") ||
    content.includes("Architecture Notes") ||
    content.includes("✅ Architecture Notes");
  const cssCompleted =
    content.includes("[🤖 JavaScript Specialist:") ||
    content.includes("<js_code>") ||
    content.includes("[🤖 Integration Auditor:") ||
    content.includes("Architecture Notes") ||
    content.includes("✅ Architecture Notes");
  const jsCompleted =
    content.includes("[🤖 Integration Auditor:") ||
    content.includes("Architecture Notes") ||
    content.includes("✅ Architecture Notes");
  const qaCompleted =
    !content.includes("[🤖") &&
    (content.includes("Architecture Notes") ||
      content.includes("✅ Architecture Notes"));

  if (typeof document !== "undefined") {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = planText;

    const headings = tempDiv.querySelectorAll("h2, h3, h4");
    if (headings.length > 0) {
      headings.forEach((heading, hIdx) => {
        const sectionTitle =
          heading.textContent?.replace(/^\d+[\.\-\s]*/, "").trim() ||
          `القسم ${hIdx + 1}`;
        const items: PlanItem[] = [];

        let sibling = heading.nextElementSibling;
        while (sibling && !["H2", "H3", "H4"].includes(sibling.tagName)) {
          if (sibling.tagName === "UL" || sibling.tagName === "OL") {
            sibling.querySelectorAll("li").forEach((li, liIdx) => {
              const liText = li.textContent?.trim();
              if (liText) {
                items.push({
                  id: `${sectionTitle}-${liIdx}`,
                  text: liText,
                  completed: false,
                });
              }
            });
          } else if (sibling.tagName === "P") {
            const pText = sibling.textContent?.trim();
            if (pText && pText.length > 10) {
              items.push({
                id: `${sectionTitle}-p-${items.length}`,
                text: pText,
                completed: false,
              });
            }
          }
          sibling = sibling.nextElementSibling;
        }

        if (items.length > 0) {
          sections.push({ title: sectionTitle, items });
        }
      });
    }
  }

  // Fallback: If no HTML tags were parsed, parse as Markdown
  if (sections.length === 0) {
    const lines = planText.split("\n");
    let currentSection: PlanSection | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const headerMatch = trimmed.match(/^(?:#{1,4})\s+(.*)$/);
      if (headerMatch) {
        if (currentSection && currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headerMatch[1].replace(/^\d+[\.\-\s]*/, "").trim(),
          items: [],
        };
      } else {
        const listMatch = trimmed.match(/^(?:[-*+]\s+|\d+\.\s+)(.*)$/);
        if (listMatch && currentSection) {
          currentSection.items.push({
            id: `md-${currentSection.title}-${currentSection.items.length}`,
            text: listMatch[1].trim(),
            completed: false,
          });
        } else if (trimmed.length > 10 && currentSection) {
          currentSection.items.push({
            id: `md-text-${currentSection.title}-${currentSection.items.length}`,
            text: trimmed,
            completed: false,
          });
        }
      }
    }

    if (currentSection && currentSection.items.length > 0) {
      sections.push(currentSection);
    }
  }

  // Final generic fallback if parsing yielded nothing
  if (sections.length === 0) {
    sections.push({
      title: "خطة البناء والتنفيذ",
      items: [
        {
          id: "gen-html",
          text: "بناء هيكل الصفحة دلالياً وتأمين الأقسام المطلوبة",
          completed: false,
        },
        {
          id: "gen-css",
          text: "تصميم المظهر المتجاوب والتنسيقات الزجاجية المظلمة",
          completed: false,
        },
        {
          id: "gen-js",
          text: "برمجة المنطق التفاعلي وتأثيرات الحركة والتحقق",
          completed: false,
        },
      ],
    });
  }

  // Apply real-time checklist completion updates
  sections.forEach((section) => {
    const titleLower = section.title.toLowerCase();
    const isHtmlSec =
      titleLower.includes("html") ||
      titleLower.includes("هيكل") ||
      titleLower.includes("بناء") ||
      titleLower.includes("markup");
    const isCssSec =
      titleLower.includes("css") ||
      titleLower.includes("تصميم") ||
      titleLower.includes("تنسيق") ||
      titleLower.includes("style");
    const isJsSec =
      titleLower.includes("js") ||
      titleLower.includes("javascript") ||
      titleLower.includes("منطق") ||
      titleLower.includes("تفاعل") ||
      titleLower.includes("logic");
    const isNotesSec =
      titleLower.includes("ملاحظات") ||
      titleLower.includes("إضافي") ||
      titleLower.includes("qa") ||
      titleLower.includes("تدقيق") ||
      titleLower.includes("note");

    section.items.forEach((item) => {
      if (isHtmlSec) {
        item.completed = htmlCompleted;
      } else if (isCssSec) {
        item.completed = cssCompleted;
      } else if (isJsSec) {
        item.completed = jsCompleted;
      } else if (isNotesSec) {
        item.completed = qaCompleted;
      } else {
        if (qaCompleted) item.completed = true;
        else if (jsCompleted) item.completed = true;
        else if (cssCompleted && !isJsSec) item.completed = true;
      }
    });
  });

  return sections;
}

interface UnboundPlanCardProps {
  planText: string;
  messageContent: string;
  isStreaming: boolean;
}

export function UnboundPlanCard({
  planText,
  messageContent,
  isStreaming,
}: UnboundPlanCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sections = parsePlanContent(planText, messageContent);

  let totalItems = 0;
  let completedItems = 0;
  sections.forEach((s) => {
    totalItems += s.items.length;
    s.items.forEach((i) => {
      if (i.completed) completedItems++;
    });
  });

  const progressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="relative font-sans text-xs my-1 w-full text-foreground max-w-xl animate-in fade-in duration-300">
      <div className="relative rounded-xl border border-zinc-900 bg-zinc-950/80 backdrop-blur-xl shadow-lg overflow-hidden">
        {/* Header bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-400 uppercase">
                خطة العمل التنفيذية · APEX PLAN CHECKLIST
              </p>
              <p className="text-[8.5px] text-zinc-400 tracking-wider mt-0.5 font-sans">
                {progressPercent === 100
                  ? "✓ تم تنفيذ جميع المهام بنجاح"
                  : `نسبة الإنجاز: %${progressPercent} (${completedItems}/${totalItems})`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md">
              {progressPercent}%
            </span>
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </div>
        </button>

        {/* List content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-zinc-900/60 bg-zinc-950/20"
            >
              <div className="p-3.5 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-1.5">
                    <h4 className="text-[9.5px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider text-left">
                      <span className="w-1 h-1 rounded-full bg-violet-500" />
                      {section.title}
                    </h4>
                    <div className="space-y-1 pl-2.5 border-l border-zinc-900/80">
                      {section.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          className="flex items-start gap-2 py-0.5 text-zinc-300"
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in duration-200" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 bg-zinc-900/50 flex items-center justify-center shrink-0">
                                <Clock className="w-2 h-2 text-zinc-600 animate-pulse" />
                              </div>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-[10px] leading-relaxed transition-all text-left",
                              item.completed
                                ? "text-zinc-500 line-through"
                                : "text-zinc-300",
                            )}
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface UnboundWebGenStatusCardProps {
  content: string;
  isStreaming: boolean;
}

export function UnboundWebGenStatusCard({
  content,
  isStreaming,
}: UnboundWebGenStatusCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    {
      key: "architect",
      label: "تخطيط وهيكلة الموقع · Lead Architect Blueprint",
      marker: "[🤖 Lead Architect:",
      icon: Brain,
    },
    {
      key: "html",
      label: "بناء هيكل الصفحة HTML · HTML Specialist Markup",
      marker: "[🤖 HTML Specialist:",
      icon: Code2,
    },
    {
      key: "css",
      label: "تصميم وتنسيق CSS · CSS Specialist Styles",
      marker: "[🤖 CSS Specialist:",
      icon: Palette,
    },
    {
      key: "javascript",
      label: "إضافة التفاعل والمنطق JS · JS Specialist Interactivity",
      marker: "[🤖 JavaScript Specialist:",
      icon: Zap,
    },
    {
      key: "integrator",
      label: "دمج الكود واختبار الأخطاء QA · Integration QA Auditor",
      marker: "[🤖 Integration Auditor:",
      icon: Hammer,
    },
  ];

  let activeIndex = -1;
  let hasAny = false;

  const parsedSteps = steps.map((step, idx) => {
    const hasStarted = content.includes(step.marker);
    if (hasStarted) {
      hasAny = true;
      activeIndex = idx;
    }
    return {
      ...step,
      started: hasStarted,
      completed: false,
    };
  });

  if (!hasAny) return null;

  // Calculate completions
  parsedSteps.forEach((step, idx) => {
    if (step.started) {
      const nextStepStarted = parsedSteps.slice(idx + 1).some((s) => s.started);
      if (nextStepStarted || !isStreaming) {
        step.completed = true;
      }
    }
  });

  const currentStep = parsedSteps[activeIndex];
  const allComplete = !isStreaming;

  return (
    <div className="relative font-mono text-xs my-3 w-full text-foreground max-w-xl">
      <div className="relative rounded-xl border border-zinc-900 bg-zinc-950/80 backdrop-blur-xl shadow-lg overflow-hidden animate-in fade-in duration-300">
        {/* Glow accent */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px] transition-all duration-700",
            allComplete
              ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600"
              : "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 animate-gradient bg-[length:200%_200%]",
          )}
        />

        {/* Header bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "p-1 rounded-md border",
                allComplete
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-violet-500/10 border-violet-500/20 text-violet-400 animate-pulse",
              )}
            >
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-[0.12em] text-foreground uppercase">
                APEX UNBOUND · Multi-AI Web Engine
              </p>
              <p className="text-[8.5px] text-zinc-400 tracking-wider mt-0.5 font-sans">
                {allComplete
                  ? "✓ جميع العمليات البرمجية مكتملة"
                  : `جاري التشغيل: ${currentStep?.label.split("·")[0].trim() || "تجهيز الوكلاء"}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                allComplete
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-violet-500/10 text-violet-400 border-violet-500/20 animate-pulse",
              )}
            >
              {allComplete
                ? "Complete"
                : `${parsedSteps.filter((s) => s.completed).length + 1}/5 Active`}
            </span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </button>

        {/* Dropdown list */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden border-t border-zinc-900 bg-zinc-950/90"
            >
              <div className="p-3 space-y-2">
                {parsedSteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  const isActive = step.started && !step.completed;
                  const isDone = step.completed;
                  const isPending = !step.started;

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200",
                        isDone && "bg-emerald-500/5 border-emerald-950/20",
                        isActive &&
                          "bg-violet-500/5 border-violet-950/30 animate-pulse",
                        isPending &&
                          "bg-transparent border-zinc-900 opacity-40",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "p-1.5 rounded-md border",
                            isDone &&
                              "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                            isActive &&
                              "bg-violet-500/10 border-violet-500/20 text-violet-400",
                            isPending &&
                              "bg-zinc-900 border-zinc-800 text-zinc-600",
                          )}
                        >
                          <StepIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 font-sans text-left">
                          <p
                            className={cn(
                              "text-[11px] font-bold leading-none mb-1",
                              isDone && "text-emerald-400",
                              isActive && "text-violet-400",
                              isPending && "text-zinc-500",
                            )}
                          >
                            {step.label}
                          </p>
                          <p className="text-[8px] text-zinc-500 uppercase font-mono tracking-wider text-left">
                            {idx === 0 && "Architect"}
                            {idx === 1 && "HTML Coder"}
                            {idx === 2 && "CSS Styler"}
                            {idx === 3 && "JavaScript Dev"}
                            {idx === 4 && "QA Integrator"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Done
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 animate-pulse">
                            <Activity className="w-2.5 h-2.5 animate-spin" />
                            Active
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800">
                            <Clock className="w-2.5 h-2.5" />
                            Queue
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Unbound Console Logs Terminal ──────────────────────────────────────────
interface LogItem {
  type: "info" | "success" | "warning" | "error" | "search" | "image" | "phase";
  text: string;
}

function parseLogs(content: string): LogItem[] {
  const lines = content.split("\n");
  const logs: LogItem[] = [];

  let inSearchContext = false;
  let inImageLinks = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for search context headers
    if (line.includes("=== REAL-TIME WEB SEARCH CONTEXT ===")) {
      inSearchContext = true;
      inImageLinks = false;
      logs.push({
        type: "phase",
        text: "🔍 Starting Integrated Web Search...",
      });
      continue;
    }
    if (line.includes("=== REAL TOPIC IMAGE LINKS ===")) {
      inSearchContext = false;
      inImageLinks = true;
      logs.push({
        type: "phase",
        text: "🖼️ Extracting Media & Image Assets...",
      });
      continue;
    }

    // Parse search context details
    if (inSearchContext) {
      if (line.startsWith("[Source")) {
        logs.push({
          type: "search",
          text: `Reference: ${line.substring(line.indexOf("Title:") + 6).trim()}`,
        });
      } else if (line.startsWith("Link:")) {
        logs.push({
          type: "info",
          text: `   ↳ URL: ${line.substring(5).trim()}`,
        });
      }
      // If we hit next phase, turn off search context flag
      if (
        line.startsWith("**[Phase") ||
        line.startsWith("[Phase") ||
        line.includes("=== REAL TOPIC IMAGE LINKS ===")
      ) {
        inSearchContext = false;
      } else {
        continue;
      }
    }

    // Parse image links details
    if (inImageLinks) {
      if (line.startsWith("[Image")) {
        logs.push({
          type: "image",
          text: `Asset: ${line.substring(line.indexOf("Title:") + 6).trim()}`,
        });
      } else if (line.startsWith("URL:")) {
        logs.push({
          type: "info",
          text: `   ↳ URL: ${line.substring(4).trim()}`,
        });
      }
      // If we hit next phase, turn off image link flag
      if (line.startsWith("**[Phase") || line.startsWith("[Phase")) {
        inImageLinks = false;
      } else {
        continue;
      }
    }

    // Phase header lines
    if (line.startsWith("**[Phase") || line.startsWith("[Phase")) {
      const cleanPhase = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "phase", text: cleanPhase });
      continue;
    }

    // Spec metadata or settings
    if (
      line.startsWith("Project:") ||
      line.startsWith("Colors:") ||
      line.startsWith("Fonts:") ||
      line.startsWith("System Specification") ||
      line.startsWith("Goal:") ||
      line.startsWith("Description:") ||
      line.startsWith("Interface palette:") ||
      line.startsWith("Typography system:")
    ) {
      logs.push({ type: "info", text: line });
      continue;
    }
    if (
      line.startsWith("> Project:") ||
      line.startsWith("> Colors:") ||
      line.startsWith("> Fonts:")
    ) {
      logs.push({ type: "info", text: line.substring(1).trim() });
      continue;
    }

    // Status logs starting with >
    if (line.startsWith(">")) {
      const logText = line.substring(1).trim();
      let type: LogItem["type"] = "info";
      if (
        logText.toLowerCase().includes("complete") ||
        logText.toLowerCase().includes("success") ||
        logText.includes("PASSED") ||
        logText.startsWith("✓")
      ) {
        type = "success";
      } else if (
        logText.toLowerCase().includes("warning") ||
        logText.toLowerCase().includes("violation")
      ) {
        type = "warning";
      } else if (
        logText.toLowerCase().includes("error") ||
        logText.toLowerCase().includes("failed")
      ) {
        type = "error";
      }
      logs.push({ type, text: logText });
      continue;
    }

    // Intermediate results summary
    if (
      line.startsWith("**HTML generated**") ||
      line.startsWith("HTML generated -") ||
      line.startsWith("**Selector Map built**") ||
      line.startsWith("Selector Map built -") ||
      line.startsWith("**Selector registry completed**") ||
      line.startsWith("Selector registry completed -") ||
      line.startsWith("**Parallel compilation complete**") ||
      line.startsWith("Parallel compilation complete -") ||
      line.startsWith("**Presentation and logic package completed**") ||
      line.startsWith("Presentation and logic package completed -") ||
      line.startsWith("**Bundle assembled**") ||
      line.startsWith("Bundle assembled -") ||
      line.startsWith("**Release bundle assembled**") ||
      line.startsWith("Release bundle assembled -") ||
      line.startsWith("**Quality review completed**") ||
      line.startsWith("Quality review completed -") ||
      line.startsWith("**Spec generated**") ||
      line.startsWith("**Spec updated**") ||
      line.startsWith("**Specification approved for confirmation**") ||
      line.startsWith("**Specification updated**") ||
      line.startsWith("Resuming with selected choices:") ||
      line.startsWith("**Resuming with selected choices:**") ||
      line.startsWith("Confirmed configuration:") ||
      line.startsWith("**Confirmed configuration:**")
    ) {
      const cleanText = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "success", text: `✓ ${cleanText}` });
      continue;
    }
  }

  return logs;
}

interface UnboundConsoleProps {
  content: string;
  isStreaming: boolean;
}

export function UnboundConsole({ content, isStreaming }: UnboundConsoleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const logs = parseLogs(content);

  // Auto-scroll logs to bottom during active streaming
  useEffect(() => {
    if (isStreaming && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, isStreaming]);

  if (logs.length === 0) return null;

  return (
    <div className="relative font-mono text-xs my-3 w-full text-foreground max-w-xl">
      <div className="relative rounded-xl border border-zinc-950 bg-zinc-950/80 backdrop-blur-xl shadow-lg overflow-hidden animate-in fade-in duration-300">
        {/* Terminal Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-all text-left border-b border-zinc-900 bg-zinc-950/40"
        >
          <div className="flex items-center gap-2.5">
            {/* Terminal Window Controls */}
            <div className="flex items-center gap-1.5 mr-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <Terminal className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>APEX Console Logs</span>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-sans tracking-normal lowercase normal-case">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  compiling...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
              {logs.length} Lines
            </span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </button>

        {/* Terminal Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                ref={containerRef}
                className="p-3.5 bg-zinc-950/95 font-mono text-[10px] leading-relaxed max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800/80 scrollbar-track-transparent text-left"
              >
                {logs.map((log, idx) => {
                  let colorClass = "text-zinc-300";
                  if (log.type === "phase") {
                    colorClass =
                      "text-violet-400 font-bold border-b border-zinc-900/60 pb-1 mt-2.5 first:mt-0";
                  } else if (log.type === "success") {
                    colorClass = "text-emerald-400";
                  } else if (log.type === "warning") {
                    colorClass = "text-amber-400";
                  } else if (log.type === "error") {
                    colorClass = "text-red-400";
                  } else if (log.type === "search") {
                    colorClass = "text-sky-400";
                  } else if (log.type === "image") {
                    colorClass = "text-fuchsia-400";
                  } else if (log.type === "info") {
                    colorClass = "text-zinc-500";
                  }

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "whitespace-pre-wrap select-all selection:bg-violet-500/20",
                        colorClass,
                      )}
                    >
                      {log.type !== "phase" && (
                        <span className="text-zinc-600 mr-2 select-none">
                          &gt;
                        </span>
                      )}
                      {log.text}
                    </div>
                  );
                })}
                <div ref={consoleEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Web Preview Modal ────────────────────────────────────────────────────────
function WebPreviewModal({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [url, setUrl] = useState<string>("");

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Generate short-lived preview URL on mount via Express API
  useEffect(() => {
    let active = true;
    let processedHtml = html;
    if (!/<meta[^>]*name=["']viewport["']/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) {
        processedHtml = html.replace(
          /(<head[^>]*>)/i,
          `$1\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        );
      } else if (/<html[^>]*>/i.test(html)) {
        processedHtml = html.replace(
          /(<html[^>]*>)/i,
          `$1\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`,
        );
      }
    }

    fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: processedHtml }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to cache preview");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setUrl(`/preview/${data.id}`);
        }
      })
      .catch((err) => {
        console.error(
          "Failed to load server-cached preview, falling back to Blob:",
          err,
        );
        if (active) {
          const blob = new Blob([processedHtml], { type: "text/html" });
          const blobUrl = URL.createObjectURL(blob);
          setUrl(blobUrl);
        }
      });

    return () => {
      active = false;
    };
  }, [html]);

  // Cleanup blob URL if we had to fall back to it
  useEffect(() => {
    return () => {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const openInNewTab = () => {
    if (url) window.open(url, "_blank");
  };

  const reloadIframe = () => {
    if (!url) return;
    setIsLoaded(false);
    if (iframeRef.current) {
      iframeRef.current.src = "";
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = url;
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      {/* Modal Window */}
      <motion.div
        className={cn(
          "relative z-10 flex flex-col w-full h-full bg-zinc-950 border-zinc-800 transition-all duration-300 overflow-hidden shadow-2xl",
          deviceMode === "desktop"
            ? "max-w-7xl sm:h-[calc(100vh-2rem)] sm:rounded-2xl sm:border"
            : "w-full max-w-[375px] sm:h-[667px] sm:rounded-2xl sm:border ring-4 ring-zinc-800/50",
        )}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        {/* Browser Toolbar */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
          {/* Left: Window Controls / Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors sm:hidden"
              title="Close"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors shrink-0"
                title="Close"
                type="button"
              />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 shrink-0" />
              <div className="w-3 h-3 rounded-full bg-green-500/80 shrink-0" />
            </div>

            <span className="text-[11px] text-zinc-400 font-sans font-bold ml-1 sm:hidden">
              معاينة الموقع
            </span>
          </div>

          {/* Middle: Device Toggle (Hidden on mobile screen) */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeviceMode("desktop")}
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 rounded-md transition-all duration-200",
                deviceMode === "desktop"
                  ? "bg-zinc-800 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-transparent",
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeviceMode("mobile")}
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 rounded-md transition-all duration-200",
                deviceMode === "mobile"
                  ? "bg-zinc-800 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-transparent",
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </Button>
          </div>

          {/* Right: URL Bar / Status */}
          <div className="flex-1 hidden md:flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 mx-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-zinc-400 font-mono truncate">
              apex://preview · Apex Coder Output
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={reloadIframe}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Refresh page"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openInNewTab}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors hidden sm:flex"
              title="Close preview"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Loading Indicator */}
        {!isLoaded && (
          <div className="absolute inset-0 top-[49px] z-20 flex items-center justify-center bg-zinc-950">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 animate-spin" />
              </div>
              <p className="text-xs text-zinc-400 font-mono animate-pulse">
                Rendering site...
              </p>
            </div>
          </div>
        )}

        {/* Split Window Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel (Desktop source code viewport) */}
          {deviceMode === "desktop" && (
            <div className="hidden md:flex flex-col w-1/2 border-r border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-mono shrink-0">
                Source HTML Code
              </div>
              <pre className="flex-1 p-4 overflow-auto text-xs text-zinc-300 font-mono bg-black/40">
                <code>{html}</code>
              </pre>
            </div>
          )}

          {/* Right panel (Iframe preview viewport) */}
          <div
            className={cn(
              "h-full relative overflow-hidden bg-white",
              deviceMode === "mobile" ? "w-full" : "flex-1 md:w-1/2",
            )}
          >
            {url && (
              <iframe
                ref={iframeRef}
                src={url}
                className="w-full h-full bg-white border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                onLoad={() => setIsLoaded(true)}
                title="Apex Coder Website Preview"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function replaceEmojisWithIcons(text: string): React.ReactNode {
  // First, strip any raw emojis
  const cleanText = text.replace(
    /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
    "",
  );

  // Regex to match [type::text]
  const pattern = /\[([a-zA-Z0-9_-]+)::([^\]]+)\]/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(cleanText)) !== null) {
    const matchIndex = match.index;

    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(cleanText.substring(lastIndex, matchIndex));
    }

    const type = match[1].toLowerCase();
    const content = match[2];

    // Select style and icon based on type
    let config = {
      className:
        "bg-muted text-foreground border border-border px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mx-1",
      icon: Info,
      iconColor: "text-muted-foreground w-3.5 h-3.5",
    };

    switch (type) {
      case "winner":
      case "gold":
      case "success":
      case "important":
      case "star":
        config = {
          className:
            "bg-violet-950/20 text-violet-400 border border-violet-900/30 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 mx-0.5 text-[13.5px]",
          icon: Sparkles,
          iconColor: "text-violet-400/80 w-3 h-3",
        };
        break;
      case "warning":
      case "danger":
        config = {
          className:
            "bg-rose-950/20 text-rose-400 border border-rose-900/30 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 mx-0.5 text-[13.5px]",
          icon: AlertTriangle,
          iconColor: "text-rose-400/80 w-3 h-3",
        };
        break;
      case "info":
      case "blue":
      case "idea":
      case "bulb":
      case "tech":
      case "code":
      case "metric":
      case "data":
      default:
        config = {
          className:
            "bg-blue-950/20 text-blue-400 border border-blue-900/30 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 mx-0.5 text-[13.5px]",
          icon: Info,
          iconColor: "text-blue-400/80 w-3 h-3",
        };
        break;
    }

    const IconComponent = config.icon;
    parts.push(
      <span key={matchIndex} className={config.className}>
        <IconComponent className={config.iconColor} />
        {content}
      </span>,
    );

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < cleanText.length) {
    parts.push(cleanText.substring(lastIndex));
  }

  return parts.length > 0 ? parts : cleanText;
}

interface MathBlockProps {
  formula: string;
}

function MathBlock({ formula }: MathBlockProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isArabic = /[\u0600-\u06FF]/.test(formula);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode: true,
          throwOnError: false,
          trust: false,
        });
      } catch (err) {
        console.error("Failed to render math block:", err);
        containerRef.current.textContent = formula;
      }
    }
  }, [formula]);

  return (
    <span className="block my-5 mx-auto w-full max-w-xl animate-in fade-in duration-300">
      <span
        className="relative block overflow-hidden rounded-lg border border-zinc-850 bg-zinc-950/90 p-5 shadow-sm"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Sleek Vertical Accent Line */}
        <span
          className={cn(
            "absolute top-0 bottom-0 w-1.5 bg-violet-600/80",
            isArabic ? "right-0" : "left-0",
          )}
        />

        {/* KaTeX Output container (forced to LTR internally so rendering is correct) */}
        <span
          ref={containerRef}
          className="block text-base md:text-lg font-bold text-foreground text-center overflow-x-auto py-2.5 select-all custom-scrollbar"
          dir="ltr"
        />
      </span>
    </span>
  );
}

interface MathInlineProps {
  formula: string;
}

function MathInline({ formula }: MathInlineProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode: false,
          throwOnError: false,
          trust: false,
        });
      } catch (err) {
        console.error("Failed to render math inline:", err);
        containerRef.current.textContent = formula;
      }
    }
  }, [formula]);

  return (
    <span
      ref={containerRef}
      className="inline-block bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 rounded text-[13.5px] font-bold text-violet-400 font-mono mx-1 align-middle"
      dir="ltr"
    />
  );
}

interface MathSegment {
  type: "text" | "math-block" | "math-inline";
  content: string;
}

function parseMathAndText(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let currentIndex = 0;

  // matches standard LaTeX forms ($$, \[, \() and parenthesised terms/formulas like (R_s = \frac{I_g R_g}{I - I_g})
  const regex =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|([(\[])[\s\S]+?([)\]]))/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];

    if (matchIndex > currentIndex) {
      segments.push({
        type: "text",
        content: text.substring(currentIndex, matchIndex),
      });
    }

    if (matchText.startsWith("$$") && matchText.endsWith("$$")) {
      segments.push({
        type: "math-block",
        content: matchText.slice(2, -2).trim(),
      });
    } else if (matchText.startsWith("\\[") || matchText.startsWith("\\[")) {
      segments.push({
        type: "math-block",
        content: matchText.replace(/^\\\[/, "").replace(/\\\]$/, "").trim(),
      });
    } else if (matchText.startsWith("\\(")) {
      segments.push({
        type: "math-inline",
        content: matchText.replace(/^\\\(/, "").replace(/\\\)$/, "").trim(),
      });
    } else {
      const inside = matchText.slice(1, -1).trim();

      const containsFrac = inside.includes("\\frac");
      const containsSubscript = /[a-zA-Z]_[a-zA-Z0-9]/.test(inside);
      const isSingleVariable = /^[A-Za-z](\s*,\s*[A-Za-z])*$/.test(inside);
      const containsMathOperators = /[a-zA-Z].*?[=+\-*/].*?[a-zA-Z0-9]/.test(
        inside,
      );
      const containsLaTeX = /\\[a-zA-Z]+/.test(inside);

      if (
        containsFrac ||
        containsSubscript ||
        isSingleVariable ||
        containsMathOperators ||
        containsLaTeX
      ) {
        const isBlock = inside.includes("=") || inside.length > 15;
        segments.push({
          type: isBlock ? "math-block" : "math-inline",
          content: inside,
        });
      } else {
        segments.push({
          type: "text",
          content: matchText,
        });
      }
    }

    currentIndex = regex.lastIndex;
  }

  if (currentIndex < text.length) {
    segments.push({
      type: "text",
      content: text.substring(currentIndex),
    });
  }

  return segments;
}

function renderTextWithMath(text: string): React.ReactNode {
  const segments = parseMathAndText(text);
  const nodes: React.ReactNode[] = [];

  segments.forEach((segment, idx) => {
    if (segment.type === "math-block") {
      nodes.push(<MathBlock key={`mb-${idx}`} formula={segment.content} />);
    } else if (segment.type === "math-inline") {
      nodes.push(<MathInline key={`mi-${idx}`} formula={segment.content} />);
    } else {
      const emojiNode = replaceEmojisWithIcons(segment.content);
      nodes.push(
        <React.Fragment key={`txt-${idx}`}>{emojiNode}</React.Fragment>,
      );
    }
  });

  return nodes;
}

// Helper to recursively detect if any child node contains Arabic characters
const hasArabicText = (node: React.ReactNode): boolean => {
  if (typeof node === "string") {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
      node,
    );
  }
  if (Array.isArray(node)) {
    return node.some(hasArabicText);
  }
  if (React.isValidElement(node)) {
    return hasArabicText(node.props.children);
  }
  return false;
};

function CodeBlockWrapper({
  language,
  code,
  parentContent,
}: {
  language: string;
  code: string;
  parentContent?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const lineCount = code.split("\n").length;
  const isLargeCode =
    lineCount > 15 ||
    [
      "html",
      "htm",
      "css",
      "js",
      "javascript",
      "ts",
      "typescript",
      "json",
    ].includes(language?.toLowerCase());
  const [isCollapsed, setIsCollapsed] = useState(isLargeCode);

  // Detect HTML: explicit lang tag OR body looks like an HTML document
  const isHtml =
    language === "html" ||
    language === "htm" ||
    (!language && (/<!DOCTYPE\s+html/i.test(code) || /^\s*<html/i.test(code)));

  const lastUserPrompt = useChatStore((state) => {
    const activeId = state.activeConversationId;
    const conv = state.conversations.find((c) => c.id === activeId);
    const userMsgs = conv?.messages.filter((m) => m.role === "user") ?? [];
    const lastMsg = userMsgs[userMsgs.length - 1];
    return lastMsg?.contextContent ?? lastMsg?.content ?? "";
  });

  const intentVerified = useMemo(() => {
    if (language === "mcq-quiz") {
      return detectQuizIntent(lastUserPrompt);
    }
    if (language === "pdf-document") {
      return detectPdfIntent(lastUserPrompt);
    }
    return false;
  }, [lastUserPrompt, language]);

  if (language === "mcq-quiz") {
    return <MCQQuizWidget jsonText={code} intentVerified={intentVerified} />;
  }

  if (language === "pdf-document") {
    return <PDFExportWidget jsonText={code} intentVerified={intentVerified} />;
  }

  const getBundledHtml = () => {
    if (!isHtml) return code;
    if (parentContent) {
      const bundled = extractHtmlFromContent(parentContent);
      if (bundled) return bundled;
    }
    return code;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fileExt =
      language === "javascript" || language === "js"
        ? "js"
        : language === "css"
          ? "css"
          : language === "json"
            ? "json"
            : language === "typescript" || language === "ts"
              ? "ts"
              : "html";
    const downloadCode = isHtml ? getBundledHtml() : code;
    const blob = new Blob([downloadCode], {
      type: isHtml ? "text/html" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `index.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInNewTab = async () => {
    const processedHtml = getBundledHtml();

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: processedHtml }),
      });
      if (!res.ok) throw new Error("Failed to cache preview");
      const data = await res.json();
      window.open(`/preview/${data.id}`, "_blank");
    } catch (err) {
      console.error(
        "Failed to open server-cached preview, falling back to Blob URL:",
        err,
      );
      const blob = new Blob([processedHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  return (
    <>
      {isCollapsed ? (
        <div className="my-4 rounded-xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-md overflow-hidden shadow-md flex items-center justify-between p-3.5 transition-all hover:border-zinc-700/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                {language || "code"} Source File
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {lineCount} lines ·{" "}
                {(new TextEncoder().encode(code).length / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHtml && (
              <Button
                onClick={openInNewTab}
                size="sm"
                className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg border-0 shadow-sm font-arabic"
                dir="rtl"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح الموقع</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="h-8 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all font-arabic"
              dir="rtl"
            >
              <span>عرض الكود</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-3 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all font-arabic"
              dir="rtl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="my-6 rounded-xl border border-border overflow-hidden bg-zinc-950 dark:bg-zinc-950/80 shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/60">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {language || "code"}
              </span>
              {isHtml && (
                <span className="text-[9px] font-semibold tracking-wider bg-violet-950/50 text-violet-400 border border-violet-900/50 px-1.5 py-0.5 rounded">
                  UNBOUND
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isLargeCode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="h-7 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all shadow-sm font-arabic"
                  dir="rtl"
                >
                  <span>إخفاء الكود</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-7 px-3 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all shadow-sm font-arabic"
                dir="rtl"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل</span>
              </Button>
              {isHtml && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openInNewTab}
                  className="h-7 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-lg transition-all shadow-sm font-semibold font-arabic"
                  dir="rtl"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح الموقع</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 hover:bg-muted text-muted-foreground hover:text-foreground gap-1.5 text-xs transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </>
  );
}

interface ChatMessagesProps {
  streamingContent?: string;
  streamingReasoning?: string;
  omniState?: OmniState | null;
  isOmniLoading?: boolean;
  isStreaming?: boolean;
  onSelectPrompt?: (prompt: string) => void;
  unboundState?: UnboundState | null;
  onSelectUnboundChoice?: (choice: any) => void;
}

const EMPTY_MESSAGES: Message[] = [];

export function ChatMessages({
  streamingContent,
  streamingReasoning,
  omniState,
  isOmniLoading,
  isStreaming,
  onSelectPrompt,
  unboundState,
  onSelectUnboundChoice,
}: ChatMessagesProps) {
  const selectedModel = useChatStore((state) => state.selectedModel);
  const reasoningLevel = useChatStore((state) => state.reasoningLevel);
  const isDeepResearch = useFeatureToggleStore((state) => state.deepResearch);
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore(
    (state) => state.activeConversationId,
  );

  const messages = useChatStore((state) => {
    const activeId = state.activeConversationId;
    const conv = state.conversations.find((c) => c.id === activeId);
    return conv?.messages ?? EMPTY_MESSAGES;
  });

  const lastUserMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.role === "user");
  }, [messages]);

  const isQuizRequest = useMemo(() => {
    if (!lastUserMessage) return false;
    const promptText =
      lastUserMessage.contextContent ?? lastUserMessage.content ?? "";
    return detectQuizIntent(promptText);
  }, [lastUserMessage]);

  const isPdfRequest = useMemo(() => {
    if (!lastUserMessage) return false;
    const promptText =
      lastUserMessage.contextContent ?? lastUserMessage.content ?? "";
    return detectPdfIntent(promptText);
  }, [lastUserMessage]);

  useEffect(() => {
    return () => {
      useChatStore.getState().setActiveQuizProgress(null);
    };
  }, []);

  // ── V2 Cognitive Monitor State ─────────────────────────────────────────────
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [monitorComplexity, setMonitorComplexity] = useState(0);
  const [monitorMask] = useState<AgentMaskConfiguration | null>(null);

  // Auto-open the monitor when Apex Omni starts a high-complexity stream
  useEffect(() => {
    if (selectedModel === "apex-omni" && isStreaming && streamingContent) {
      // Detect complexity level from Phase header in streaming content
      const level3Match = streamingContent.match(/Level 3 Stream/);
      const level2Match = streamingContent.match(/Level 2 Stream/);
      if (level3Match) {
        setMonitorComplexity(8);
        setMonitorOpen(true);
      } else if (level2Match) {
        setMonitorComplexity(5);
      } else {
        setMonitorComplexity(2);
      }
    }
    if (!isStreaming) {
      // Reset logs when a new message cycle begins
      if (!streamingContent) setPipelineLogs([]);
    }
  }, [selectedModel, isStreaming, streamingContent]);

  // Extract phase log lines from streaming content and route to monitor panel
  useEffect(() => {
    if (!streamingContent || selectedModel !== "apex-omni") return;
    const lines = streamingContent.split("\n");
    const logLines = lines.filter((line) => {
      const t = line.trim();
      return (
        t.startsWith("**[Phase") ||
        t.startsWith("[Phase") ||
        (t.startsWith(">") && t.length > 2) ||
        t.startsWith("[V2") ||
        t.startsWith("[Speculative") ||
        t.startsWith("[Concurrent")
      );
    });
    if (logLines.length > 0) {
      setPipelineLogs((prev) => {
        const combined = [...prev, ...logLines];
        const unique = Array.from(new Set(combined));
        return unique.slice(-50);
      });
    }
  }, [streamingContent, selectedModel]);
  // ── End V2 Monitor State ───────────────────────────────────────────────────

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const isAutoScrollRef = useRef(true);
  const prevMessagesLength = useRef(messages.length);
  const getScrollContainer = () =>
    messagesEndRef.current?.closest(
      ".chat-scroll-container",
    ) as HTMLElement | null;

  // Re-enable auto-scroll when user sends a new message
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      isAutoScrollRef.current = true;
      setIsAutoScroll(true);
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // Monitor manual scrolls
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 140;
      isAutoScrollRef.current = isAtBottom;
      setIsAutoScroll(isAtBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle actual scrolling
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 180;

    // If we think we should auto scroll, but the user is actually not at the bottom anymore,
    // it means they manually scrolled up. Cancel autoscroll.
    if (isAutoScrollRef.current && !isAtBottom) {
      isAutoScrollRef.current = false;
      setIsAutoScroll(false);
      return;
    }

    if (!isAutoScrollRef.current) return;

    const targetTop = Math.max(0, scrollHeight - clientHeight);
    if (isStreaming) {
      container.scrollTop = targetTop;
    } else {
      container.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    }
  }, [messages, streamingContent, isStreaming]);

  const scrollToBottom = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    // Re-enable autoscroll and jump to the newest message.
    isAutoScrollRef.current = true;
    setIsAutoScroll(true);
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  if (messages.length === 0 && !streamingContent && !streamingReasoning) {
    return (
      <div className="flex flex-col items-center justify-center py-10 md:py-16 max-w-2xl mx-auto px-4 text-center space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[60vh]">
        {/* Headings */}
        <div className="space-y-2 md:space-y-3 font-arabic" dir="rtl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-arabic">
            بماذا يمكنني مساعدتك اليوم؟
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed font-arabic">
            اكتب سؤالك الخاص في صندوق الإدخال للبدء.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message: Message, index: number) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 38,
              }}
            >
              {message.role === "user" ? (
                <UserMessage content={message.content} />
              ) : (
                <AssistantMessage
                  content={message.content}
                  model={message.model}
                  reasoning={message.reasoningContent}
                  omniState={(message as any).omniState}
                  unboundState={
                    message.model === "apex-coder" &&
                    index === messages.length - 1 &&
                    !isStreaming
                      ? unboundState
                      : undefined
                  }
                  onSelectUnboundChoice={onSelectUnboundChoice}
                  isPipelineActive={isStreaming}
                  query={
                    messages
                      .slice(0, index)
                      .reverse()
                      .find((m) => m.role === "user")?.content || ""
                  }
                />
              )}
            </motion.div>
          ))}

          {isStreaming &&
            !streamingContent &&
            !streamingReasoning &&
            selectedModel !== "apex-coder" &&
            selectedModel !== "apex-omni" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex gap-4"
              >
                <ThinkingBubble
                  isSearch={selectedModel === "apex-elite" || isDeepResearch}
                  isQuiz={isQuizRequest}
                  isPdf={isPdfRequest}
                  isThink={
                    reasoningLevel === "thinking" ||
                    reasoningLevel === "overthinking"
                  }
                  query={
                    messages.filter((m) => m.role === "user").slice(-1)[0]
                      ?.content || ""
                  }
                />
              </motion.div>
            )}

          {/* Apex Coder: Unified Dashboard — replaces QuestionnairePanel + UnboundStatusCard + WorkTreePanel */}
          {selectedModel === "apex-coder" &&
            unboundState &&
            !unboundState.completedAt && (
              <ApexCoderDashboard
                state={unboundState}
                content={streamingContent || ""}
                isStreaming={isStreaming}
                onSelectChoice={onSelectUnboundChoice}
                workTree={unboundState.workTree || null}
                planText={null}
              />
            )}
        </AnimatePresence>

        {/* Render the streaming message OUTSIDE AnimatePresence for instant, glitch-free swap */}
        {isStreaming &&
          (selectedModel === "apex-omni" ||
            streamingContent ||
            streamingReasoning) && (
            <div className="w-full mt-4">
              <AssistantMessage
                content={streamingContent || ""}
                model={selectedModel}
                reasoning={streamingReasoning}
                omniState={
                  selectedModel === "apex-omni"
                    ? omniState || undefined
                    : undefined
                }
                unboundState={undefined}
                onSelectUnboundChoice={onSelectUnboundChoice}
                isStreaming
              />
            </div>
          )}

        <div ref={messagesEndRef} />

        {/* Scroll-to-latest helper when user scrolls up */}
        {!isAutoScroll && messages.length > 0 && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-28 z-40 flex justify-center pointer-events-none">
            <Button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto h-9 px-4 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 shadow-lg shadow-black/40 backdrop-blur-md gap-2 font-arabic"
              dir="rtl"
            >
              <ChevronDown className="w-4 h-4" />
              <span>العودة لآخر رسالة</span>
              {isStreaming && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      className="flex gap-2 md:gap-3 justify-end"
      whileHover={{ x: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="max-w-[85%] md:max-w-[78%] relative">
        {/* Gradient border via pseudo-element using box-shadow */}
        <div className="bg-neutral-950 border border-zinc-900 rounded-2xl rounded-tr-md px-4 py-3 shadow-md shadow-black/30">
          <p className="text-[14.5px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
      <Avatar className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0 ring-2 ring-border/30">
        <AvatarFallback className="bg-zinc-800 border border-zinc-700">
          <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-300" />
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
}

// ─── Website Preview Banner ───────────────────────────────────────────────────
function WebsitePreviewBanner({ html }: { html: string }) {
  const [showPreview, setShowPreview] = useState(false);

  const openInNewTab = async () => {
    let processedHtml = html;
    if (!/<meta[^>]*name=["']viewport["']/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) {
        processedHtml = html.replace(
          /(<head[^>]*>)/i,
          `$1\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        );
      } else if (/<html[^>]*>/i.test(html)) {
        processedHtml = html.replace(
          /(<html[^>]*>)/i,
          `$1\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`,
        );
      }
    }

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: processedHtml }),
      });
      if (!res.ok) throw new Error("Failed to cache preview");
      const data = await res.json();
      window.open(`/preview/${data.id}`, "_blank");
    } catch (err) {
      console.error(
        "Failed to open server-cached preview, falling back to Blob URL:",
        err,
      );
      const blob = new Blob([processedHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <motion.div
        className="mt-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/10 via-zinc-950/40 to-indigo-950/10 overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.05)]"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.2 }}
      >
        {/* Glowing top border */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3">
          {/* Left: Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Globe className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div className="min-w-0 font-sans text-left">
              <p className="text-sm font-bold text-violet-300 truncate">
                الموقع جاهز للعرض والتشغيل
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
                Website ready · Preview or open in a full page
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={openInNewTab}
              className="w-full sm:w-auto h-9 px-5 text-xs font-semibold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-lg shadow-sm transition-all duration-200 font-arabic flex items-center justify-center"
              dir="rtl"
            >
              <ExternalLink className="w-4 h-4" />
              <span>فتح الموقع</span>
            </Button>
          </div>
        </div>

        {/* Bottom glow */}
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      </motion.div>
    </>
  );
}

function AssistantMessage({
  content,
  model,
  reasoning,
  isStreaming,
  omniState,
  unboundState,
  onSelectUnboundChoice,
  isPipelineActive,
  query,
}: {
  content: string;
  model?: AIModel;
  reasoning?: string;
  isStreaming?: boolean;
  omniState?: OmniState;
  unboundState?: UnboundState | null;
  onSelectUnboundChoice?: (choice: any) => void;
  isPipelineActive?: boolean;
  query?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const isDeepResearch = useFeatureToggleStore((state) => state.deepResearch);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingSmartPdf, setIsGeneratingSmartPdf] = useState(false);
  const [smartPdfDoc, setSmartPdfDoc] = useState<any | null>(null);
  const [isSmartPdfDialogOpen, setIsSmartPdfDialogOpen] = useState(false);
  const { toast } = useToast();

  const isRtlMessage = /[\u0600-\u06FF]/.test(content);

  const handleGenerateSmartPdf = async () => {
    if (!content.trim()) return;
    setIsGeneratingSmartPdf(true);
    try {
      const response = await fetch("/api/pdf/generate-from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Failed to compile smart PDF");
      }
      const doc = await response.json();
      setSmartPdfDoc(doc);
      setIsSmartPdfDialogOpen(true);
      toast({
        title: isRtlMessage ? "تم تجميع المستند الذكي" : "Smart PDF compiled",
        description: isRtlMessage
          ? "قام الذكاء الاصطناعي بتحويل هذه الرسالة إلى مستند منظم بنجاح. يمكنك الآن معاينته وتعديله."
          : "AI successfully converted this message into a structured document. You can now preview and edit it.",
      });
    } catch (error: any) {
      toast({
        title: isRtlMessage ? "فشل إنشاء المستند" : "Smart PDF failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSmartPdf(false);
    }
  };

  const { cleanContent, sources } = extractSourcesAndClean(content);
  const mcqState = getMCQQuizState(cleanContent);
  const pdfState = getPDFDocumentState(mcqState.sanitizedContent);

  const cleanProseAroundWidgets = (txt: string) => {
    const pdfRegex = /(```pdf-document[\s\S]*?(?:```|$))/i;
    const quizRegex = /(```mcq-quiz[\s\S]*?(?:```|$))/i;
    const pdfMatch = txt.match(pdfRegex);
    if (pdfMatch) return pdfMatch[1];
    const quizMatch = txt.match(quizRegex);
    if (quizMatch) return quizMatch[1];
    return txt;
  };

  const isUnboundModel = model === "apex-coder";
  const baseMarkdown = isUnboundModel
    ? cleanStatusMarkers(pdfState.sanitizedContent)
    : pdfState.sanitizedContent;

  const cleanedMarkdown = cleanProseAroundWidgets(baseMarkdown).replace(
    /<br\s*\/?>/gi,
    "\n",
  );

  // Detect if this message contains a launchable website (can extract as soon as HTML block closes)
  const detectedHtml = extractHtmlFromContent(cleanContent);

  // Detect if this message contains an architectural plan
  const detectedPlan = isUnboundModel
    ? extractPlanFromContent(cleanContent)
    : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    if (!cleanedMarkdown.trim()) return;
    setIsExportingPdf(true);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: "message",
          content: cleanedMarkdown,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.message || `PDF export failed with status ${response.status}`,
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.fallbackHtml && data.html) {
          toast({
            title: isRtlMessage
              ? "تصدير مباشر عبر المتصفح"
              : "Browser Direct Export",
            description: isRtlMessage
              ? "سيتم فتح نافذة الطباعة الخاصة بالمتصفح تلقائياً. يرجى اختيار 'حفظ بتنسيق PDF'."
              : "Opening browser print dialog automatically. Select 'Save as PDF' to save.",
          });
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(data.html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          }
          return;
        }
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      let filename = "apex-message.pdf";
      const filenameStarMatch = disposition.match(
        /filename\*=utf-8''([^;\s]+)/i,
      );
      if (filenameStarMatch) {
        filename = decodeURIComponent(filenameStarMatch[1]);
      } else {
        const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF ready",
        description: "The assistant response was exported successfully.",
      });
    } catch (error) {
      toast({
        title: "PDF export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const markdownComponents = useMemo(
    () => ({
      pre: ({ node, children, ...props }: any) => {
        return <>{children}</>;
      },
      img: ({ node, src, alt, ...props }: any) => (
        <MarkdownImage src={src} alt={alt} {...props} />
      ),
      p: ({ node, children, ...props }: any) => {
        const isRtl = hasArabicText(children);
        return (
          <p
            className={cn(
              "text-foreground leading-relaxed my-2 text-[15px]",
              isRtl ? "font-arabic text-right" : "text-left",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </p>
        );
      },
      li: ({ node, children, ...props }: any) => {
        const isRtl = hasArabicText(children);
        return (
          <li
            className={cn(
              "text-foreground leading-relaxed my-1.5 text-[15px]",
              isRtl ? "font-arabic text-right" : "text-left",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </li>
        );
      },
      strong: ({ node, children, ...props }: any) => (
        <strong className="font-bold text-foreground" {...props}>
          {React.Children.map(children, (child) =>
            typeof child === "string" ? renderTextWithMath(child) : child,
          )}
        </strong>
      ),
      em: ({ node, children, ...props }: any) => (
        <em className="italic text-muted-foreground" {...props}>
          {React.Children.map(children, (child) =>
            typeof child === "string" ? renderTextWithMath(child) : child,
          )}
        </em>
      ),
      h1: ({ node, children, ...props }: any) => {
        const isRtl = hasArabicText(children);
        return (
          <h1
            className={cn(
              "text-2xl font-extrabold text-foreground mt-8 mb-4 tracking-tight",
              isRtl ? "font-arabic text-right" : "text-left",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </h1>
        );
      },
      h2: ({ node, children, ...props }: any) => {
        const isRtl = hasArabicText(children);
        return (
          <h2
            className={cn(
              "text-xl font-bold text-foreground mt-6 mb-3 tracking-tight border-b border-border pb-1",
              isRtl ? "font-arabic text-right" : "text-left",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </h2>
        );
      },
      h3: ({ node, children, ...props }: any) => {
        const isRtl = hasArabicText(children);
        return (
          <h3
            className={cn(
              "text-lg font-bold text-foreground mt-4 mb-2 tracking-tight",
              isRtl ? "font-arabic text-right" : "text-left",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </h3>
        );
      },
      table: ({ node, children, ...props }: any) => {
        const isRtlTable = hasArabicText(children);
        return (
          <div className="overflow-x-auto my-6 rounded-xl border border-zinc-800/80 shadow-lg bg-zinc-950/40 backdrop-blur-md max-w-full transition-all duration-300 hover:shadow-xl hover:border-zinc-700/60">
            <table
              className="w-full text-sm border-collapse text-foreground font-sans"
              dir={isRtlTable ? "rtl" : "ltr"}
              {...props}
            >
              {children}
            </table>
          </div>
        );
      },
      thead: ({ node, ...props }: any) => (
        <thead
          className="bg-zinc-900/90 border-b border-zinc-700/50"
          {...props}
        />
      ),
      th: ({ node, children, align, style, cellindex, ...props }: any) => {
        const isRtl = hasArabicText(children);
        const textAlignment =
          align || style?.textAlign || (isRtl ? "right" : "left");
        return (
          <th
            className={cn(
              "px-5 py-3.5 border border-zinc-800/80 font-bold text-zinc-200 tracking-wider text-xs uppercase bg-zinc-900/40",
              isRtl && "font-arabic",
              textAlignment === "right" && "text-right",
              textAlignment === "left" && "text-left",
              textAlignment === "center" && "text-center",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            style={style}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </th>
        );
      },
      tr: ({ node, children, ...props }: any) => {
        const cells = React.Children.toArray(children);
        return (
          <tr
            className="hover:bg-zinc-800/20 even:bg-zinc-900/10 transition-colors duration-150 border-b border-zinc-900 last:border-0"
            {...props}
          >
            {cells.map((cell, index) => {
              if (React.isValidElement(cell)) {
                return React.cloneElement(cell as React.ReactElement<any>, {
                  cellindex: index,
                });
              }
              return cell;
            })}
          </tr>
        );
      },
      td: ({ node, children, align, style, cellindex, ...props }: any) => {
        const isRtl = hasArabicText(children);
        const textAlignment =
          align || style?.textAlign || (isRtl ? "right" : "left");
        return (
          <td
            className={cn(
              "px-5 py-4 border border-zinc-800/40 align-middle leading-relaxed text-[13.5px] text-zinc-300",
              isRtl && "font-arabic",
              textAlignment === "right" && "text-right",
              textAlignment === "left" && "text-left",
              textAlignment === "center" && "text-center",
            )}
            dir={isRtl ? "rtl" : "ltr"}
            style={style}
            {...props}
          >
            {React.Children.map(children, (child) =>
              typeof child === "string" ? renderTextWithMath(child) : child,
            )}
          </td>
        );
      },
      code: ({ node, className, children, ...props }: any) => {
        const inline = (props as any).inline as boolean | undefined;
        const match = /language-([\w-]+)/.exec(className || "");
        const lang = match ? match[1] : "";

        if (inline) {
          return (
            <code
              className="bg-muted px-1.5 py-0.5 rounded border border-border text-emerald-600 dark:text-emerald-400 font-mono text-xs"
              {...props}
            >
              {children}
            </code>
          );
        }

        return (
          <CodeBlockWrapper
            language={lang}
            code={String(children).replace(/\n$/, "")}
            parentContent={cleanContent}
          />
        );
      },
    }),
    [cleanContent],
  );

  return (
    <motion.div
      className={cn(
        "flex gap-3 md:gap-4 group p-3.5 md:p-4 rounded-2xl border border-zinc-900 bg-neutral-950 transition-all duration-500 shadow-2xl",
        isStreaming && "bg-neutral-950 border-zinc-800",
        model === "apex-omni" &&
          "border-transparent bg-transparent shadow-none p-0 md:p-0",
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Model avatar — premium pixel-art letters */}
      {model && (
        <ModelLetterIcon model={model} size={32} isStreaming={isStreaming} />
      )}

      <div className="flex-1 space-y-2 min-w-0">
        {/* Model label with status dot */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  isStreaming
                    ? "bg-white animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                    : "bg-white/25",
                )}
              />
              <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-white/70">
                {model ? MODEL_INFO[model]?.name || model : "AI"}
              </span>
            </div>
          </div>
          {content && !/```(?:mcq-quiz|pdf-document)/i.test(content) && (
            <motion.div whileTap={{ scale: 0.9 }}>
              <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 hover:bg-white/6 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-emerald-400" />
                      <span className="text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {reasoning && (
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted h-6 px-2"
            >
              {showReasoning ? (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Hide Reasoning
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Show Reasoning
                </>
              )}
            </Button>
            {showReasoning && (
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground italic">
                  {reasoning}
                </p>
              </div>
            )}
          </div>
        )}

        {(sources.length > 0 ||
          (isPipelineActive && (model === "apex-elite" || isDeepResearch))) && (
          <div className="mb-4">
            <SearchTopologyVisualizer
              isFinished={sources.length > 0 && !isPipelineActive}
              query={query}
              domains={Array.from(new Set(sources.map((s) => s.domain))).slice(
                0,
                5,
              )}
            />
          </div>
        )}

        {omniState && (
          <div className="mb-4">
            <OmniStatusCard state={omniState} />
          </div>
        )}

        {/* Apex Coder: Unified Dashboard for completed messages */}
        {unboundState && !isStreaming && (
          <div className="mb-4">
            <ApexCoderDashboard
              state={unboundState}
              content={content}
              isStreaming={false}
              onSelectChoice={onSelectUnboundChoice}
              workTree={(unboundState as any).workTree || null}
              planText={detectedPlan}
            />
          </div>
        )}

        {/* Apex Coder: web-gen & console during streaming (unified) */}
        {isUnboundModel &&
          !unboundState &&
          (content.includes("[🤖") ||
            content.includes("<plan>") ||
            content.includes("===") ||
            content.includes("[Phase")) && (
            <div className="mb-4">
              <ApexCoderDashboard
                state={{
                  phases: [],
                  isRunning: !!isStreaming,
                  content: content,
                  error: null,
                  currentPhase: 0,
                  questions: null,
                  selectedChoices: null,
                }}
                content={content}
                isStreaming={!!isStreaming}
                workTree={null}
                planText={detectedPlan}
              />
            </div>
          )}

        {content && (
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              isStreaming && "streaming-active",
            )}
          >
            <div className="prose dark:prose-invert max-w-none">
              {mcqState.hasPendingBlock && isStreaming && (
                <MCQQuizLoadingCard />
              )}
              {pdfState.hasPendingBlock && isStreaming && (
                <PDFLoadingCard
                  language={/[\u0600-\u06FF]/.test(cleanContent) ? "ar" : "en"}
                />
              )}
              {!(
                isStreaming &&
                (mcqState.hasPendingBlock || pdfState.hasPendingBlock)
              ) && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {cleanedMarkdown}
                </ReactMarkdown>
              )}
            </div>
            {/* Website Preview Banner — appears for ANY model that generates HTML */}
            {detectedHtml && !isStreaming && !isPipelineActive && (
              <WebsitePreviewBanner html={detectedHtml} />
            )}

            {sources.length > 0 && (
              <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 animate-in fade-in duration-300">
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 gap-1 font-arabic"
                      dir="rtl"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <span>المصادر المعتمدة ({sources.length})</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-72 bg-popover border border-border rounded-xl shadow-xl p-1"
                  >
                    {sources.map((source, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        asChild
                        className="cursor-pointer"
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full p-1.5 rounded-lg text-right text-[11px] font-arabic font-medium text-foreground hover:bg-muted"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-500 flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[180px] text-foreground">
                              {source.title}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground font-mono ml-2 shrink-0">
                            {source.domain}
                          </span>
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}
        <Dialog
          open={isSmartPdfDialogOpen}
          onOpenChange={setIsSmartPdfDialogOpen}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-4xl">
            <DialogHeader
              className={isRtlMessage ? "text-right font-arabic" : "text-left"}
            >
              <DialogTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400 animate-pulse" />
                <span>
                  {isRtlMessage
                    ? "محرر مستندات AI PDF الذكية"
                    : "Smart AI PDF Document Creator"}
                </span>
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {isRtlMessage
                  ? "قم بمعاينة، تعديل، وتحسين المستند الذي أنشأه الذكاء الاصطناعي، ثم قم بتحميله كملف PDF مطبوع."
                  : "Preview, refine, and download the AI-structured PDF document."}
              </DialogDescription>
            </DialogHeader>

            {smartPdfDoc && (
              <PDFExportWidget jsonText={JSON.stringify(smartPdfDoc)} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
