# How-To Guide — Content Type Specification

## Identity
- **Funnel position:** Bottom of Funnel (implementation, conversion)
- **Schema type:** HowTo
- **Word count:** 1,500-2,500 words
- **Reading time:** 8-12 minutes
- **Publishing frequency:** 3x/week (Wednesday+Friday+Sunday evenings)
- **Purpose:** Step-by-step implementation playbooks for readers ready to act

## Target Personas
- **Primary:** The Operator (VP Ops, Supply Chain Director, Plant Manager)
- **Secondary:** The Tech Lead (CTO, VP Engineering implementing the solution)
- **Tertiary:** The Finance Lead (CFO who needs the cost section)

## H1 Format
`How to [Action] [AI Technology] in [Context]: [Number]-Step Guide`

Examples:
- "How to Deploy AI Agents for Accounts Payable: 6-Step Playbook"
- "How to Set Up Predictive Maintenance AI in a Manufacturing Plant: 8 Steps"
- "How to Implement AI-Powered Demand Forecasting: 5-Step Guide for Supply Chain Directors"

## Mandatory Sections (in order)

### 1. Lede
Outcome promise + timeline: "Deploy [X] in [Y weeks] and achieve [Z outcome]."

### 2. Prerequisites (3-5 items)
Each prerequisite has: what it is, why it matters, and how to check if you have it.
Example: "Clean vendor master data: if your vendor database has >5% duplicate entries, the AI agent will create duplicate payments. Run a dedup audit first."

### 3. Step-by-Step (5-8 numbered steps)
Each step formatted as: `## Step N: [Action Verb] [Object]`
Each step contains:
- **What to do** (specific actions, tools, commands)
- **Why it matters** (what breaks if you skip this)
- **Watch for** (common mistakes at this step)
- **Time estimate** (how long this step takes)
- **Who does it** (role responsible)

### 4. Common Failure Points (3+ named failures)
Each failure has: what goes wrong, early warning signs, and how to recover.

### 5. Success Metrics
Primary KPI + 2-3 secondary metrics. Leading vs. lagging indicators. How to measure at 30/60/90 days.

### 6. Go/No-Go Checklist
3-4 explicit decision criteria: "Proceed if X, Y, Z are true. Stop and reassess if A or B."

### 7. What This Costs
Three categories: licensing/subscription, implementation/consulting, ongoing maintenance. Ranges are fine if exact figures aren't available.

## Visual Requirements
- **Process Flow diagram:** MANDATORY (placed at top of Steps section)
- **Comparison table:** Include if comparing vendors/tools
- **Cost bar chart:** Include in the "What This Costs" section
- **Verdict card:** MANDATORY (in Go/No-Go section)
- **Cover image:** Generated SVG, how_to template (step previews)

## Schema Rules
- H2 headings MUST be numbered steps: "## Step 1: Define Agent Scope"
- The frontend extracts these into HowToStep structured data automatically
- has_faq should be FALSE for how-to articles (use HowTo schema, not FAQPage)
