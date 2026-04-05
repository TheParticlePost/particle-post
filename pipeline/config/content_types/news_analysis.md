# News Analysis — Content Type Specification

## Identity
- **Funnel position:** Top of Funnel (awareness, traffic acquisition)
- **Schema type:** NewsArticle
- **Word count:** 600-1,000 words
- **Reading time:** 3-5 minutes
- **Publishing frequency:** Daily (every morning slot)
- **Purpose:** Today's/yesterday's breaking AI developments with clear business implications

## Target Personas
- **Primary:** The Strategist (CEO, COO, Board members)
- **Secondary:** The Compliance Lead (CRO, GRC Director)
- **Tertiary:** The Finance Lead (CFO, Controller)

## H1 Format
`[Event/Company/Regulation]: What [Persona] Should Do Now`

Examples:
- "EU AI Act Phase 2: What Compliance Officers Must Do Before July"
- "NVIDIA's New Chip Pricing: What COOs Should Know Before Budget Season"
- "Google Kills Bard Brand: What Enterprise AI Teams Should Reconsider"

Anti-patterns (REJECT):
- "AI is Transforming Finance" (no event, no action)
- "The Future of AI in Business" (no urgency, no persona)
- "Important Update on AI Regulations" (vague, no specificity)

## Mandatory Sections (in order)

### 1. Lede (first 2 sentences)
Must name a SPECIFIC company, regulation, or data point. Must create urgency.
- Good: "The European Commission fined Meta 1.3B euros on Tuesday for AI training data violations, the largest penalty under the EU AI Act to date."
- Bad: "Artificial intelligence regulations continue to evolve across the globe."

### 2. What Happened (2-3 paragraphs)
Factual summary. Name all relevant parties. Include dates, amounts, and scope. Link to primary sources. No opinion in this section.

### 3. Why It Matters (2-3 paragraphs)
Implications for EACH target persona. Use section headers or bold text to call out specific roles:
- **For CEOs/COOs:** [strategic implication]
- **For Compliance:** [regulatory implication]
- **For Finance:** [cost/budget implication]

### 4. What To Do Next (2-3 paragraphs)
Specific, actionable steps. Not "consider the implications" but "schedule a meeting with your DPO by Friday" or "audit your training data pipeline for these 3 compliance gaps."

### 5. Bottom Line
One-paragraph verdict in bold. Direct. No hedging. Example:
> **Bottom Line:** This ruling affects any company training models on EU citizen data. If you haven't mapped your training data provenance by Q3, you're operating on borrowed time.

## Visual Requirements
- **Stat-box:** Minimum 1 (the headline number from the news)
- **Bar chart:** Include if comparing data points (e.g., fine amounts across companies)
- **Cover image:** Generated SVG, news_analysis template

## Internal Links
- Minimum 1 link to a related Deep Dive or Case Study
- Anchor text must be topic-specific, never "read more"

## Quality Gates
- Every claim attributed to a named source
- At least 2 external source URLs
- No em-dashes
- No AI-tell phrases
- H1 under 70 characters
- At least 1 question-format H2 for GSO
