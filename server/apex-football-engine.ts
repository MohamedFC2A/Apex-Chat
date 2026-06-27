export interface ApexFootballContext {
  used: boolean;
  context: string;
  sourceCount: number;
  answer?: string;
}

type FootballTeam = {
  id: number;
  name: string;
  country?: string;
  national?: boolean;
};

type FixtureSummary = {
  id: number;
  league: string;
  date: string;
  status: string;
  elapsed?: number;
  home: string;
  away: string;
  goals: string;
  venue?: string;
};

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

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

  const apiKey = process.env.API_FOOTBALL_KEY || process.env.APISPORTS_KEY;
  if (!apiKey) {
    return {
      used: false,
      context: "",
      sourceCount: 0,
    };
  }

  try {
    const today = getClientDate(clientLocalTime);
    const teamQueries = inferTeamQueries(message).slice(0, 2);
    const teams = await resolveTeams(teamQueries, apiKey);
    if (!teams.length) {
      return { used: false, context: "", sourceCount: 0 };
    }

    const wantsLive = /(live|now|currently|in progress|مباشر|الآن|الان|حاليا|تلعب)/i.test(message);
    const wantsRecent = /(played|result|score|last|recent|finished|لعبت|نتيجة|آخر|اخر|الأخيرة|الاخيرة|خلصت|انتهت)/i.test(message);
    const wantsNext = /(next|upcoming|schedule|موعد|القادمة|الجاي|القادم|ستلعب|هتلعب)/i.test(message);
    const wantsEvents = /(goals|scorers|cards|events|minute|أهداف|اهداف|سجل|مسجل|دقيقة|بطاقات|أحداث|احداث)/i.test(message);

    const fixtureGroups: Array<{ label: string; fixtures: FixtureSummary[] }> = [];
    const notes: string[] = [];
    let sourceCount = teams.length;

    if (teams.length >= 2) {
      const h2h = await apiFootballGet("/fixtures/headtohead", { h2h: `${teams[0].id}-${teams[1].id}`, last: 5 }, apiKey);
      const fixtures = summarizeFixtures(h2h.response).slice(0, 5);
      if (fixtures.length) {
        fixtureGroups.push({ label: "Head-to-head fixtures", fixtures });
        sourceCount += 1;
      }
    }

    for (const team of teams) {
      if (wantsLive) {
        const live = await apiFootballGet("/fixtures", { team: team.id, live: "all" }, apiKey);
        const fixtures = summarizeFixtures(live.response).slice(0, 3);
        if (fixtures.length) {
          fixtureGroups.push({ label: `${team.name} live fixtures`, fixtures });
          sourceCount += 1;
        } else {
          notes.push(`No live fixture returned for ${team.name}.`);
        }
      }

      const todayFixtures = await apiFootballGet("/fixtures", { team: team.id, date: today }, apiKey);
      const todaySummaries = summarizeFixtures(todayFixtures.response).slice(0, 3);
      if (todaySummaries.length) {
        fixtureGroups.push({ label: `${team.name} fixtures on ${today}`, fixtures: todaySummaries });
        sourceCount += 1;
      } else if (wantsLive || /today|اليوم|النهارده|الآن|الان|حاليا/i.test(message)) {
        notes.push(`No fixture returned for ${team.name} on ${today}.`);
      }

      if (wantsRecent || (!wantsLive && !wantsNext)) {
        const last = await apiFootballGet("/fixtures", { team: team.id, last: 5 }, apiKey);
        const fixtures = summarizeFixtures(last.response).slice(0, 5);
        if (fixtures.length) {
          fixtureGroups.push({ label: `${team.name} recent fixtures`, fixtures });
          sourceCount += 1;
        } else {
          const historical = await getAccessibleHistoricalFixtures(team, apiKey);
          if (historical.length) {
            fixtureGroups.push({ label: `${team.name} available recent form sample`, fixtures: historical.slice(0, 5) });
            sourceCount += 1;
            notes.push(`The API plan did not allow the direct last=5 endpoint, so Apex Search used accessible competition-season fixtures as a compact form sample.`);
          } else {
            const planMessage = extractApiPlanMessage(last);
            if (planMessage) notes.push(`Recent fixtures endpoint limitation for ${team.name}: ${planMessage}`);
          }
        }
      }

      if (wantsNext || (!wantsLive && !wantsRecent)) {
        const next = await apiFootballGet("/fixtures", { team: team.id, next: 3 }, apiKey);
        const fixtures = summarizeFixtures(next.response).slice(0, 3);
        if (fixtures.length) {
          fixtureGroups.push({ label: `${team.name} upcoming fixtures`, fixtures });
          sourceCount += 1;
        } else {
          const planMessage = extractApiPlanMessage(next);
          if (planMessage) notes.push(`Upcoming fixtures endpoint limitation for ${team.name}: ${planMessage}`);
        }
      }
    }

    const eventFixture = wantsEvents ? pickEventFixture(fixtureGroups) : null;
    const eventLines = eventFixture ? await getFixtureEventLines(eventFixture.id, apiKey) : [];
    if (eventLines.length) sourceCount += 1;

    const context = renderFootballContext(message, teams, fixtureGroups, eventFixture, eventLines, notes);
    const answer = renderFootballAnswer(message, teams, fixtureGroups, notes);
    return { used: true, context, sourceCount, answer };
  } catch (error) {
    console.error("[Apex Football] API-Football request failed:", error);
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

  if (found.length) return found;

    const cleaned = message
    .replace(/(منتخب|مباراة|نتيجة|أداء|اداء|هل|لعب|يلعب|تلعب|مباشر|موعد|آخر|اخر|football|soccer|match|score|result|team|national)/gi, " ")
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? [cleaned.slice(0, 60)] : [];
}

async function resolveTeams(queries: string[], apiKey: string): Promise<FootballTeam[]> {
  const teams: FootballTeam[] = [];
  for (const query of queries) {
    const data = await apiFootballGet("/teams", { name: query }, apiKey);
    const items = Array.isArray(data.response) ? data.response : [];
    const best = items
      .map((item: any) => ({
        id: Number(item?.team?.id),
        name: String(item?.team?.name || ""),
        country: String(item?.team?.country || ""),
        national: Boolean(item?.team?.national),
        score: scoreTeamMatch(item, query),
      }))
      .filter((team: FootballTeam & { score: number }) => team.id && team.name)
      .sort((a: FootballTeam & { score: number }, b: FootballTeam & { score: number }) => b.score - a.score)[0];

    if (best && !teams.some((team) => team.id === best.id)) {
      teams.push({ id: best.id, name: best.name, country: best.country, national: best.national });
    }
  }
  return teams;
}

function scoreTeamMatch(item: any, query: string): number {
  const team = item?.team || {};
  const name = String(team.name || "").toLowerCase();
  const country = String(team.country || "").toLowerCase();
  const q = query.toLowerCase();
  let score = 100;
  if (team.national) score += 80;
  if (name === q) score += 60;
  if (country === q) score += 45;
  if (name.includes(q) || q.includes(name)) score += 25;
  return score;
}

async function apiFootballGet(path: string, params: Record<string, string | number>, apiKey: string): Promise<any> {
  const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
    },
  });
  if (!response.ok) throw new Error(`API-Football ${path} failed with status ${response.status}`);
  return response.json();
}

async function getAccessibleHistoricalFixtures(team: FootballTeam, apiKey: string): Promise<FixtureSummary[]> {
  const leagueData = await apiFootballGet("/leagues", { team: team.id, current: "true" }, apiKey);
  const candidates = (Array.isArray(leagueData.response) ? leagueData.response : [])
    .flatMap((item: any) => {
      const leagueId = Number(item?.league?.id);
      return (Array.isArray(item?.seasons) ? item.seasons : [])
        .map((season: any) => ({ league: leagueId, season: Number(season?.year), name: String(item?.league?.name || "") }))
        .filter((candidate: any) => candidate.league && candidate.season >= 2022 && candidate.season <= 2024);
    })
    .slice(0, 4);

  const allFixtures: FixtureSummary[] = [];
  for (const candidate of candidates) {
    const data = await apiFootballGet("/fixtures", { team: team.id, league: candidate.league, season: candidate.season }, apiKey);
    allFixtures.push(...summarizeFixtures(data.response));
  }

  return allFixtures
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
}

function extractApiPlanMessage(data: any): string {
  const errors = data?.errors;
  if (!errors || Array.isArray(errors)) return "";
  return String(errors.plan || errors.requests || "").trim();
}

function summarizeFixtures(fixtures: any[]): FixtureSummary[] {
  return (Array.isArray(fixtures) ? fixtures : []).map((item) => ({
    id: Number(item?.fixture?.id),
    league: [item?.league?.name, item?.league?.round].filter(Boolean).join(" - "),
    date: String(item?.fixture?.date || ""),
    status: formatFixtureStatus(item?.fixture?.status),
    elapsed: Number(item?.fixture?.status?.elapsed) || undefined,
    home: String(item?.teams?.home?.name || ""),
    away: String(item?.teams?.away?.name || ""),
    goals: `${item?.goals?.home ?? "-"}-${item?.goals?.away ?? "-"}`,
    venue: [item?.fixture?.venue?.name, item?.fixture?.venue?.city].filter(Boolean).join(", "),
  })).filter((fixture) => fixture.id && fixture.home && fixture.away);
}

function formatFixtureStatus(status: any): string {
  const short = String(status?.short || "");
  const long = String(status?.long || "");
  const elapsed = status?.elapsed ? ` ${status.elapsed}'` : "";
  if (["1H", "2H", "ET", "BT", "P", "LIVE"].includes(short)) return `LIVE${elapsed}${long ? ` (${long})` : ""}`;
  if (["FT", "AET", "PEN"].includes(short)) return `Finished${long ? ` (${long})` : ""}`;
  if (["NS", "TBD"].includes(short)) return `Not started${long ? ` (${long})` : ""}`;
  if (["PST", "CANC", "ABD", "SUSP", "INT"].includes(short)) return long || short;
  return long || short || "Unknown";
}

function pickEventFixture(groups: Array<{ fixtures: FixtureSummary[] }>): FixtureSummary | null {
  return groups.flatMap((group) => group.fixtures)
    .find((fixture) => /LIVE|Finished/i.test(fixture.status)) || null;
}

async function getFixtureEventLines(fixtureId: number, apiKey: string): Promise<string[]> {
  const data = await apiFootballGet("/fixtures/events", { fixture: fixtureId }, apiKey);
  return (Array.isArray(data.response) ? data.response : []).slice(0, 14).map((event: any) => {
    const minute = event?.time?.elapsed ? `${event.time.elapsed}'` : "";
    const extra = event?.time?.extra ? `+${event.time.extra}` : "";
    const team = event?.team?.name || "";
    const player = event?.player?.name || "";
    const type = [event?.type, event?.detail].filter(Boolean).join(" - ");
    return [minute + extra, team, player, type].filter(Boolean).join(" | ");
  });
}

function renderFootballContext(
  message: string,
  teams: FootballTeam[],
  groups: Array<{ label: string; fixtures: FixtureSummary[] }>,
  eventFixture: FixtureSummary | null,
  eventLines: string[],
  notes: string[]
): string {
  let context = "\n\n=== API-FOOTBALL LIVE DATA ===\n";
  context += "Source: API-Football v3. Treat this structured data as the primary authority for whether a football match is live, finished, postponed, or not started. Keep the answer concise and do not list unrelated Google snippets when this data directly answers the question.\n";
  context += `User question: ${message}\n`;
  context += `Resolved teams: ${teams.map((team) => `${team.name}${team.country ? ` (${team.country})` : ""}${team.national ? " [national]" : ""}`).join(" vs ")}\n\n`;

  groups.slice(0, 6).forEach((group) => {
    context += `[${group.label}]\n`;
    group.fixtures.slice(0, 5).forEach((fixture) => {
      context += `- ${fixture.home} ${fixture.goals} ${fixture.away} | ${fixture.status} | ${fixture.league || "Competition unknown"} | ${fixture.date}${fixture.venue ? ` | Venue: ${fixture.venue}` : ""} | Fixture ID: ${fixture.id}\n`;
    });
    context += "\n";
  });

  if (notes.length) {
    context += `[API notes]\n`;
    Array.from(new Set(notes)).slice(0, 5).forEach((note) => {
      context += `- ${note}\n`;
    });
    context += "\n";
  }

  if (eventFixture && eventLines.length) {
    context += `[Events for fixture ${eventFixture.id}: ${eventFixture.home} vs ${eventFixture.away}]\n`;
    eventLines.forEach((line) => {
      context += `- ${line}\n`;
    });
    context += "\n";
  }

  return context;
}

function renderFootballAnswer(
  message: string,
  teams: FootballTeam[],
  groups: Array<{ label: string; fixtures: FixtureSummary[] }>,
  notes: string[]
): string {
  const isArabic = /[\u0600-\u06FF]/.test(message);
  const teamLabel = teams.map((team) => team.name).join(" vs ") || (isArabic ? "الفريق" : "the team");
  const fixtures = groups.flatMap((group) => group.fixtures).filter((fixture, index, list) => {
    return list.findIndex((item) => item.id === fixture.id) === index;
  });
  const liveFixtures = fixtures.filter((fixture) => /^LIVE/i.test(fixture.status));
  const finishedFixtures = fixtures.filter((fixture) => /Finished/i.test(fixture.status)).slice(0, 5);
  const upcomingFixtures = fixtures.filter((fixture) => /Not started/i.test(fixture.status)).slice(0, 3);
  const noLive = notes.some((note) => /No live fixture/i.test(note));
  const noToday = notes.some((note) => /No fixture returned/i.test(note));

  if (isArabic) {
    let answer = `### نتائج API-Football\n\n`;
    if (liveFixtures.length) {
      answer += `**${teamLabel} يلعب الآن.**\n\n`;
      answer += renderArabicFixtureTable(liveFixtures);
    } else if (noLive || noToday) {
      answer += `لا توجد مباراة مباشرة أو مباراة اليوم لـ **${teamLabel}** حسب البيانات المتاحة من API-Football.\n\n`;
    }

    if (finishedFixtures.length) {
      answer += `**آخر أداء مسجل:**\n\n`;
      answer += renderArabicFixtureTable(finishedFixtures);
      answer += `\n${renderArabicFormSummary(finishedFixtures, teams[0]?.name)}\n`;
    }

    if (upcomingFixtures.length) {
      answer += `\n**المباريات القادمة المسجلة:**\n\n`;
      answer += renderArabicFixtureTable(upcomingFixtures);
    }

    const uniqueNotes = Array.from(new Set(notes));
    if (uniqueNotes.length) {
      answer += `\n**ملاحظات API:**\n`;
      uniqueNotes.slice(0, 3).forEach((note) => {
        answer += `- ${translateApiNote(note)}\n`;
      });
    }

    answer += `\n### المصادر\n- API-Football v3 structured data`;
    return answer.trim();
  }

  let answer = `### API-Football Results\n\n`;
  if (liveFixtures.length) {
    answer += `**${teamLabel} is playing now.**\n\n${renderEnglishFixtureTable(liveFixtures)}\n`;
  } else if (noLive || noToday) {
    answer += `No live fixture or fixture today was returned for **${teamLabel}** from API-Football.\n\n`;
  }
  if (finishedFixtures.length) {
    answer += `**Latest recorded form:**\n\n${renderEnglishFixtureTable(finishedFixtures)}\n`;
  }
  if (upcomingFixtures.length) {
    answer += `\n**Upcoming recorded fixtures:**\n\n${renderEnglishFixtureTable(upcomingFixtures)}\n`;
  }
  if (notes.length) {
    answer += `\n**API notes:**\n${Array.from(new Set(notes)).slice(0, 3).map((note) => `- ${note}`).join("\n")}\n`;
  }
  answer += `\n### Sources\n- API-Football v3 structured data`;
  return answer.trim();
}

function renderArabicFixtureTable(fixtures: FixtureSummary[]): string {
  let table = `| التاريخ | البطولة | المباراة | الحالة/النتيجة | الملعب |\n|---|---|---|---|---|\n`;
  fixtures.forEach((fixture) => {
    table += `| ${formatDate(fixture.date)} | ${fixture.league || "غير محدد"} | ${fixture.home} ضد ${fixture.away} | ${fixture.goals} - ${fixture.status} | ${fixture.venue || "غير متاح"} |\n`;
  });
  return table;
}

function renderEnglishFixtureTable(fixtures: FixtureSummary[]): string {
  let table = `| Date | Competition | Match | Status/Score | Venue |\n|---|---|---|---|---|\n`;
  fixtures.forEach((fixture) => {
    table += `| ${formatDate(fixture.date)} | ${fixture.league || "Unknown"} | ${fixture.home} vs ${fixture.away} | ${fixture.goals} - ${fixture.status} | ${fixture.venue || "n/a"} |\n`;
  });
  return table;
}

function renderArabicFormSummary(fixtures: FixtureSummary[], primaryTeam?: string): string {
  if (!primaryTeam) return "";
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let scored = 0;
  let conceded = 0;

  fixtures.forEach((fixture) => {
    const [homeGoalsRaw, awayGoalsRaw] = fixture.goals.split("-");
    const homeGoals = Number(homeGoalsRaw);
    const awayGoals = Number(awayGoalsRaw);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;
    const isHome = fixture.home.toLowerCase() === primaryTeam.toLowerCase();
    const own = isHome ? homeGoals : awayGoals;
    const against = isHome ? awayGoals : homeGoals;
    scored += own;
    conceded += against;
    if (own > against) wins += 1;
    else if (own === against) draws += 1;
    else losses += 1;
  });

  return `**ملخص آخر ${fixtures.length} مباريات:** ${wins} فوز، ${draws} تعادل، ${losses} خسارة، سجل ${scored} واستقبل ${conceded}.`;
}

function translateApiNote(note: string): string {
  if (/No live fixture/i.test(note)) return note.replace(/No live fixture returned for/i, "لا توجد مباراة مباشرة لـ");
  if (/No fixture returned/i.test(note)) return note.replace(/No fixture returned for/i, "لا توجد مباراة مسجلة لـ").replace(/ on /i, " بتاريخ ");
  if (/direct last=5 endpoint/i.test(note)) return "الخطة الحالية لا تسمح باستدعاء last=5 مباشرة، لذلك تم استخدام مباريات البطولات/المواسم المتاحة كعينة أداء مضغوطة.";
  return note;
}

function formatDate(value: string): string {
  if (!value) return "n/a";
  return value.slice(0, 10);
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
