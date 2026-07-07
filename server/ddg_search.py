import sys
import json
import argparse
import re
import concurrent.futures
import time
import random
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

# Blocked and trusted domains for organic search and images
BLOCKED_DOMAINS = [
    "doubleclick.net", "adservice.google", "adnxs.com", "outbrain.com", 
    "taboola.com", "criteo.com", "pinterest.com", "pin.it", "facebook.com",
    "instagram.com", "twitter.com", "tiktok.com"
]

TRUSTED_DOMAINS = [
    "wikipedia.org", "britannica.com", "github.com", "stackoverflow.com",
    "w3schools.com", "mozilla.org", "arxiv.org", "pubmed.ncbi.nlm.nih.gov",
    "nature.com", "science.org", "nasa.gov", "reuters.com", "bbc.com",
    "aljazeera.net", "alarabiya.net", "medium.com", "dev.to", "npmjs.com",
    "sciencedirect.com", "ieee.org", "bloomberg.com", "cnbc.com", "wsj.com",
    "nytimes.com", "theguardian.com", "filgoal.com", "yallakora.com", "kooora.com"
]

# Bilingual translation and keyword expansion dictionary
BILINGUAL_DICT = {
    "سعر": "price value cost rate market exchange",
    "سعر الفائدة": "interest rate fed federal reserve finance",
    "أسعار": "prices rates values",
    "أخبار": "latest news updates breaking reports coverage",
    "اخبار": "latest news updates breaking reports coverage",
    "تاريخ": "history timeline origin evolution background historical",
    "تحليل": "analysis review breakdown evaluation audit report",
    "مقارنة": "comparison vs differences review benchmark features",
    "شرح": "tutorial guide explanation how to walkthrough docs",
    "برمجة": "programming code developer tutorial github script",
    "كود": "code snippet source syntax program implementation",
    "حل": "solution fix solve debug issue troubleshoot",
    "تعريف": "definition explanation meaning concept introduction",
    "معلومات": "information data details facts documentation specs",
    "احصائيات": "statistics data metrics charts figures survey database",
    "إحصائيات": "statistics data metrics charts figures survey database",
    "موقع": "website landing page web app ui interface template",
    "تطبيق": "app application software platform system",
    "تصميم": "design mockup template ui ux layouts theme",
    "صحة": "health medical clinic wellness treatment disease",
    "علم": "science research study paper analysis physics chemistry biology",
    "رياضة": "sports football match schedule standings score goal league",
    "اقتصاد": "economy finance market stocks shares investments inflation",
    "ذكاء": "ai artificial intelligence llm machine learning neural deep",
    "مستند": "document pdf paper manual report sheet"
}

# Reverse mapping English -> Arabic for query enrichment
EN_TO_AR_DICT = {
    "price": "سعر قيمة تكلفة",
    "news": "أخبار آخر التطورات تقارير",
    "history": "تاريخ أصول تسلسل زمني",
    "analysis": "تحليل مراجعة تفاصيل",
    "comparison": "مقارنة الاختلافات ميزات",
    "tutorial": "شرح دليل تعليم طريقة",
    "code": "كود برمجة شيفرة مصدرية",
    "solution": "حل معالجة مشكلة إصلاح",
    "statistics": "إحصائيات بيانات أرقام",
    "website": "موقع ويب صفحة هبوط واجهة",
    "app": "تطبيق برنامج منصة",
    "health": "صحة طبي علاج",
    "sports": "رياضة كورة مباراة ترتيب"
}

def clean_text_query(query):
    # Remove question words or fluff to make search cleaner
    fluff = [
        r"^what is ", r"^how to ", r"^define ", r"^show me ", r"^search for ",
        r"^ما هو ", r"^ما هي ", r"^كيفية ", r"^شرح ", r"^بحث عن ", r"^تعريف "
    ]
    cleaned = query
    for pat in fluff:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def detect_arabic(text):
    return bool(re.search(r'[\u0600-\u06FF]', text))

def generate_sub_queries(query, is_omni):
    """
    Expands the query into 32+ targeted sub-queries covering synonyms,
    bilingual translations, and diverse informational pillars.
    """
    queries = [query]
    cleaned = clean_text_query(query)
    
    if cleaned != query and len(cleaned) > 2:
        queries.append(cleaned)
        
    words = cleaned.split()
    is_ar = detect_arabic(query)
    
    # 1. Broad translation and term enrichment
    enriched_terms = []
    if is_ar:
        # Extract Arabic terms and lookup English translations
        for w in words:
            if w in BILINGUAL_DICT:
                enriched_terms.append(BILINGUAL_DICT[w])
        # Add basic translation query candidate
        cleaned_en = " ".join(enriched_terms)
        if cleaned_en:
            queries.append(cleaned_en)
            queries.append(f"{cleaned} {words[0]} {cleaned_en.split()[0]}")
    else:
        # English to Arabic term translation
        for w in [w.lower() for w in words]:
            if w in EN_TO_AR_DICT:
                enriched_terms.append(EN_TO_AR_DICT[w])
        cleaned_ar = " ".join(enriched_terms)
        if cleaned_ar:
            queries.append(cleaned_ar)
            queries.append(f"{cleaned} {cleaned_ar.split()[0]}")

    # 2. Text Slice Variations
    if len(words) > 3:
        queries.append(" ".join(words[:3]))
        queries.append(" ".join(words[-3:]))
        if len(words) > 5:
            queries.append(" ".join(words[1:4]))

    # 3. Informational Pillar Templates
    pillars = []
    if is_ar:
        pillars = [
            # Academic/Science
            f"{cleaned} دراسة وبحث موثق ورق علمي pdf",
            f"{cleaned} دراسات أكاديمية ومقالات مرجعية",
            # News/Live
            f"{cleaned} آخر التطورات والأخبار العاجلة اليوم",
            f"{cleaned} بيان رسمي تصريح تحديث مباشر",
            # Data/Statistics
            f"{cleaned} إحصائيات بيانات أرقام تفصيلية جدول",
            f"{cleaned} تقرير شامل إحصاءات موثوقة",
            # Discussion/Forums
            f"{cleaned} آراء خبراء تحليل نقاش منتدى",
            # Authority / Wikis
            f"{cleaned} ويكيبيديا الموسوعة الحرة",
            f"{cleaned} مراجع مصادر موثوقة معلومات كاملة",
        ]
        if is_omni:
            pillars.extend([
                f"{cleaned} ملف مستند pdf دليل المستخدم",
                f"{cleaned} جدول مقارنة الفروقات بالتفصيل",
                f"{cleaned} الموقف الرسمي والتاريخ الفعلي",
                f"{cleaned} أرقام ونسب مئوية تقارير سنوية",
                f"{cleaned} كود برمجي شرح طريقة عمل تطبيق",
                f"{cleaned} مراجعة شاملة عيوب ومميزات"
            ])
    else:
        # English pillars
        pillars = [
            # Academic/Science
            f"{cleaned} research paper study scholarly pdf",
            f"{cleaned} scientific review documentation article",
            # News/Live
            f"{cleaned} latest news updates breaking reports today",
            f"{cleaned} official statement press release live situation",
            # Data/Statistics
            f"{cleaned} statistics data facts tables figures sheet",
            f"{cleaned} metrics charts database overview analytics",
            # Discussion/Forums
            f"{cleaned} reddit discussion quora community reviews",
            # Authority / Wikis
            f"{cleaned} wikipedia article encyclopedia entries",
            f"{cleaned} official documentation best practices reference",
        ]
        if is_omni:
            pillars.extend([
                f"{cleaned} filetype:pdf official report download",
                f"{cleaned} comprehensive comparison vs features review",
                f"{cleaned} timeline history origin background data",
                f"{cleaned} annual report percentage facts review",
                f"{cleaned} source code github implementation example",
                f"{cleaned} pros and cons critical analysis"
            ])

    queries.extend(pillars)

    # 4. Specific Site Filter Queries (Forces authority-level extraction)
    authority_sites = [
        "wikipedia.org", "reuters.com", "github.com", 
        "arxiv.org", "bloomberg.com", "nature.com"
    ]
    for site in authority_sites:
        queries.append(f"{cleaned} site:{site}")

    # Deduplicate and normalize
    unique_queries = []
    seen = set()
    for q in queries:
        q_norm = q.strip().lower()
        if q_norm and q_norm not in seen:
            seen.add(q_norm)
            unique_queries.append(q)
            
    # Force query expansion up to 34 queries in Omni, 24 in standard
    max_queries = 34 if is_omni else 24
    return unique_queries[:max_queries]

def get_domain_name(url):
    try:
        parsed = urlparse(url)
        domain = parsed.netloc
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except:
        return ""

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
]

def scrape_page_content(url, timeout=2.0):
    """
    Crawls and scrapes text content of a webpage with optimized performance.
    """
    if not url or not url.startswith("http"):
        return ""
    try:
        headers = {
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        res = requests.get(url, headers=headers, timeout=timeout)
        if res.status_code == 200:
            content_type = res.headers.get('content-type', '').lower()
            if 'text/html' not in content_type:
                return ""
                
            soup = BeautifulSoup(res.text, 'html.parser')
            # Remove styling, scripts, ads, and footers
            for element in soup(["script", "style", "nav", "header", "footer", "form", "aside", "iframe", "noscript"]):
                element.decompose()
                
            text = soup.get_text(separator=' ')
            text = re.sub(r'\s+', ' ', text).strip()
            # Return first 3500 characters of high-quality page text
            return text[:3500]
    except:
        pass
    return ""


def run_text_query(query, limit):
    results = []
    # Dynamic random delay to dodge DDG rate limits (50ms - 150ms)
    time.sleep(random.uniform(0.05, 0.15))
    
    try:
        with DDGS() as ddgs:
            # Fetch organic results
            organic = list(ddgs.text(query, max_results=limit))
            for item in organic:
                link = item.get('href', '')
                if not link:
                    continue
                results.append({
                    'title': item.get('title', ''),
                    'link': link,
                    'snippet': item.get('body', ''),
                    'source': 'ddg_text'
                })
    except Exception as e:
        sys.stderr.write(f"Error in DDGS Text Search for '{query}': {str(e)}\n")
        
    try:
        with DDGS() as ddgs:
            # Fetch news results if any
            news = list(ddgs.news(query, max_results=min(15, limit)))
            for item in news:
                link = item.get('url', '')
                if not link:
                    continue
                results.append({
                    'title': item.get('title', ''),
                    'link': link,
                    'snippet': item.get('body', ''),
                    'source': 'ddg_news'
                })
    except Exception:
        pass
        
    return results

def run_image_query(query, limit):
    images = []
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(query, max_results=limit))
            for item in results:
                img_url = item.get('image', '')
                if not img_url:
                    continue
                images.append({
                    'title': item.get('title', ''),
                    'imageUrl': img_url,
                    'thumbnailUrl': item.get('thumbnail', ''),
                    'source': item.get('source', ''),
                    'width': item.get('width', 0),
                    'height': item.get('height', 0)
                })
    except Exception as e:
        sys.stderr.write(f"Error in DDGS Image Search for '{query}': {str(e)}\n")
    return images

def score_and_rank_organic(results, query_keywords):
    scored = []
    for item in results:
        link = item['link']
        title = item['title'].lower()
        snippet = item['snippet'].lower()
        domain = get_domain_name(link)
        
        # Base score
        score = 100
        
        # Filter blocked domains
        if any(bd in domain for bd in BLOCKED_DOMAINS):
            score -= 150
            
        # Keyword matching boost
        for kw in query_keywords:
            if kw in title:
                score += 15
            if kw in snippet:
                score += 8
                
        # Domain authority boosting
        if any(td in domain for td in TRUSTED_DOMAINS):
            score += 50
            
        # Recency indicators in snippets
        recency = ["hours ago", "ساعة", "دقائق", "minutes ago", "today", "اليوم", "أمس", "yesterday", "2026", "2025"]
        if any(r in snippet for r in recency):
            score += 25
            
        item['domain'] = domain
        item['score'] = score
        scored.append(item)
        
    # Sort by score descending
    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored

def main():
    parser = argparse.ArgumentParser(description="DuckDuckGo Search engine helper")
    parser.add_argument("--query", type=str, required=True, help="Main search query")
    parser.add_argument("--image-queries", type=str, default="[]", help="JSON list of image queries")
    parser.add_argument("--omni", action="store_true", help="Flag if this is Apex Omni / ReSearch mode")
    parser.add_argument("--limit", type=int, default=115, help="Limit organic results returned")
    args = parser.parse_args()
    
    # 1. Parse image queries
    try:
        img_queries = json.loads(args.image_queries)
    except:
        img_queries = []
        
    # Determine search scale
    is_omni = args.omni
    limit_per_query = 65 if is_omni else 55
    
    # Generate search variations
    sub_queries = generate_sub_queries(args.query, is_omni)
    
    # 2. Run text searches in parallel
    all_raw_organic = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(run_text_query, sq, limit_per_query): sq for sq in sub_queries}
        for future in concurrent.futures.as_completed(futures):
            all_raw_organic.extend(future.result())
            
    # 3. Score and rank organic results
    keywords = [w.lower() for w in clean_text_query(args.query).split() if len(w) > 2]
    ranked_organic = score_and_rank_organic(all_raw_organic, keywords)
    
    # Domain deduplication: Keep at most 2 results from the same domain
    seen_domains = {}
    deduplicated = []
    seen_links = set()
    
    for item in ranked_organic:
        link = item['link']
        if link in seen_links:
            continue
        seen_links.add(link)
        
        domain = item['domain']
        count = seen_domains.get(domain, 0)
        if count >= 2:
            continue
        seen_domains[domain] = count + 1
        deduplicated.append(item)
        
    # Determine the slice size: Omni wants over 100 sources (e.g. 150), Standard wants over 100 (e.g. 120)
    final_limit = 150 if is_omni else max(120, args.limit)
    final_organic = deduplicated[:final_limit]
    
    # 4. Crawl HTML page content (deep crawling) for top pages
    # We scrape the top 20 pages for Omni, and top 12 pages for standard search
    scrape_count = 20 if is_omni else 12
    scrape_targets = final_organic[:scrape_count]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        scrape_futures = {executor.submit(scrape_page_content, item['link']): item for item in scrape_targets}
        for future in concurrent.futures.as_completed(scrape_futures):
            item = scrape_futures[future]
            item['page_content'] = future.result()
            
    # Fill in empty page_content for other items
    for item in final_organic:
        if 'page_content' not in item:
            item['page_content'] = ""
            
    # 5. Run image searches in parallel
    all_raw_images = []
    if img_queries:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            img_futures = {executor.submit(run_image_query, iq, 15): iq for iq in img_queries}
            for future in concurrent.futures.as_completed(img_futures):
                all_raw_images.extend(future.result())
    else:
        # Fallback to fetching images for the main query
        all_raw_images = run_image_query(args.query, 15)
        
    # Output the final result as JSON
    output = {
        "organic": final_organic,
        "images": all_raw_images
    }
    
    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    main()
