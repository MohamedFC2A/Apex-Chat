export interface ApexFootballContext {
  used: boolean;
  context: string;
  sourceCount: number;
  answer?: string;
}

type FixtureSummary = {
  id: number;
  league: string;
  date: string;
  status: string;
  home: string;
  away: string;
  goals: string;
};

const TEAM_ALIASES: Array<{ aliases: RegExp[]; query: string }> = [
  { aliases: [/منتخب مصر|مصر|egypt/i], query: "Egypt" },
  { aliases: [/منتخب المغرب|المغرب|morocco/i], query: "Morocco" },
  { aliases: [/منتخب الجزائر|الجزائر|algeria/i], query: "Algeria" },
  { aliases: [/منتخب تونس|تونس|tunisia/i], query: "Tunisia" },
  { aliases: [/منتخب السعودية|السعودية|saudi arabia|ksa/i], query: "Saudi Arabia" },
  { aliases: [/منتخب العراق|العراق|iraq/i], query: "Iraq" },
  { aliases: [/منتخب الأردن|منتخب الاردن|الأردن|الاردن|jordan/i], query: "Jordan" },
  { aliases: [/منتخب قطر|قطر|qatar/i], query: "Qatar" },
  { aliases: [/الإمارات|الامارات|uae|united arab emirates/i], query: "United Arab Emirates" },
  { aliases: [/منتخب فلسطين|فلسطين|palestine/i], query: "Palestine" },
  { aliases: [/منتخب سوريا|سوريا|syria/i], query: "Syria" },
  { aliases: [/منتخب لبنان|لبنان|lebanon/i], query: "Lebanon" },
  { aliases: [/منتخب الكويت|الكويت|kuwait/i], query: "Kuwait" },
  { aliases: [/منتخب عمان|عمان|oman/i], query: "Oman" },
  { aliases: [/منتخب البحرين|البحرين|bahrain/i], query: "Bahrain" },
  { aliases: [/منتخب اليمن|اليمن|yemen/i], query: "Yemen" },
  { aliases: [/الأرجنتين|الارجنتين|argentina/i], query: "Argentina" },
  { aliases: [/البرازيل|brazil/i], query: "Brazil" },
  { aliases: [/فرنسا|france/i], query: "France" },
  { aliases: [/إسبانيا|اسبانيا|spain/i], query: "Spain" },
  { aliases: [/ألمانيا|المانيا|germany/i], query: "Germany" },
  { aliases: [/إنجلترا|انجلترا|england/i], query: "England" },
  { aliases: [/البرتغال|portugal/i], query: "Portugal" },
  { aliases: [/إيطاليا|ايطاليا|italy/i], query: "Italy" },
  { aliases: [/هولندا|netherlands|holland/i], query: "Netherlands" },
  { aliases: [/أمريكا|امريكا|الولايات المتحدة|usa|united states/i], query: "USA" },
  { aliases: [/المكسيك|mexico/i], query: "Mexico" },
];

export function isFootballQuery(message: string): boolean {
  const text = String(message || "");
  const hasFootballSubject = /(football|soccer|match|fixture|score|goal|league|cup|national team|منتخب|مباراة|ماتش|نتيجة|أهداف|اهداف|كورة|كرة القدم|تصفيات|كأس|دوري|ودية|لعب|يلعب|تلعب|مباشر|الأداء|الاداء|أداء|اداء)/i.test(text);
  const looksLikeOtherSport = /(basketball|nba|tennis|formula|ufc|boxing|كرة السلة|تنس|فورمولا|ملاكمة)/i.test(text);
  return hasFootballSubject && !looksLikeOtherSport;
}

export async function buildApexFootballContext(message: string, clientLocalTime?: string): Promise<ApexFootballContext> {
  if (!isFootballQuery(message)) {
    return { used: false, context: "", sourceCount: 0 };
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("[Apex Football] FOOTBALL_DATA_API_KEY is not configured.");
    return { used: false, context: "", sourceCount: 0 };
  }

  try {
    const todayStr = getClientDate(clientLocalTime);
    const today = new Date(todayStr);
    
    // 15 days window around today
    const dateFrom = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`football-data.org API failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawMatches = Array.isArray(data.matches) ? data.matches : [];

    // Filter matches matching search terms/aliases
    const searchTerms = inferTeamQueries(message);
    const matchedMatches = rawMatches.filter((match: any) => {
      return searchTerms.some((term) => {
        const homeName = String(match.homeTeam?.name || "").toLowerCase();
        const homeShort = String(match.homeTeam?.shortName || "").toLowerCase();
        const homeTla = String(match.homeTeam?.tla || "").toLowerCase();
        const awayName = String(match.awayTeam?.name || "").toLowerCase();
        const awayShort = String(match.awayTeam?.shortName || "").toLowerCase();
        const awayTla = String(match.awayTeam?.tla || "").toLowerCase();
        const t = term.toLowerCase();

        return (
          homeName.includes(t) || homeShort.includes(t) || homeTla === t ||
          awayName.includes(t) || awayShort.includes(t) || awayTla === t
        );
      });
    });

    if (!matchedMatches.length) {
      return { used: false, context: "", sourceCount: 0 };
    }

    // Map into summaries
    const summaries: FixtureSummary[] = matchedMatches.map((match: any) => {
      const homeGoals = match.score?.fullTime?.home ?? "-";
      const awayGoals = match.score?.fullTime?.away ?? "-";
      return {
        id: Number(match.id),
        league: String(match.competition?.name || ""),
        date: String(match.utcDate || ""),
        status: String(match.status || ""),
        home: String(match.homeTeam?.shortName || match.homeTeam?.name || ""),
        away: String(match.awayTeam?.shortName || match.awayTeam?.name || ""),
        goals: `${homeGoals}-${awayGoals}`,
      };
    });

    const context = renderFootballContext(message, summaries, todayStr);
    const answer = renderFootballAnswer(message, summaries, todayStr);
    return { used: true, context, sourceCount: summaries.length, answer };

  } catch (error) {
    console.error("[Apex Football] Error building football context:", error);
    return { used: false, context: "", sourceCount: 0 };
  }
}

function inferTeamQueries(message: string): string[] {
  const found: string[] = [];
  for (const item of TEAM_ALIASES) {
    if (item.aliases.some((regex) => regex.test(message)) && !found.includes(item.query)) {
      found.push(item.query);
    }
  }

  const cleaned = message
    .replace(/(منتخب|مباراة|نتيجة|أداء|اداء|هل|لعب|يلعب|تلعب|مباشر|موعد|آخر|اخر|football|soccer|match|score|result|team|national)/gi, " ")
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return [...found, ...cleaned];
}

function renderFootballContext(message: string, fixtures: FixtureSummary[], today: string): string {
  let context = "\n\n=== FOOTBALL-DATA.ORG LIVE DATA ===\n";
  context += `Current Date context: ${today}\n`;
  context += `User query: ${message}\n\n`;
  
  fixtures.forEach((f) => {
    context += `- Match ID: ${f.id} | ${f.home} ${f.goals} ${f.away} | Status: ${f.status} | Competition: ${f.league} | Date: ${f.date}\n`;
  });
  
  return context;
}

function renderFootballAnswer(message: string, fixtures: FixtureSummary[], today: string): string {
  const isArabic = /[\u0600-\u06FF]/.test(message);
  
  const live = fixtures.filter((f) => ["LIVE", "IN_PLAY", "PAUSED"].includes(f.status));
  const finished = fixtures.filter((f) => f.status === "FINISHED").slice(0, 5);
  const scheduled = fixtures.filter((f) => ["TIMED", "SCHEDULED"].includes(f.status)).slice(0, 3);

  if (isArabic) {
    let answer = `### ⚽ نتائج وجداول المباريات المباشرة (football-data.org)\n\n`;
    
    if (live.length) {
      answer += `**مباريات تجري الآن مباشرة:**\n\n`;
      answer += renderArabicTable(live);
    }
    
    if (finished.length) {
      answer += `\n**نتائج المباريات الأخيرة:**\n\n`;
      answer += renderArabicTable(finished);
    }
    
    if (scheduled.length) {
      answer += `\n**المباريات القادمة:**\n\n`;
      answer += renderArabicTable(scheduled);
    }

    if (!live.length && !finished.length && !scheduled.length) {
      answer += `لا توجد مباريات مسجلة حالياً في قائمة الدوريات الكبرى خلال هذه الفترة.\n`;
    }

    answer += `\n*المصدر: بيانات موثقة ومحدثة من football-data.org v4*`;
    return answer;
  }

  let answer = `### ⚽ Live Match Results & Schedules (football-data.org)\n\n`;
  
  if (live.length) {
    answer += `**Live Matches Now:**\n\n`;
    answer += renderEnglishTable(live);
  }
  
  if (finished.length) {
    answer += `\n**Recent Results:**\n\n`;
    answer += renderEnglishTable(finished);
  }
  
  if (scheduled.length) {
    answer += `\n**Upcoming Fixtures:**\n\n`;
    answer += renderEnglishTable(scheduled);
  }

  if (!live.length && !finished.length && !scheduled.length) {
    answer += `No matches recorded in the major leagues for this period.\n`;
  }

  answer += `\n*Source: football-data.org v4 verified data*`;
  return answer;
}

function renderArabicTable(fixtures: FixtureSummary[]): string {
  let table = `| التاريخ | البطولة | المباراة | الحالة/النتيجة |\n|---|---|---|---|\n`;
  fixtures.forEach((f) => {
    const formattedDate = f.date.slice(0, 10);
    table += `| ${formattedDate} | ${f.league} | ${f.home} ضد ${f.away} | ${f.goals} (${translateStatus(f.status)}) |\n`;
  });
  return table;
}

function renderEnglishTable(fixtures: FixtureSummary[]): string {
  let table = `| Date | Competition | Match | Status/Score |\n|---|---|---|---|\n`;
  fixtures.forEach((f) => {
    const formattedDate = f.date.slice(0, 10);
    table += `| ${formattedDate} | ${f.league} | ${f.home} vs ${f.away} | ${f.goals} (${f.status}) |\n`;
  });
  return table;
}

function translateStatus(status: string): string {
  switch (status) {
    case "FINISHED": return "انتهت";
    case "IN_PLAY":
    case "LIVE": return "مباشر الآن";
    case "PAUSED": return "استراحة";
    case "TIMED":
    case "SCHEDULED": return "مجدولة";
    default: return status;
  }
}

function getClientDate(clientLocalTime?: string): string {
  let date = new Date();
  if (clientLocalTime) {
    try {
      const parsed = clientLocalTime.startsWith("{") ? JSON.parse(clientLocalTime) : { iso: clientLocalTime };
      const parsedDate = new Date(parsed.iso || clientLocalTime);
      if (!Number.isNaN(parsedDate.getTime())) date = parsedDate;
    } catch {}
  }
  return date.toISOString().slice(0, 10);
}
