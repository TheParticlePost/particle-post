from crewai import Task, Agent


def build_seo_gso_task(agent: Agent, writing_task: Task, selection_task: Task) -> Task:
    """
    SEO/GSO Specialist article production task.

    Context:
      - writing_task: Writer's V1 draft
      - selection_task: topic JSON (funnel_type, source_urls, topic)

    Output: [RESTRUCTURED ARTICLE] block + 14-field JSON package.
    The Formatter reads both; the Editor polishes the restructured article.
    """
    return Task(
        description=(
            "You have received the Writer's V1 article draft and the topic selection context.\n\n"

            "═══ PART 1: RESTRUCTURE FOR GSO ═══\n\n"

            "Read the Writer's V1 draft from the writing_task context.\n"
            "Make SURGICAL additions to optimize it for AI engine extraction. "
            "Do NOT rewrite the article — preserve all facts, quotes, and statistics.\n\n"

            "REQUIRED CHANGES:\n"
            "1. ANSWER-FIRST LEDE: Insert a 40-60 word declarative answer paragraph "
            "immediately after the FIRST H2 heading (## heading). This paragraph should "
            "directly answer the article's core question. Do not start with 'In this article' "
            "or 'This article explains' — state the answer immediately.\n\n"

            "2. FAQ SECTION: Append a '## Frequently Asked Questions' section at the very end "
            "of the article (before ## Sources if present). Include 3-5 Q+A pairs formatted as:\n"
            "### Q: [Question]\n"
            "[Answer — self-contained, under 50 words]\n\n"

            "3. SUB-QUERY COVERAGE: Identify 2-4 sub-questions an AI assistant would ask when "
            "researching this topic. For each sub-query not already addressed in the article, "
            "add a short paragraph (3-4 sentences) in the most relevant section.\n\n"

            "═══ PART 2: SEO PACKAGE ═══\n\n"

            "After the restructured article, output the SEO package as a clean JSON object "
            "(no code fences, no prose). Use the selection_task context to get the topic, "
            "funnel type, and source URLs. Check the post_index in your context for "
            "internal_link_targets — use EXACT slugs from the index, never invent them.\n\n"

            "Required fields (14 total):\n"
            "{\n"
            '  "primary_keyword": "2-5 word high-intent keyword",\n'
            '  "secondary_keywords": ["keyword 1", "...", "keyword 5"],\n'
            '  "meta_title": "under 60 chars — primary keyword in first 5 words",\n'
            '  "meta_description": "under 155 chars — keyword + data point + benefit",\n'
            '  "slug": "3-6-word-keyword-rich-slug",\n'
            '  "tags": ["Tag1", "Tag2", "Tag3"],\n'
            '  "categories": ["Primary Category"],\n'
            '  "ai_sub_queries": ["sub-question 1", "sub-question 2", "sub-question 3"],\n'
            '  "search_intent": "informational | commercial | transactional | navigational",\n'
            '  "answer_first_lede": "the exact 40-60 word paragraph you inserted after the first H2",\n'
            '  "faq_questions": [\n'
            '    {"q": "Question 1?", "a": "Direct answer ≤ 50 words."},\n'
            '    {"q": "Question 2?", "a": "Direct answer ≤ 50 words."},\n'
            '    {"q": "Question 3?", "a": "Direct answer ≤ 50 words."}\n'
            '  ],\n'
            '  "internal_link_targets": ["existing-slug-1", "existing-slug-2"],\n'
            '  "schema_type": "FAQPage | Article | HowTo | NewsArticle",\n'
            '  "has_faq": true\n'
            "}\n\n"

            "RULES:\n"
            "- has_faq must be true if faq_questions has ≥ 3 items\n"
            "- schema_type must be 'FAQPage' whenever has_faq is true\n"
            "- internal_link_targets must use slugs from the post_index — use [] if no relevant matches\n"
            "- meta_title MUST contain at least one primary SEO keyword: "
            "'AI in finance', 'artificial intelligence banking', 'fintech AI', 'agentic AI finance', "
            "'AI risk management finance', 'machine learning financial services', "
            "'AI investment strategy', 'AI trading algorithms'. This is MANDATORY.\n"
            "- meta_title must be under 70 characters\n"
            "- NEVER use em-dash characters (--) anywhere in the restructured article. Replace with commas, colons, or periods.\n"
            "- Output ONLY the [RESTRUCTURED ARTICLE] block then immediately the JSON -- no other text\n\n"

            "═══ EXACT OUTPUT FORMAT ═══\n\n"
            "[RESTRUCTURED ARTICLE]\n"
            "(full restructured article — all sections, all paragraphs)\n"
            "[END RESTRUCTURED ARTICLE]\n"
            '{"primary_keyword": "...", ... }'
        ),
        expected_output=(
            "A [RESTRUCTURED ARTICLE]...[END RESTRUCTURED ARTICLE] block containing the full "
            "GSO-optimized article (with answer-first lede after first H2 and FAQ section at end), "
            "followed immediately by a 14-field JSON SEO package with no prose or code fences."
        ),
        agent=agent,
        context=[writing_task, selection_task],
    )
