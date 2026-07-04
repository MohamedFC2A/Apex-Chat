const fs = require('fs');
let content = fs.readFileSync('shared/pdf.ts', 'utf8');

// ── FIX 1: Arabic study-mode instructions (lines 741–792) ─────────────────────
// Remove pdf-plan block, change 35-55 → 12-18 sections, reduce paragraph length
const arOldMarker = 'قواعد إلزامية للإبداع، التخطيط المسبق، وتكثيف المحتوى ليصبح احترافيًا وخارقًا';
const arNewRules = `قواعد إلزامية لإنتاج مستند احترافي يناسب حد الـ tokens المتاح:
1. أخرج كتلة واحدة فقط باسم \\\`\\\`\\\`pdf-document وبداخلها JSON صالح فقط بدون أي نص خارجي.
2. نظّم المستند في **12 إلى 18 قسمًا** منطقيًا مرتبًا يغطي جوهر الموضوع:
   - مقدمة شاملة (heading + paragraph). - **بطاقات إحصاء** (stat-card) بـ 4 بطاقات بألوان مبدعة.
   - **خط زمني** (timeline) بـ 4-5 أحداث. - **رسم بياني SVG** (chart-svg) واحد أو اثنان.
   - **تخطيط عمودين** (two-column) لمقارنة رئيسية. - **جدول** (table) تفصيلي.
   - **قوائم مرقمة** (numbered-list) للخطوات. - **صندوق تمييز** (highlight-box).
   - **أسئلة وأجوبة** (qa) 2-3 أسئلة. - **callout** تحذيري أو معلوماتي.
   - **اقتباس** (quote) ملهم. - **خاتمة** (paragraph) موجزة وعملية.
3. اكتب كل فقرة بـ **60-100 كلمة** ركيزة. الجودة تفوق الكمية.
4. استخدم direction = "rtl" للمحتوى العربي.
5. اضبط theme = "\${request.theme || 'dark'}" و pageSize = "\${request.pageSize || 'a4'}" في JSON.
6. ميّز المصطلحات الهامة بـ ==نص==. كل section يحتوي id و type و content دائمًا.`;

if (content.includes(arOldMarker)) {
  const idx = content.indexOf(arOldMarker);
  // Find the end of this rule block (just before the examples section header)
  const examplesMarker = 'أمثلة JSON للأنواع الجديدة:';
  const examplesIdx = content.indexOf(examplesMarker, idx);
  if (examplesIdx !== -1) {
    content = content.slice(0, idx) + arNewRules + '\n\n' + content.slice(examplesIdx);
    console.log('✅ Arabic rules replaced');
  } else {
    console.log('❌ Examples marker not found');
  }
} else {
  console.log('❌ Arabic marker not found');
}

// ── FIX 2: English study-mode instructions ────────────────────────────────────
const enOldMarker = 'Mandatory rules for maximum creativity, density, and professional structure (designed to scale to 25-35 printed pages):';
const enNewRules = `Mandatory rules for producing a high-quality professional document within the available token budget:
1. Output exactly one \\\`\\\`\\\`pdf-document block with valid JSON only. No text outside the block.
2. Structure the document into **12 to 18 logical sections** covering the topic's core:
   - Comprehensive introduction (heading + paragraph). - **Stat cards** (stat-card) 4+ cards with diverse colors.
   - **Timeline** (timeline) 4-5 events. - **SVG chart** (chart-svg) 1-2 charts best-fit for data.
   - **Two-column** layout for one key comparison. - **Table** with real data rows/columns.
   - **Numbered list** (numbered-list) for steps. - **Highlight box** for critical insight.
   - **Q&A** (qa) 2-3 questions with detailed answers. - **Callout** (info or warning).
   - **Quote** (quote) one inspiring quote. - **Conclusion** (paragraph) concise and actionable.
3. Write each paragraph in **60-100 focused words**. Quality over quantity.
4. Use RTL direction for Arabic content.
5. Set theme = "\${request.theme || 'dark'}" and pageSize = "\${request.pageSize || 'a4'}" in JSON.
6. Highlight key terms using ==term==. Every section must include id, type, and content.`;

if (content.includes(enOldMarker)) {
  const idx = content.indexOf(enOldMarker);
  const examplesMarker = 'JSON examples for new section types:';
  const examplesIdx = content.indexOf(examplesMarker, idx);
  if (examplesIdx !== -1) {
    content = content.slice(0, idx) + enNewRules + '\n\n' + content.slice(examplesIdx);
    console.log('✅ English rules replaced');
  } else {
    console.log('❌ English examples marker not found');
  }
} else {
  console.log('❌ English marker not found');
}

fs.writeFileSync('shared/pdf.ts', content, 'utf8');
console.log('✅ File saved');
