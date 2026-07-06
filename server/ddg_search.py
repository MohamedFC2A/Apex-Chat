import sys
import json
import argparse
import re
import concurrent.futures
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

# Blocked and trusted domains for organic search and images
BLOCKED_DOMAINS = [
    "doubleclick.net", "adservice.google", "adnxs.com", "outbrain.com", 
    "taboola.com", "criteo.com", "pinterest.com"
]

TRUSTED_DOMAINS = [
    "wikipedia.org", "britannica.com", "github.com", "stackoverflow.com",
    "w3schools.com", "mozilla.org", "arxiv.org", "pubmed.ncbi.nlm.nih.gov",
    "nature.com", "science.org", "nasa.gov", "reuters.com", "bbc.com",
    "aljazeera.net", "alarabiya.net", "medium.com", "dev.to", "npmjs.com"
]

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

def generate_sub_queries(query, is_omni):
    # Generates multiple queries to fetch a wide range of documents
    queries = [query]
    cleaned = clean_text_query(query)
    
    if cleaned != query and len(cleaned) > 2:
        queries.append(cleaned)
        
    words = cleaned.split()
    if len(words) > 3:
        # Shorter search query focusing on main keywords
        queries.append(" ".join(words[:3]))
        # Search query focusing on ending keywords
        queries.append(" ".join(words[-3:]))
        
    # Language-aware expansion
    is_arabic = bool(re.search(r'[\u0600-\u06FF]', query))
    
    if is_omni:
        # For Omni / ReSearch mode, we want broad coverage (up to 5-6 queries)
        if is_arabic:
            queries.append(f"{cleaned} تفاصيل")
            queries.append(f"{cleaned} مصادر ومراجع")
            queries.append(f"{cleaned} آخر الأخبار")
        else:
            queries.append(f"{cleaned} deep dive")
            queries.append(f"{cleaned} official documentation")
            queries.append(f"{cleaned} latest news updates")
            queries.append(f"{cleaned} analysis research")
    else:
        # Standard mode: 2-3 queries
        if is_arabic:
            queries.append(f"{cleaned} أخبار")
        else:
            queries.append(f"{cleaned} news")
            
    # Deduplicate and limit
    unique_queries = []
    seen = set()
    for q in queries:
        q_norm = q.strip().lower()
        if q_norm and q_norm not in seen:
            seen.add(q_norm)
            unique_queries.append(q)
            
    max_queries = 6 if is_omni else 3
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

def scrape_page_content(url, timeout=2.5):
    """
    Crawls and scrapes the actual text content of a webpage.
    Removes boilerplate elements and returns the first 1500 chars.
    """
    if not url or not url.startswith("http"):
        return ""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        res = requests.get(url, headers=headers, timeout=timeout)
        if res.status_code == 200:
            content_type = res.headers.get('content-type', '').lower()
            if 'text/html' not in content_type:
                return "" # skip pdfs/images
                
            soup = BeautifulSoup(res.text, 'html.parser')
            # Remove scripts, styles, forms, navigation, header, footer, footer ads
            for element in soup(["script", "style", "nav", "header", "footer", "form", "aside"]):
                element.decompose()
                
            text = soup.get_text(separator=' ')
            text = re.sub(r'\s+', ' ', text).strip()
            # Return first 1500 characters of clean content
            return text[:1500]
    except Exception:
        pass
    return ""

def run_text_query(query, limit):
    results = []
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
        
    # Determine the slice size: Omni wants over 100 sources (e.g. 130), Standard wants over 100 (e.g. 115)
    final_limit = 130 if is_omni else args.limit
    final_organic = deduplicated[:final_limit]
    
    # 4. Crawl HTML page content (deep crawling) for top pages
    # We scrape the top 12 pages for Omni, and top 6 pages for standard search
    scrape_count = 15 if is_omni else 6
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
