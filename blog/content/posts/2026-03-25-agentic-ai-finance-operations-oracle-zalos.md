---
title: 'Oracle Fusion Agentic Apps vs Zalos: Which Fits Your Stack'
date: 2026-03-25 19:18:23+00:00
slug: agentic-ai-finance-operations-oracle-zalos
description: 'Oracle launched 22 Fusion Agentic Apps on March 24, 2026. Zalos raised $3.6M the same day. CFOs: here''s which autonomous finance path fits your ERP stack.'
executive_summary: "Oracle launched 22 agentic finance applications on March 24, 2026, offering near-zero incremental cost for existing Fusion Cloud customers but requiring a multi-million-dollar platform migration for everyone else. San Francisco startup Zalos closed a $3.6M seed round the same day with screen-trained agents that operate any existing ERP without migration or APIs, attracting personal investment from FedEx's CFO. These solutions target entirely different buyers: Oracle serves large enterprises already committed to its cloud suite, while Zalos addresses midmarket firms running fragmented legacy stacks who cannot justify ripping out functional systems for AI features alone."
keywords:
- Oracle Fusion agentic applications vs Zalos
- agentic AI finance deployment
- ERP automation without migration
- screen-trained finance agents
- enterprise finance workflow automation
- Oracle Action Unit pricing
author: "alex-park"
tags:
- AI Strategy
- Oracle
- Implementation
- Operations & Finance
- Operations & Finance
categories:
- Implementation
- AI Strategy
- Implementation
cover:
  image: https://uzgywmjexciknmpbebqs.supabase.co/storage/v1/object/public/covers/agentic-ai-finance-operations-oracle-zalos.png?v=gemini-v1
  alt: 'TECHNOLOGY PROFILE: Oracle Fusion Agentic Apps vs Zalos: Which Fits Your Stack'
  caption: ''
  generation: gemini-v1
schema_type: Article
has_faq: true
faq_pairs:
- q: Do Oracle's Fusion Agentic Applications work if I'm not already on Oracle Cloud?
  a: No. Oracle's 22 Fusion Agentic Applications require Oracle Fusion Cloud as the underlying platform. Organizations running SAP, NetSuite, Sage, or any on-premise ERP must complete a full platform migration (costing $800,000 to $30-plus million) before accessing any agentic feature.
- q: How does Zalos train its agents without API access to my ERP?
  a: Zalos uses screen recordings of human finance workflows as training input. A staff accountant records a task and the platform converts that recording into an executable agent that replicates the same sequence at machine speed, logging in with credentials like a human user.
- q: What happens to Zalos-trained agents if the ERP vendor updates its interface?
  a: Screen-trained agents are brittle when UI changes occur; a NetSuite or Sage interface update can break a trained workflow. As of March 2026, Zalos has not publicly disclosed how its platform detects and recovers from interface changes at enterprise scale.
- q: What is Oracle's Action Unit pricing model for agentic applications?
  a: Oracle prices agentic application consumption in Action Units, each worth approximately one cent, replacing the per-user SaaS seat model. Organizations pay for autonomous work executed rather than licensed users. Real-world cost data from early adopters is expected in Q3 2026.
- q: Which agentic finance approach is better for a $500M company running a mixed ERP stack?
  a: For mid-market companies running mixed stacks (NetSuite, SAP, and separate banking platforms), Zalos is the more practical near-term option. It avoids a multi-million-dollar migration and deploys in weeks. Oracle only becomes viable if the organization is already planning ERP consolidation onto Fusion Cloud.
ShowToc: true
TocOpen: false
draft: false
content_type: technology_profile
image: https://uzgywmjexciknmpbebqs.supabase.co/storage/v1/object/public/covers/agentic-ai-finance-operations-oracle-zalos.png?v=gemini-v1
image_alt: 'TECHNOLOGY PROFILE: Oracle Fusion Agentic Apps vs Zalos: Which Fits Your Stack'
visuals_generation: v2
---
Oracle launched 22 Fusion Agentic Applications on March 24, 2026, betting that enterprises already running its cloud ERP will activate autonomous finance workflows without replacing anything. That same day, San Francisco startup Zalos closed a $3.6M seed round to do the opposite: send screen-trained agents into whatever ERP you already own, no migration required.

Two strategies. Two cost profiles. One decision that could shape your finance operations for the next decade. Here is what the evidence shows, and where each approach breaks.

## What Each Approach Actually Does

Oracle's Fusion Agentic Applications and Zalos's screen-trained agents represent two structurally different bets on how autonomous finance gets deployed. Oracle embeds agents natively inside its cloud suite, eliminating integration layers entirely. Zalos converts recorded human workflows into executable agents that operate any existing ERP interface: no API, no migration, no rearchitecting required.

Oracle's Fusion Agentic Applications sit natively inside Oracle Cloud Infrastructure. They share data, context, and permissions with Oracle Financials, HR, and Supply Chain without any integration layer. The 22 applications cover accounts payable matching, financial close automation, cash flow forecasting, and supplier risk monitoring, among others, according to Oracle's March 2026 announcement. Oracle prices these on "Action Units," a consumption metric worth approximately one cent each, replacing the per-user SaaS model. The critical dependency: your organization must already run Oracle Fusion Cloud. If you are on SAP, NetSuite, or a legacy on-premise system, none of this applies.

Zalos works differently. Founders William Fairbairn and Hung Hoang built a platform that converts screen recordings of human finance workflows into executable agents. Those agents log into your existing system, navigate the interface, enter data, and perform reconciliations the same way a staff accountant would, according to SiliconAngle's March 24, 2026 reporting. Current ERP support covers NetSuite, Sage, and SAP S/4HANA. No API integration. No data migration. The agent learns from recorded human behavior, then replicates it at machine speed.

FedEx CFO Mike Lenz invested in Zalos personally. That signals that a finance executive running one of the world's most complex logistics operations found something operationally credible in the approach, not a marketing detail.

{{< stat-box number="$3.6M" label="Zalos seed round, led by 14 Peaks with participation from Cohen Circle and 20VC" source="GlobeNewswire, March 2026" >}}

## Oracle vs. Zalos Cost Structures Serve Entirely Different Organizations

Oracle's implementation costs depend almost entirely on how much of the Fusion suite you already run. According to ERP Research's 2026 cost breakdown, a financials-only Oracle Cloud implementation for 200 users runs $800,000 to $1.8M in systems integrator fees alone, with a six-to-nine-month timeline. A full suite deployment across 1,000-plus users in multiple countries runs $10M to $30M-plus over 18 to 48 months. If you already run Oracle Fusion Cloud, activating the Agentic Applications costs incremental Action Unit consumption, a far smaller number. If you are not on Oracle Cloud, the cost conversation changes entirely: you are evaluating a platform migration, not an AI add-on.

Zalos publishes no public pricing. Based on its seed-stage positioning and target market of midmarket and enterprise finance teams running fragmented stacks, its costs sit below the threshold of a major ERP project. The company's pitch is explicitly about avoiding migration cost and disruption.

The honest framing for a CFO: Oracle's agentic layer is nearly free if you are already a Fusion customer. It is prohibitively expensive if you are not. Zalos costs less to start but is an early-stage vendor with a $3.6M runway and no published independent performance benchmarks at enterprise scale.

> **Key Takeaway:** If your organization already runs Oracle Fusion Cloud, the incremental cost to activate agentic finance workflows is low and the integration risk is minimal. If you run SAP, NetSuite, Sage, or any legacy on-premise system, Oracle's agentic suite requires a platform migration that reframes the entire business case. Zalos addresses exactly that gap, but carries early-stage vendor risk that Oracle does not.

## Three Ways the Tech Press Gets This Comparison Wrong

The tech press has framed this as "Oracle vs. startups," a battle between incumbent scale and scrappy innovation. That framing misleads the decision. These two products do not compete for the same customer in the same situation.

A second misuse: organizations benchmark ROI on automation features without accounting for the cost base required to access them. Oracle's Fusion Agentic Applications will generate compelling ROI stories. Those stories will come from organizations that absorbed a multi-million-dollar Oracle Cloud implementation years earlier. That sunk cost is invisible in the ROI calculation presented to the board.

A third misuse: treating Zalos's screen-recording approach as a workaround or second-best option. The model carries a genuine architectural advantage for fragmented stacks. Finance operations at most midmarket companies run across three to five disconnected systems. An overlay agent that operates across all of them simultaneously, without requiring each system to expose an API, solves a real problem that native ERP agents cannot. See our analysis of why [agentic AI regulatory compliance in fintech creates structural demand for exactly this kind of cross-system agent](/posts/2026-03-23-agentic-ai-regulatory-gap-fintech/).

## What Neither Vendor Has Proven at Scale

Oracle has not demonstrated Fusion Agentic Applications operating across multi-entity, multi-currency environments at the level its "full process automation" language implies. CIO.com quoted analyst commentary calling that claim a "lofty endeavor" given the complexity of multi-step business processes. The 22 applications launched March 24, 2026 are available; they are not yet tested at the scale of a Fortune 500 close cycle.

Zalos has not published third-party benchmarks on error rates, exception handling, or performance degradation when source ERP interfaces change after an agent has been trained. Screen-trained agents break when UI changes; a vendor update to NetSuite's interface can invalidate a trained workflow. Zalos has not publicly addressed how its platform handles this at scale.

Neither vendor accounts for change management cost. Finance teams that have run manual reconciliation processes for years require retraining, role restructuring, and new exception-handling protocols. That cost is real, and it appears in neither vendor's ROI modeling.

Regulatory exposure is a third unresolved variable. Autonomous agents executing financial transactions (posting payments, matching invoices, releasing vendor credits) operate in an environment that has not established clear audit trail standards for agentic decision-making. As covered in our analysis of [explainable AI as a capital problem](/posts/explainable-ai-capital-problem-fca/), the FCA and peer regulators are actively developing frameworks that will govern exactly the autonomous financial execution both Oracle and Zalos are targeting. Organizations deploying either solution before those frameworks stabilize carry compliance exposure their current risk models may not capture.

{{< stat-box number="$800K–$30M+" label="Oracle Fusion Cloud implementation cost range by scope and company size" source="ERP Research, 2026" >}}

## Where Each Approach Breaks in Real Organizations

Oracle Fusion breaks for organizations mid-migration. Companies 18 months into an SAP S/4HANA implementation cannot pivot to Oracle Cloud to access agentic finance features. The switching cost is prohibitive. They will need to evaluate SAP's own agent roadmap or a Zalos-style overlay.

Oracle also breaks for organizations carrying significant customization debt. Heavily customized Oracle EBS on-premise deployments do not map cleanly to Oracle Fusion Cloud. The agentic applications assume a relatively clean Fusion Cloud configuration. Organizations with years of bespoke workflow customization face rework before agents can operate reliably.

Zalos breaks for organizations with strict data residency requirements. A screen-recording agent that captures finance workflow video and converts it to executable code raises data handling questions that legal and compliance teams will flag. SOC 2 Part II certification addresses security hygiene but not every jurisdiction's data residency rule.

Zalos also breaks under complex exception logic. The platform excels at high-volume, rule-consistent tasks: invoice matching, payment posting, and standard reconciliations. When exceptions require judgment (a disputed vendor invoice, a revenue recognition edge case, a multi-party netting arrangement), the agent escalates to a human. That is correct behavior. Organizations expecting straight-through processing on complex workflows will be disappointed.

Zalos carries concentration risk as a seed-stage company. A $3.6M round funds roughly 18 to 24 months of operations. CFOs approving vendor relationships for core finance processes need an answer to this question: what happens to trained agents and workflow data if Zalos raises no Series A?

## How Each Approach Performs Across Three Core Finance Functions

**Accounts Payable:** Oracle's AP automation agent handles invoice ingestion, three-way matching, and payment scheduling natively within Fusion. For an Oracle Cloud customer processing 50,000-plus invoices monthly, this is a credible straight-through processing play. Zalos targets the same workflow from the interface layer; it can operate across the vendor portal, the ERP, and the bank's payment platform simultaneously. For a finance team running AP across NetSuite and a separate banking platform with no integration, Zalos's cross-system capability is the more practical option. For a detailed look at how AI fraud detection interacts with AP automation, see [our analysis of the AI fraud detection arms race](/posts/ai-fraud-detection-roi-arms-race/).

**Financial Close:** Month-end close involves reconciliation across multiple systems, management reporting compilation, and intercompany elimination, exactly the kind of multi-system, repetitive task where both vendors claim advantage. Oracle's close automation works best when the general ledger, sub-ledgers, and consolidation tool all live inside Fusion. Zalos's agents can stitch together a close process running across a legacy ERP and Excel-based management reporting. Neither eliminates the judgment calls that consume senior accountants during close. Both reduce the manual data transfer that consumes junior staff.

**Cash Flow Forecasting:** Oracle's forecasting agent pulls from receivables, payables, and treasury data inside Fusion and generates scenario-based projections. This is genuinely useful if your AR, AP, and treasury all live in Oracle. Zalos has not publicly demonstrated a forecasting agent. Its current use cases focus on transaction-level automation rather than predictive analytics. On this dimension, Oracle holds a clear advantage for its installed base.

## The CFO's Decision Framework: Oracle Works Here, Zalos Works There

Oracle's Fusion Agentic Applications work for organizations that made the Oracle Cloud commitment three to five years ago and now want additional ROI from that infrastructure. The incremental cost is manageable. The integration risk is low. The ROI case is direct: measure invoice processing time before and after, measure close cycle reduction, calculate labor rationalization.

Oracle does not work as a standalone reason to migrate from another ERP. If you run SAP and are evaluating Oracle Cloud specifically for its agentic capabilities, the migration cost and risk outweigh the automation benefit available from a well-configured Zalos deployment or from SAP's own BTP-based agent framework.

Zalos works for midmarket and lower-enterprise organizations running fragmented stacks where ERP consolidation cannot be justified in the next 24 months. The screen-training approach is pragmatic and the cross-system capability is real. The risk is vendor maturity, not product concept.

Zalos does not work as a permanent solution for organizations that need enterprise-grade SLAs, complex exception handling, or multi-jurisdiction data compliance, without significant additional contractual protections that a seed-stage vendor may not yet be positioned to provide.

The organizations watching this space most carefully are mid-tier enterprises, $200M to $2B in revenue, running mixed ERP stacks that cannot absorb a platform migration but need automation to scale finance operations without proportional headcount growth. Both vendors are targeting that buyer. Oracle arrives with brand credibility and an enormous installed base. Zalos arrives with a faster deployment path and no migration requirement. The CFO's job is to match the risk profile of the vendor to the risk tolerance of the organization. Neither vendor has yet produced the independent, multi-year performance data that makes that decision obvious.

Watch Oracle's Action Unit pricing data from early adopters in Q3 2026. Watch Zalos's Series A timeline and whether enterprise reference customers emerge before that runway closes. Those two data points will tell you more than any analyst report.

For organizations ready to move from evaluation to deployment, [our implementation guide on deploying AI fraud detection covers the go/no-go checkpoints](/posts/ai-fraud-detection-deployment-implementation/) that apply equally to agentic finance workflow decisions.

## Sources

1. oracle.com. https://www.oracle.com/news/announcement/oracle-introduces-fusion-agentic-applications-2026-03-24/
2. oracle.com. https://www.oracle.com/applications/fusion-ai/how-to-create-ai-agent/
3. cio.com. https://www.cio.com/article/4149291/oracle-bets-on-agentic-apps-in-fusion-suite-to-fully-automate-business-processes.html
4. siliconangle.com. https://siliconangle.com/2026/03/24/zalos-raises-3-6m-develop-erp-computer-agents-operate-finance-systems-like-humans/
5. globenewswire.com. https://www.globenewswire.com/news-release/2026/03/24/3261268/0/en/Zalos-raises-3-6M-to-build-Computer-Agents-that-operate-finance-systems-the-way-humans-do/
6. drj.com. https://drj.com/industry_news/zalos-raises-3-6m-to-build-computer-agents-that-operate-finance-systems-the-way-humans-do/
7. erpresearch.com. https://www.erpresearch.com/blog/en-us/blog/oracle-erp-cloud-implementation-cost-breakdown
8. pymnts.com. https://www.pymnts.com/artificial-intelligence-2/2026/oracle-launches-tools-to-help-enterprises-deploy-ai-agents/
