import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  User, Sparkles, Brain, Zap, Cpu, Crown, ChevronDown, ChevronRight, Copy, Check, Skull, ChevronUp, Clock,
  Terminal, Shield, BookOpen, Palette, Target, RotateCw, BarChart3, Lock, Globe, Key, FolderOpen, Folder, Hammer, Wrench, Settings, TrendingUp, TrendingDown, MessageSquare, Lightbulb, CheckCircle2, XCircle,
  Rocket, Bot, AlertTriangle, Search, Trophy, Info, Activity, ExternalLink, X, Monitor, Smartphone, Code2, Play, Maximize2, Download
} from "lucide-react";
import type { Message, AIModel } from "@shared/schema";
import { OmniStatusCard } from "@/components/omni-status-card";
import { UnboundStatusCard } from "@/components/unbound-status-card";
import type { OmniState } from "@/lib/omni-service";
import type { UnboundState } from "@/lib/unbound-service";
import { ThinkingBubble } from "@/components/chat-message";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { extractSourcesAndClean } from "@/lib/sources-helper";
import { MODEL_INFO } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function MarkdownImage({ src, alt, ...props }: { src?: string; alt?: string; [key: string]: any }) {
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
  React.Children.forEach(children, child => {
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
  "apple": "apple.com", "سامسونج": "samsung.com", "samsung": "samsung.com",
  "google": "google.com", "جوجل": "google.com", "microsoft": "microsoft.com",
  "مايكروسوفت": "microsoft.com", "amazon": "amazon.com", "أمازون": "amazon.com",
  "meta": "meta.com", "ميتا": "meta.com", "facebook": "facebook.com",
  "فيسبوك": "facebook.com", "tesla": "tesla.com", "تسلا": "tesla.com",
  "nvidia": "nvidia.com", "إنفيديا": "nvidia.com", "intel": "intel.com",
  "إنتل": "intel.com", "amd": "amd.com", "qualcomm": "qualcomm.com",
  "كوالكوم": "qualcomm.com", "snapdragon": "qualcomm.com",
  // Phones
  "iphone": "apple.com", "آيفون": "apple.com",
  "galaxy": "samsung.com", "جالاكسي": "samsung.com",
  "huawei": "huawei.com", "هواوي": "huawei.com",
  "xiaomi": "xiaomi.com", "شاومي": "xiaomi.com",
  "oneplus": "oneplus.com", "oppo": "oppo.com", "vivo": "vivo.com",
  "realme": "realme.com", "nokia": "nokia.com", "نوكيا": "nokia.com",
  "sony": "sony.com", "سوني": "sony.com", "lg": "lg.com",
  "motorola": "motorola.com", "asus": "asus.com",
  // Software / AI
  "openai": "openai.com", "anthropic": "anthropic.com",
  "claude": "anthropic.com", "chatgpt": "openai.com",
  "gemini": "google.com", "grok": "x.ai",
  "netflix": "netflix.com", "نتفليكس": "netflix.com",
  "spotify": "spotify.com", "سبوتيفاي": "spotify.com",
  "twitter": "twitter.com", "x": "x.com", "تويتر": "twitter.com",
  "instagram": "instagram.com", "انستغرام": "instagram.com",
  "tiktok": "tiktok.com", "تيك توك": "tiktok.com",
  "youtube": "youtube.com", "يوتيوب": "youtube.com",
  "whatsapp": "whatsapp.com", "واتساب": "whatsapp.com",
  "telegram": "telegram.org", "تيليغرام": "telegram.org",
  "snapchat": "snapchat.com", "سناب شات": "snapchat.com",
  // Cars
  "bmw": "bmw.com", "bمw": "bmw.com", "mercedes": "mercedes-benz.com",
  "مرسيدس": "mercedes-benz.com", "toyota": "toyota.com",
  "تويوتا": "toyota.com", "honda": "honda.com", "هوندا": "honda.com",
  "ford": "ford.com", "hyundai": "hyundai.com", "هيونداي": "hyundai.com",
  "kia": "kia.com", "كيا": "kia.com", "audi": "audi.com",
  "porsche": "porsche.com", "lamborghini": "lamborghini.com",
  "ferrari": "ferrari.com", "chevrolet": "chevrolet.com",
  // Other brands
  "nike": "nike.com", "نايك": "nike.com", "adidas": "adidas.com",
  "أديداس": "adidas.com", "coca-cola": "coca-cola.com",
  "كوكا كولا": "coca-cola.com", "pepsi": "pepsi.com",
  "بيبسي": "pepsi.com", "mcdonalds": "mcdonalds.com",
  "ماكدونالدز": "mcdonalds.com", "starbucks": "starbucks.com",
  "ستاربكس": "starbucks.com",
  // Chips & Hardware  
  "mediatek": "mediatek.com", "هيليو": "mediatek.com",
  "dimensity": "mediatek.com", "exynos": "samsung.com",
  "apple m": "apple.com", "m1": "apple.com", "m2": "apple.com",
  "m3": "apple.com", "m4": "apple.com",
};

/** Checks if cleaned title matches a known company → returns its domain */
function detectCompanyDomain(cleaned: string): string | null {
  const lower = cleaned.toLowerCase().trim();
  // Exact match first
  if (COMPANY_DOMAIN_MAP[lower]) return COMPANY_DOMAIN_MAP[lower];
  // Partial match (title starts with or contains company name)
  for (const [key, domain] of Object.entries(COMPANY_DOMAIN_MAP)) {
    if (lower === key || lower.startsWith(key + " ") || lower.endsWith(" " + key)) {
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
      "الميزة", "الخاصية", "مقارنة", "الوجه", "العنصر", "attributes", "attribute",
      "feature", "features", "property", "properties", "comparison", "vs", "versus",
      "aspect", "aspects", "criteria", "criterion", "spec", "specs", "specification",
      "specifications", "metric", "metrics", "parameter", "parameters", "value", "values",
      "details", "detail",
      // English table descriptors
      "price", "cost", "rating", "score", "weight", "dimensions", "camera", "processor",
      "chipset", "battery", "storage", "ram", "screen", "display", "resolution", "os",
      "system", "release", "year", "date", "model", "launch", "availability", "status",
      "name", "title", "type", "category", "description", "summary", "conclusion", "pros",
      "cons", "advantages", "disadvantages", "speed", "performance", "graphics", "gpu",
      "cpu", "ports", "connectivity", "sensors", "colors", "design", "material", "warranty",
      "size", "brand",
      // Arabic table descriptors
      "السعر", "التكلفة", "التقييم", "الوزن", "الأبعاد", "الكاميرا", "المعالج",
      "البطارية", "مساحة التخزين", "الرام", "الشاشة", "الدقة", "نظام التشغيل",
      "تاريخ الإصدار", "السنة", "الاسم", "النوع", "الفئة", "الوصف", "الملخص",
      "العيوب", "المميزات", "السرعة", "الأداء", "كارت الشاشة", "الاتصال",
      "المنافذ", "الألوان", "التصميم", "المادة", "الضمان", "الحجم", "الشركة"
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
            const best = entries.find((p: any) =>
              p.title?.toLowerCase().includes(lower) ||
              lower.includes(p.title?.toLowerCase())
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
    return () => { active = false; };
  }, [title]);

  const handleError = () => {
    const next = errorCount + 1;
    setErrorCount(next);
    if (next === 1 && imgUrl && !imgUrl.includes("images.weserv.nl")) {
      // Try weserv proxy on first error
      setImgUrl(`https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}&w=200&h=200&fit=contain&bg=white`);
    } else {
      setImgUrl(null);
    }
  };

  if (!imgUrl) return null;

  return (
    <div className="flex flex-col items-center justify-center my-1.5 w-full animate-in fade-in zoom-in duration-300">
      <div className={`w-11 h-11 md:w-13 md:h-13 rounded-xl border shadow-md hover:scale-105 transition-all duration-300 overflow-hidden flex items-center justify-center ${
        isLogo
          ? "bg-white border-zinc-300/40 p-1.5"
          : "bg-zinc-900 border-violet-500/30"
      }`}>
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
        if (/<!DOCTYPE\s+html/i.test(inner) || /^<html/i.test(inner) || /<\/html>/i.test(inner)) {
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

  // Inject viewport meta if head/html tags exist but viewport is missing
  if (!/<meta[^>]*name=["']viewport["']/i.test(bundled)) {
    if (/<head[^>]*>/i.test(bundled)) {
      bundled = bundled.replace(/(<\/head>)/i, `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n$1`);
    } else if (/<html[^>]*>/i.test(bundled)) {
      bundled = bundled.replace(/(<html[^>]*>)/i, `$1\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`);
    }
  }

  // Inject UTF-8 charset if charset meta is missing
  if (!/charset/i.test(bundled)) {
    if (/<head[^>]*>/i.test(bundled)) {
      bundled = bundled.replace(/(<\/head>)/i, `  <meta charset="UTF-8">\n$1`);
    }
  }

  // Inject CSS
  if (cssCode) {
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
  if (jsCode) {
    const scriptTag = `\n  <script>\n${jsCode}\n  </script>\n`;
    if (/<\/body>/i.test(bundled)) {
      bundled = bundled.replace(/(<\/body>)/i, `${scriptTag}$1`);
    } else {
      bundled = bundled + scriptTag;
    }
  }

  return bundled;
}

// ─── Status Cleaners & Tracking ───────────────────────────────────────────────
// ─── Status Cleaners & Tracking ───────────────────────────────────────────────
function cleanStatusMarkers(content: string): string {
  let cleaned = content;
  // 1. Remove [🤖 ...] lines
  cleaned = cleaned.replace(/^\s*\[🤖[^\]]*\]\s*$/gm, "");
  
  // 2. Remove intermediate code blocks wrapped in <html_code>, <css_code>, <js_code>
  cleaned = cleaned.replace(/<(html_code|css_code|js_code)>[\s\S]*?<\/\1>/gi, "");
  
  // 3. Hide streaming intermediate blocks that are not yet closed
  cleaned = cleaned.replace(/<(html_code|css_code|js_code)>[\s\S]*/gi, (match, tag) => {
    if (!match.includes(`</${tag}>`)) {
      return "";
    }
    return match;
  });

  // 4. Remove <plan>...</plan> block from markdown rendering so it doesn't clutter the chat
  cleaned = cleaned.replace(/<plan>[\s\S]*?<\/plan>/gi, "");
  // Hide streaming unclosed plan tags
  cleaned = cleaned.replace(/<plan>[\s\S]*/gi, "");

  return cleaned.trim();
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
  const htmlCompleted = content.includes("[🤖 CSS Specialist:") || content.includes("<css_code>") || content.includes("[🤖 JavaScript Specialist:") || content.includes("<js_code>") || content.includes("[🤖 Integration Auditor:") || content.includes("Architecture Notes") || content.includes("✅ Architecture Notes");
  const cssCompleted = content.includes("[🤖 JavaScript Specialist:") || content.includes("<js_code>") || content.includes("[🤖 Integration Auditor:") || content.includes("Architecture Notes") || content.includes("✅ Architecture Notes");
  const jsCompleted = content.includes("[🤖 Integration Auditor:") || content.includes("Architecture Notes") || content.includes("✅ Architecture Notes");
  const qaCompleted = !content.includes("[🤖") && (content.includes("Architecture Notes") || content.includes("✅ Architecture Notes"));

  if (typeof document !== "undefined") {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = planText;
    
    const headings = tempDiv.querySelectorAll("h2, h3, h4");
    if (headings.length > 0) {
      headings.forEach((heading, hIdx) => {
        const sectionTitle = heading.textContent?.replace(/^\d+[\.\-\s]*/, "").trim() || `القسم ${hIdx + 1}`;
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
                  completed: false
                });
              }
            });
          } else if (sibling.tagName === "P") {
            const pText = sibling.textContent?.trim();
            if (pText && pText.length > 10) {
              items.push({
                id: `${sectionTitle}-p-${items.length}`,
                text: pText,
                completed: false
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
          items: []
        };
      } else {
        const listMatch = trimmed.match(/^(?:[-*+]\s+|\d+\.\s+)(.*)$/);
        if (listMatch && currentSection) {
          currentSection.items.push({
            id: `md-${currentSection.title}-${currentSection.items.length}`,
            text: listMatch[1].trim(),
            completed: false
          });
        } else if (trimmed.length > 10 && currentSection) {
          currentSection.items.push({
            id: `md-text-${currentSection.title}-${currentSection.items.length}`,
            text: trimmed,
            completed: false
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
        { id: "gen-html", text: "بناء هيكل الصفحة دلالياً وتأمين الأقسام المطلوبة", completed: false },
        { id: "gen-css", text: "تصميم المظهر المتجاوب والتنسيقات الزجاجية المظلمة", completed: false },
        { id: "gen-js", text: "برمجة المنطق التفاعلي وتأثيرات الحركة والتحقق", completed: false }
      ]
    });
  }

  // Apply real-time checklist completion updates
  sections.forEach((section) => {
    const titleLower = section.title.toLowerCase();
    const isHtmlSec = titleLower.includes("html") || titleLower.includes("هيكل") || titleLower.includes("بناء") || titleLower.includes("markup");
    const isCssSec = titleLower.includes("css") || titleLower.includes("تصميم") || titleLower.includes("تنسيق") || titleLower.includes("style");
    const isJsSec = titleLower.includes("js") || titleLower.includes("javascript") || titleLower.includes("منطق") || titleLower.includes("تفاعل") || titleLower.includes("logic");
    const isNotesSec = titleLower.includes("ملاحظات") || titleLower.includes("إضافي") || titleLower.includes("qa") || titleLower.includes("تدقيق") || titleLower.includes("note");

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

export function UnboundPlanCard({ planText, messageContent, isStreaming }: UnboundPlanCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const sections = parsePlanContent(planText, messageContent);

  let totalItems = 0;
  let completedItems = 0;
  sections.forEach(s => {
    totalItems += s.items.length;
    s.items.forEach(i => { if (i.completed) completedItems++; });
  });

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="relative font-sans text-xs my-1 w-full text-foreground max-w-xl animate-in fade-in duration-300">
      <div className="relative rounded-xl border border-zinc-900 bg-zinc-950/80 backdrop-blur-xl shadow-lg overflow-hidden">
        
        {/* Progress bar glow */}
        <div 
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-emerald-500 transition-all duration-700" 
          style={{ width: `${progressPercent}%` }}
        />

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
                {progressPercent === 100 ? "✓ تم تنفيذ جميع المهام بنجاح" : `نسبة الإنجاز: %${progressPercent} (${completedItems}/${totalItems})`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md">
              {progressPercent}%
            </span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
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
                        <div key={iIdx} className="flex items-start gap-2 py-0.5 text-zinc-300">
                          <div className="mt-0.5 shrink-0">
                            {item.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in duration-200" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 bg-zinc-900/50 flex items-center justify-center shrink-0">
                                <Clock className="w-2 h-2 text-zinc-600 animate-pulse" />
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] leading-relaxed transition-all text-left",
                            item.completed ? "text-zinc-500 line-through" : "text-zinc-300"
                          )}>
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

export function UnboundWebGenStatusCard({ content, isStreaming }: UnboundWebGenStatusCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    { key: "architect", label: "تخطيط وهيكلة الموقع · Lead Architect Blueprint", marker: "[🤖 Lead Architect:", icon: Brain },
    { key: "html", label: "بناء هيكل الصفحة HTML · HTML Specialist Markup", marker: "[🤖 HTML Specialist:", icon: Code2 },
    { key: "css", label: "تصميم وتنسيق CSS · CSS Specialist Styles", marker: "[🤖 CSS Specialist:", icon: Palette },
    { key: "javascript", label: "إضافة التفاعل والمنطق JS · JS Specialist Interactivity", marker: "[🤖 JavaScript Specialist:", icon: Zap },
    { key: "integrator", label: "دمج الكود واختبار الأخطاء QA · Integration QA Auditor", marker: "[🤖 Integration Auditor:", icon: Hammer }
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
      completed: false
    };
  });

  if (!hasAny) return null;

  // Calculate completions
  parsedSteps.forEach((step, idx) => {
    if (step.started) {
      const nextStepStarted = parsedSteps.slice(idx + 1).some(s => s.started);
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
        <div className={cn(
          "absolute top-0 left-0 right-0 h-[2px] transition-all duration-700",
          allComplete
            ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600"
            : "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 animate-gradient bg-[length:200%_200%]"
        )} />
        
        {/* Header bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-1 rounded-md border",
              allComplete ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400 animate-pulse"
            )}>
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-[0.12em] text-foreground uppercase">
                APEX UNBOUND · Multi-AI Web Engine
              </p>
              <p className="text-[8.5px] text-zinc-400 tracking-wider mt-0.5 font-sans">
                {allComplete ? "✓ جميع العمليات البرمجية مكتملة" : `جاري التشغيل: ${currentStep?.label.split("·")[0].trim() || "تجهيز الوكلاء"}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[9px] font-bold px-2 py-0.5 rounded-full border",
              allComplete 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-violet-500/10 text-violet-400 border-violet-500/20 animate-pulse"
            )}>
              {allComplete ? "Complete" : `${parsedSteps.filter(s => s.completed).length + 1}/5 Active`}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
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
                        isActive && "bg-violet-500/5 border-violet-950/30 animate-pulse",
                        isPending && "bg-transparent border-zinc-900 opacity-40"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "p-1.5 rounded-md border",
                          isDone && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                          isActive && "bg-violet-500/10 border-violet-500/20 text-violet-400",
                          isPending && "bg-zinc-900 border-zinc-800 text-zinc-600"
                        )}>
                          <StepIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 font-sans text-left">
                          <p className={cn(
                            "text-[11px] font-bold leading-none mb-1",
                            isDone && "text-emerald-400",
                            isActive && "text-violet-400",
                            isPending && "text-zinc-500"
                          )}>
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

// ─── Web Preview Modal ────────────────────────────────────────────────────────
function WebPreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [url, setUrl] = useState<string>("");

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Generate short-lived preview URL on mount via Express API
  useEffect(() => {
    let active = true;
    let processedHtml = html;
    if (!/<meta[^>]*name=["']viewport["']/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) {
        processedHtml = html.replace(/(<head[^>]*>)/i, `$1\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
      } else if (/<html[^>]*>/i.test(html)) {
        processedHtml = html.replace(/(<html[^>]*>)/i, `$1\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`);
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
        console.error("Failed to load server-cached preview, falling back to Blob:", err);
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
            : "w-full max-w-[375px] sm:h-[667px] sm:rounded-2xl sm:border ring-4 ring-zinc-800/50"
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
              className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors sm:hidden animate-none"
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
            
            <span className="text-[11px] text-zinc-400 font-sans font-bold ml-1 sm:hidden">معاينة الموقع</span>
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
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-transparent"
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
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-transparent"
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </Button>
          </div>

          {/* Right: URL Bar / Status */}
          <div className="flex-1 hidden md:flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 mx-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-zinc-400 font-mono truncate">apex://preview · APEX Unbound Output</span>
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
              <p className="text-xs text-zinc-400 font-mono animate-pulse">Rendering site...</p>
            </div>
          </div>
        )}

        {/* Iframe Renderer */}
        {url && (
          <iframe
            ref={iframeRef}
            src={url}
            className="flex-1 w-full bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            onLoad={() => setIsLoaded(true)}
            title="APEX Unbound Website Preview"
          />
        )}
      </motion.div>
    </div>
  );
}

function replaceEmojisWithIcons(text: string): React.ReactNode {

  // First, strip any raw emojis
  const cleanText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');

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
      className: "bg-muted text-foreground border border-border px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mx-1",
      icon: Info,
      iconColor: "text-muted-foreground w-3.5 h-3.5"
    };

    switch (type) {
      case "winner":
      case "gold":
      case "success":
      case "important":
      case "star":
        config = {
          className: "bg-violet-950/20 text-violet-400 border border-violet-900/30 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 mx-0.5 text-[13.5px]",
          icon: Sparkles,
          iconColor: "text-violet-400/80 w-3 h-3"
        };
        break;
      case "warning":
      case "danger":
        config = {
          className: "bg-rose-950/20 text-rose-400 border border-rose-900/30 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 mx-0.5 text-[13.5px]",
          icon: AlertTriangle,
          iconColor: "text-rose-400/80 w-3 h-3"
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
          className: "bg-blue-950/20 text-blue-400 border border-blue-900/30 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 mx-0.5 text-[13.5px]",
          icon: Info,
          iconColor: "text-blue-400/80 w-3 h-3"
        };
        break;
    }

    const IconComponent = config.icon;
    parts.push(
      <span key={matchIndex} className={config.className}>
        <IconComponent className={config.iconColor} />
        {content}
      </span>
    );

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < cleanText.length) {
    parts.push(cleanText.substring(lastIndex));
  }

  return parts.length > 0 ? parts : cleanText;
}

// Helper to recursively detect if any child node contains Arabic characters
const hasArabicText = (node: React.ReactNode): boolean => {
  if (typeof node === 'string') {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(node);
  }
  if (Array.isArray(node)) {
    return node.some(hasArabicText);
  }
  if (React.isValidElement(node)) {
    return hasArabicText(node.props.children);
  }
  return false;
};

function CodeBlockWrapper({ language, code, parentContent }: { language: string; code: string; parentContent?: string }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const lineCount = code.split("\n").length;
  const isLargeCode = lineCount > 15 || ["html", "htm", "css", "js", "javascript", "ts", "typescript", "json"].includes(language?.toLowerCase());
  const [isCollapsed, setIsCollapsed] = useState(isLargeCode);

  // Detect HTML: explicit lang tag OR body looks like an HTML document
  const isHtml = language === "html" || language === "htm" ||
    (!language && (/<!DOCTYPE\s+html/i.test(code) || /^\s*<html/i.test(code)));

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
    const fileExt = language === "javascript" || language === "js" ? "js" 
                  : language === "css" ? "css" 
                  : language === "json" ? "json" 
                  : language === "typescript" || language === "ts" ? "ts" 
                  : "html";
    const blob = new Blob([code], { type: "text/plain" });
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
      console.error("Failed to open server-cached preview, falling back to Blob URL:", err);
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
                {lineCount} lines · {(new TextEncoder().encode(code).length / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHtml && (
              <Button
                onClick={() => setShowPreview(true)}
                size="sm"
                className="h-8 px-3 text-xs gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg border-0 shadow-sm font-arabic"
                dir="rtl"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>معاينة الموقع</span>
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
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{language || "code"}</span>
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
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      className="h-7 px-3 text-xs gap-1.5 bg-gradient-to-r from-violet-950/60 to-indigo-950/60 hover:from-violet-900/60 hover:to-indigo-900/60 text-violet-400 hover:text-violet-300 border border-violet-900/40 hover:border-violet-700/60 rounded-lg transition-all shadow-sm font-semibold tracking-wide font-arabic"
                      dir="rtl"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>معاينة</span>
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openInNewTab}
                      className="h-7 px-3 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all shadow-sm font-semibold tracking-wide font-arabic"
                      dir="rtl"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>شاشة كاملة</span>
                    </Button>
                  </motion.div>
                </>
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

          {/* Open Website Button — Bottom Bar for HTML blocks */}
          {isHtml && (
            <motion.div
              className="px-4 py-3 border-t border-border/60 bg-gradient-to-r from-emerald-950/20 via-zinc-950/40 to-teal-950/20 flex items-center justify-between gap-3"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Monitor className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>موقع جاهز للعرض · Ready for preview</span>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    onClick={() => setShowPreview(true)}
                    className="h-8 px-4 text-xs font-bold gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 rounded-lg shadow-md shadow-emerald-900/30 transition-all font-arabic"
                    dir="rtl"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    معاينة الموقع
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    onClick={openInNewTab}
                    className="h-8 px-4 text-xs font-bold gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg shadow-sm transition-all font-arabic"
                    dir="rtl"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    شاشة كاملة
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Web Preview Modal */}
      {showPreview && (
        <WebPreviewModal html={getBundledHtml()} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}



// Map models to their icons
const modelIcons: Record<AIModel, typeof Sparkles> = {
  "apex-flash": Zap,
  "apex-pro": Cpu,
  "apex-elite": Search,
  "apex-omni": Crown,
  "apex-unbound": Code2,
};

interface ChatMessagesProps {
  streamingContent?: string;
  streamingReasoning?: string;
  omniState?: OmniState | null;
  isOmniLoading?: boolean;
  isStreaming?: boolean;
  onSelectPrompt?: (prompt: string) => void;
  unboundState?: UnboundState | null;
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
}: ChatMessagesProps) {
  const selectedModel = useChatStore((state) => state.selectedModel);
  const isDeepResearch = useFeatureToggleStore((state) => state.deepResearch);
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);

  const messages = useChatStore((state) => {
    const activeId = state.activeConversationId;
    const conv = state.conversations.find((c) => c.id === activeId);
    return conv?.messages ?? EMPTY_MESSAGES;
  });

  const [dynamicSuggestions, setDynamicSuggestions] = useState<Array<{ title: string; desc: string; prompt: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Only fetch suggestions when there are no messages in the active chat (welcome screen)
    if (messages.length > 0 || streamingContent || streamingReasoning) return;

    let active = true;

    // Compile memory context from other conversations (excluding active)
    const pastConversations = conversations.filter(c => c.id !== activeConversationId && c.messages.length > 0);
    const userMemoryContext = pastConversations.slice(0, 5).map(c => {
      const userMessages = c.messages.filter(m => m.role === "user");
      return {
        title: c.title,
        lastQuery: userMessages[userMessages.length - 1]?.content || ""
      };
    });

    const cacheKey = JSON.stringify(userMemoryContext);

    // Smart Local Cache Check
    try {
      const cachedDataStr = localStorage.getItem("apex_chat_suggestions_cache");
      if (cachedDataStr) {
        const cached = JSON.parse(cachedDataStr);
        if (cached && cached.key === cacheKey && Array.isArray(cached.suggestions) && cached.suggestions.length > 0) {
          console.log("⚡ Loaded suggestions from local cache instantly");
          setDynamicSuggestions(cached.suggestions);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to read suggestions cache:", e);
    }

    const saveToCache = (suggestions: any) => {
      try {
        localStorage.setItem("apex_chat_suggestions_cache", JSON.stringify({
          key: cacheKey,
          suggestions
        }));
      } catch (e) {
        console.warn("Failed to write suggestions cache:", e);
      }
    };

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMemoryContext })
        });
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        if (active && Array.isArray(data) && data.length > 0) {
          setDynamicSuggestions(data);
          saveToCache(data);
        }
      } catch (err) {
        console.warn("Failed to load suggestions from backend, attempting client-side fallback:", err);
        const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY || "";
        if (deepseekKey) {
          try {
            console.log("☁️ Client-side suggestions fallback generator triggered...");
            const systemPrompt = `You are an expert conversational AI agent. You must generate 4 intriguing, high-curiosity suggestion prompts in Arabic for the chat welcome screen.
Output ONLY a raw JSON array of 4 objects (no markdown, no backticks, no wrap) in this format:
[
  {
    "title": "Short title in Arabic (2-3 words)",
    "desc": "Intriguing description in Arabic (4-6 words)",
    "prompt": "The actual full question/prompt in Arabic to send to the AI"
  }
]`;
            let prompt = "";
            if (userMemoryContext && Array.isArray(userMemoryContext) && userMemoryContext.length > 0) {
              const historyStr = userMemoryContext
                .map((c: any) => `- Conversation Title: "${c.title}", Last Query: "${c.lastQuery}"`)
                .join("\n");
              prompt = `The user has the following past conversation history and recent queries:\n${historyStr}\n\nBased on these previous interests, generate 4 highly personalized, curious, and specific suggestion questions in Arabic. Each question must provoke high interest and curiosity (فضول) for the user to explore further. Make them logical next steps or interesting related topics rather than repeating their past questions.`;
            } else {
              prompt = `Generate 4 general, highly intriguing, and curious suggestion questions in Arabic. They should cover exciting and mind-bending topics like advanced science, future AI, philosophy, creative writing, or high-tech concepts, making the user extremely curious to click and read the answers.`;
            }

            const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${deepseekKey}`
              },
              body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: prompt }
                ],
                max_tokens: 600,
                temperature: 0.8
              })
            });

            if (response.ok) {
              const resultData = await response.json();
              const content = resultData.choices[0]?.message?.content || "";
              const cleanJson = content.replace(/```json|```/g, "").trim();
              const suggestions = JSON.parse(cleanJson);
              if (active && Array.isArray(suggestions) && suggestions.length > 0) {
                setDynamicSuggestions(suggestions);
                saveToCache(suggestions);
              }
            }
          } catch (fallbackErr) {
            console.error("Client-side suggestions fallback generator failed:", fallbackErr);
          }
        }
      } finally {
        if (active) setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();

    return () => {
      active = false;
    };
  }, [conversations.length, activeConversationId, messages.length, streamingContent, streamingReasoning]);

  const getSuggestionIcon = (title: string) => {
    const t = title.toLowerCase();
    if (/كود|برمج|موقع|react|code|html|css|js|python/i.test(t)) return Terminal;
    if (/مقارن|تحليل|فرق|compare|analysis|vs/i.test(t)) return BarChart3;
    if (/تخطيط|جدول|تنظيم|رياضة|plan|calendar|schedule/i.test(t)) return Activity;
    return MessageSquare;
  };

  const DEFAULT_SUGGESTIONS = [
    {
      title: "الكتابة وصناعة المحتوى",
      desc: "مقالات، رسائل إيميل، أو نصوص إبداعية",
      prompt: "اكتب لي مقالاً احترافياً عن فوائد الذكاء الاصطناعي في حياتنا اليومية",
    },
    {
      title: "المقارنات والتحليل",
      desc: "تحليل الأفكار ومقارنة البيانات المعقدة",
      prompt: "قارن بين نموذج الذكاء الاصطناعي الهجين والنموذج السحابي من حيث الكفاءة والأمان",
    },
    {
      title: "البرمجة وحل المشكلات",
      desc: "كتابة وتعديل الأكواد البرمجية بكفاءة",
      prompt: "اكتب كود React مخصص لصفحة لوحة تحكم (Dashboard) باستخدام TailwindCSS",
    },
    {
      title: "التخطيط والتنظيم اليومي",
      desc: "جداول رياضية، خطط عمل، وتنظيم المهام",
      prompt: "صمم لي جدول تمارين رياضية منزلي لمدة أسبوع لزيادة اللياقة البدنية",
    },
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const prevMessagesLength = useRef(messages.length);

  // Re-enable auto-scroll when user sends a new message
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      setIsAutoScroll(true);
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // Monitor manual scrolls
  useEffect(() => {
    const container = messagesEndRef.current?.closest(".overflow-y-auto");
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAutoScroll(prev => {
        if (prev !== isAtBottom) return isAtBottom;
        return prev;
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle actual scrolling
  useEffect(() => {
    if (!isAutoScroll) return;

    const container = messagesEndRef.current?.closest(".overflow-y-auto");
    if (!container) return;

    if (isStreaming) {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, streamingContent, isAutoScroll, isStreaming]);

  if (messages.length === 0 && !streamingContent && !streamingReasoning) {
    const ModelIcon = modelIcons[selectedModel] || Sparkles;
    const displaySuggestions = dynamicSuggestions.length > 0 ? dynamicSuggestions : DEFAULT_SUGGESTIONS;

    return (
      <div className="flex flex-col items-center justify-center py-10 md:py-16 max-w-2xl mx-auto px-4 text-center space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[60vh]">
        {/* Sleek logo container */}
        <div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
          <ModelIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>

        {/* Headings */}
        <div className="space-y-2 md:space-y-3 font-arabic" dir="rtl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-arabic">
            بماذا يمكنني مساعدتك اليوم؟
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed font-arabic">
            اختر أحد الاقتراحات المخصصة بالأسفل للبدء فوراً، أو اكتب سؤالك الخاص في صندوق الإدخال.
          </p>
        </div>

        {/* Suggestions Grid */}
        {isLoadingSuggestions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full" dir="rtl">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="flex flex-col items-start text-right p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/10 shadow-sm animate-pulse min-h-[92px] w-full"
              >
                <div className="flex items-center gap-2.5 mb-2 w-full">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800/80 shrink-0 animate-pulse" />
                  <div className="h-4 bg-zinc-800/80 rounded w-1/3 animate-pulse" />
                </div>
                <div className="h-3 bg-zinc-800/80 rounded w-2/3 mt-1.5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full" dir="rtl">
            {displaySuggestions.map((item, idx) => {
              const SugIcon = getSuggestionIcon(item.title);
              return (
                <motion.button
                  key={idx}
                  onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col text-right p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-violet-500/20 shadow-sm transition-all duration-200 cursor-pointer min-w-0 font-arabic relative overflow-hidden group"
                >
                  <div className="flex items-center gap-2.5 mb-1.5 w-full">
                    <div className="w-7 h-7 rounded-lg bg-zinc-850 border border-zinc-800 flex items-center justify-center shrink-0 text-violet-400 group-hover:text-violet-300 transition-colors">
                      <SugIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground truncate">{item.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal line-clamp-2 pr-1">{item.desc}</p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-6">
      <AnimatePresence mode="popLayout">
        {messages.map((message: Message, index: number) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: index * 0.05,
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
                unboundState={message.model === "apex-unbound" && index === messages.length - 1 ? unboundState : undefined}
              />
            )}
          </motion.div>
        ))}

        {isStreaming && !streamingContent && !streamingReasoning &&
          selectedModel !== "apex-omni" && selectedModel !== "apex-unbound" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex gap-4"
          >
            <ThinkingBubble isSearch={selectedModel === "apex-elite" || isDeepResearch} />
          </motion.div>
        )}

        {/* APEX Unbound: show pipeline card while generating, before streaming content arrives */}
        {isStreaming && selectedModel === "apex-unbound" && unboundState && !streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <UnboundStatusCard state={unboundState} />
          </motion.div>
        )}

        {isStreaming && (selectedModel === "apex-omni" || streamingContent || streamingReasoning) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AssistantMessage
              content={streamingContent || ""}
              model={selectedModel}
              reasoning={streamingReasoning}
              omniState={selectedModel === "apex-omni" ? (omniState || undefined) : undefined}
              unboundState={selectedModel === "apex-unbound" ? unboundState : undefined}
              isStreaming
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tr-md px-4 py-3 shadow-md shadow-black/30 backdrop-blur-sm">
          <p className="text-[14.5px] text-foreground leading-relaxed whitespace-pre-wrap break-words">{content}</p>
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
        processedHtml = html.replace(/(<head[^>]*>)/i, `$1\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
      } else if (/<html[^>]*>/i.test(html)) {
        processedHtml = html.replace(/(<html[^>]*>)/i, `$1\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`);
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
      console.error("Failed to open server-cached preview, falling back to Blob URL:", err);
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
              <p className="text-sm font-bold text-violet-300 truncate">الموقع جاهز للعرض والتشغيل</p>
              <p className="text-[11px] text-zinc-500 truncate">Website ready · Preview or open full screen</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex-1 sm:flex-initial">
              <Button
                onClick={() => setShowPreview(true)}
                className="w-full h-8 px-4 text-xs font-bold gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-lg shadow-md shadow-violet-900/30 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                معاينة
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex-1 sm:flex-initial">
              <Button
                onClick={openInNewTab}
                className="w-full h-8 px-4 text-xs font-bold gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg shadow-sm transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                شاشة كاملة
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Bottom glow */}
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      </motion.div>

      {showPreview && (
        <WebPreviewModal html={html} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}


// Model → gradient config for avatar
const modelGradients: Record<string, string> = {
  "apex-flash":   "from-zinc-800 to-zinc-900",
  "apex-pro":     "from-zinc-800 to-zinc-900",
  "apex-elite":   "from-zinc-800 to-zinc-900",
  "apex-omni":    "from-zinc-800 to-zinc-900",
  "apex-unbound": "from-zinc-800 to-zinc-900",
};

const modelColors: Record<string, string> = {
  "apex-flash":   "text-zinc-300",
  "apex-pro":     "text-blue-400",
  "apex-elite":   "text-emerald-400",
  "apex-omni":    "text-amber-400",
  "apex-unbound": "text-violet-400",
};

const modelGlows: Record<string, string> = {
  "apex-flash":   "shadow-[0_0_12px_rgba(113,113,122,0.25)]",
  "apex-pro":     "shadow-[0_0_12px_rgba(37,99,235,0.35)]",
  "apex-elite":   "shadow-[0_0_12px_rgba(5,150,105,0.45)]",
  "apex-omni":    "shadow-[0_0_12px_rgba(217,119,6,0.35)]",
  "apex-unbound": "shadow-[0_0_12px_rgba(139,92,246,0.35)]",
};

function AssistantMessage({
  content,
  model,
  reasoning,
  isStreaming,
  omniState,
  unboundState,
}: {
  content: string;
  model?: AIModel;
  reasoning?: string;
  isStreaming?: boolean;
  omniState?: OmniState;
  unboundState?: UnboundState | null;
}) {
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const { cleanContent, sources } = extractSourcesAndClean(content);

  const isUnboundModel = model === "apex-unbound";
  const cleanedMarkdown = isUnboundModel ? cleanStatusMarkers(cleanContent) : cleanContent;

  // Detect if this message contains a launchable website (can extract as soon as HTML block closes)
  const detectedHtml = extractHtmlFromContent(cleanedMarkdown);

  // Detect if this message contains an architectural plan
  const detectedPlan = isUnboundModel ? extractPlanFromContent(cleanContent) : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ModelIcon = model ? modelIcons[model] || Sparkles : Sparkles;
  const gradient = model ? (modelGradients[model] || "from-violet-500 to-indigo-600") : "from-violet-500 to-indigo-600";
  const nameColor = model ? (modelColors[model] || "text-zinc-300") : "text-zinc-300";
  const glowColor = model ? (modelGlows[model] || "shadow-[0_0_12px_rgba(139,92,246,0.25)]") : "shadow-[0_0_12px_rgba(139,92,246,0.25)]";

  return (
    <motion.div
      className={cn(
        "flex gap-3 md:gap-4 group p-3.5 md:p-4 rounded-2xl border border-zinc-900 bg-zinc-900/15 backdrop-blur-sm transition-all duration-500 shadow-sm",
        isStreaming && "bg-zinc-900/30 border-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.02)]"
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Per-model gradient avatar */}
      <Avatar className={cn(
        "w-8 h-8 flex-shrink-0 shadow-lg transition-all duration-500",
        isStreaming && "scale-105 ring-2 ring-violet-500/30",
        glowColor
      )}>
        <AvatarFallback className={`avatar-gradient ${model ? `avatar-${model.replace("apex-", "")}` : "avatar-flash"} border-0`}>
          <ModelIcon className="w-4 h-4 text-white" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2 min-w-0">
        {/* Model label with status dot */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                isStreaming ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" : "opacity-60 bg-current",
                nameColor
              )} />
              <span className={`text-[11px] font-bold tracking-widest uppercase ${nameColor}`}>
                {model ? (MODEL_INFO[model]?.name || model) : "AI"}
              </span>
            </div>
          </div>
          {content && (
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost" size="sm"
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-all h-6 px-2 hover:bg-white/6 text-muted-foreground hover:text-foreground rounded-lg"
              >
                {copied ? (
                  <><Check className="w-3 h-3 mr-1 text-emerald-400" /><span className="text-xs">Copied</span></>
                ) : (
                  <><Copy className="w-3 h-3 mr-1" /><span className="text-xs">Copy</span></>
                )}
              </Button>
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
                <p className="text-sm text-muted-foreground italic">{reasoning}</p>
              </div>
            )}
          </div>
        )}

        {omniState && (
          <div className="mb-4">
            <OmniStatusCard state={omniState} />
          </div>
        )}

        {unboundState && (
          <div className="mb-4">
            <UnboundStatusCard state={unboundState} />
          </div>
        )}

        {isUnboundModel && (content.includes("[🤖") || content.includes("<plan>")) && (
          <div className="mb-4 flex flex-col gap-2">
            <UnboundWebGenStatusCard content={content} isStreaming={!!isStreaming} />
            {detectedPlan && (
              <UnboundPlanCard 
                planText={detectedPlan} 
                messageContent={content} 
                isStreaming={!!isStreaming} 
              />
            )}
          </div>
        )}

        {content && (
          <div className={cn("prose prose-sm dark:prose-invert max-w-none", isStreaming && "streaming-active")}>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ node, src, alt, ...props }) => (
                    <MarkdownImage src={src} alt={alt} {...props} />
                  ),
                  p: ({ node, children, ...props }) => {
                    const isRtl = hasArabicText(children);
                    return (
                      <p 
                        className={cn("text-foreground leading-relaxed my-2 text-[15px]", isRtl ? "font-arabic text-right" : "text-left")}
                        dir={isRtl ? "rtl" : "ltr"}
                        {...props}
                      >
                        {React.Children.map(children, child => 
                          typeof child === "string" ? replaceEmojisWithIcons(child) : child
                        )}
                      </p>
                    );
                  },
                  li: ({ node, children, ...props }) => {
                    const isRtl = hasArabicText(children);
                    return (
                      <li 
                        className={cn("text-foreground leading-relaxed my-1.5 text-[15px]", isRtl ? "font-arabic text-right" : "text-left")}
                        dir={isRtl ? "rtl" : "ltr"}
                        {...props}
                      >
                        {React.Children.map(children, child => 
                          typeof child === "string" ? replaceEmojisWithIcons(child) : child
                        )}
                      </li>
                    );
                  },
                  strong: ({ node, children, ...props }) => (
                    <strong className="font-bold text-foreground" {...props}>
                      {React.Children.map(children, child => 
                        typeof child === "string" ? replaceEmojisWithIcons(child) : child
                      )}
                    </strong>
                  ),
                  em: ({ node, children, ...props }) => (
                    <em className="italic text-muted-foreground" {...props}>
                      {React.Children.map(children, child => 
                        typeof child === "string" ? replaceEmojisWithIcons(child) : child
                      )}
                    </em>
                  ),
                  h1: ({ node, children, ...props }) => {
                    const isRtl = hasArabicText(children);
                    return (
                      <h1 
                        className={cn("text-2xl font-extrabold text-foreground mt-8 mb-4 tracking-tight", isRtl ? "font-arabic text-right" : "text-left")}
                        dir={isRtl ? "rtl" : "ltr"}
                        {...props}
                      >
                        {React.Children.map(children, child => 
                          typeof child === "string" ? replaceEmojisWithIcons(child) : child
                        )}
                      </h1>
                    );
                  },
                  h2: ({ node, children, ...props }) => {
                    const isRtl = hasArabicText(children);
                    return (
                      <h2 
                        className={cn("text-xl font-bold text-foreground mt-6 mb-3 tracking-tight border-b border-border pb-1", isRtl ? "font-arabic text-right" : "text-left")}
                        dir={isRtl ? "rtl" : "ltr"}
                        {...props}
                      >
                        {React.Children.map(children, child => 
                          typeof child === "string" ? replaceEmojisWithIcons(child) : child
                        )}
                      </h2>
                    );
                  },
                  h3: ({ node, children, ...props }) => {
                    const isRtl = hasArabicText(children);
                    return (
                      <h3 
                        className={cn("text-lg font-bold text-foreground mt-4 mb-2 tracking-tight", isRtl ? "font-arabic text-right" : "text-left")}
                        dir={isRtl ? "rtl" : "ltr"}
                        {...props}
                      >
                        {React.Children.map(children, child => 
                          typeof child === "string" ? replaceEmojisWithIcons(child) : child
                        )}
                      </h3>
                    );
                  },
                  table: ({ node, children, ...props }) => {
                    const isRtlTable = hasArabicText(children);
                    return (
                      <div className="overflow-x-auto my-6 rounded-xl border border-zinc-800/80 shadow-lg bg-zinc-950/40 backdrop-blur-md max-w-full transition-all duration-300 hover:shadow-xl hover:border-zinc-700/60">
                        <table 
                          className="w-full text-sm border-collapse text-foreground font-sans" 
                          dir={isRtlTable ? 'rtl' : 'ltr'}
                          {...props}
                        >
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead: ({ node, ...props }) => (
                    <thead className="bg-zinc-900/90 border-b border-zinc-700/50" {...props} />
                  ),
                  th: ({ node, children, align, style, cellIndex, ...props }: any) => {
                    const isRtl = hasArabicText(children);
                    const textAlignment = align || style?.textAlign || (isRtl ? 'right' : 'left');
                    const rawText = extractTextFromChildren(children);
                    const shouldShowImage = cellIndex === undefined || cellIndex !== 0;
                    return (
                      <th 
                        className={cn(
                          "px-5 py-3.5 border border-zinc-800/80 font-bold text-zinc-200 tracking-wider text-xs uppercase bg-zinc-900/40",
                          isRtl && 'font-arabic',
                          textAlignment === 'right' && 'text-right',
                          textAlignment === 'left' && 'text-left',
                          textAlignment === 'center' && 'text-center'
                        )}
                        dir={isRtl ? 'rtl' : 'ltr'}
                        style={style}
                        {...props}
                      >
                        {shouldShowImage && <EntityHeaderImage title={rawText} />}
                        <div className={cn(shouldShowImage && "mt-1")}>
                          {React.Children.map(children, child => 
                            typeof child === "string" ? replaceEmojisWithIcons(child) : child
                          )}
                        </div>
                      </th>
                    );
                  },
                  tr: ({ node, children, ...props }) => {
                    const cells = React.Children.toArray(children);
                    return (
                      <tr className="hover:bg-zinc-800/20 even:bg-zinc-900/10 transition-colors duration-150 border-b border-zinc-900 last:border-0" {...props}>
                        {cells.map((cell, index) => {
                          if (React.isValidElement(cell)) {
                            return React.cloneElement(cell as React.ReactElement<any>, { cellIndex: index });
                          }
                          return cell;
                        })}
                      </tr>
                    );
                  },
                  td: ({ node, children, align, style, cellIndex, ...props }: any) => {
                    const isRtl = hasArabicText(children);
                    const textAlignment = align || style?.textAlign || (isRtl ? 'right' : 'left');
                    return (
                      <td 
                        className={cn(
                          "px-5 py-4 border border-zinc-800/40 align-middle leading-relaxed text-[13.5px] text-zinc-300",
                          isRtl && 'font-arabic',
                          textAlignment === 'right' && 'text-right',
                          textAlignment === 'left' && 'text-left',
                          textAlignment === 'center' && 'text-center'
                        )}
                        dir={isRtl ? 'rtl' : 'ltr'}
                        style={style}
                        {...props}
                      >
                        {React.Children.map(children, child => 
                          typeof child === "string" ? replaceEmojisWithIcons(child) : child
                        )}
                      </td>
                    );
                  },
                  code: ({ node, className, children, ...props }) => {
                    const inline = (props as any).inline as boolean | undefined;
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    
                    if (inline) {
                      return (
                        <code className="bg-muted px-1.5 py-0.5 rounded border border-border text-emerald-600 dark:text-emerald-400 font-mono text-xs" {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <CodeBlockWrapper language={lang} code={String(children).replace(/\n$/, '')} parentContent={cleanedMarkdown} />
                    );
                  },
                }}
              >
                {cleanedMarkdown}
              </ReactMarkdown>
            </div>
            {/* Website Preview Banner — appears for ANY model that generates HTML */}
            {detectedHtml && !isStreaming && (
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
                  <DropdownMenuContent align="end" className="w-72 bg-popover border border-border rounded-xl shadow-xl p-1">
                    {sources.map((source, idx) => (
                      <DropdownMenuItem key={idx} asChild className="cursor-pointer">
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
                            <span className="truncate max-w-[180px] text-foreground">{source.title}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground font-mono ml-2 shrink-0">{source.domain}</span>
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
