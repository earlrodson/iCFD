# iCFD — Board of Governors Presentation
## Slide Content + Claude Code Generation Prompt

**Audience:** CFD Board of Governors  
**Target duration:** 25–35 minutes including demonstration and Q&A  
**Purpose:** Present the origin, current implementation, organizational value, architecture, cost model, roadmap, and mission of iCFD.

---

# PART I — SLIDE CONTENT

## 1. Title
# iCFD — Codex Defensoris
### A Digital Formation Platform for Catholic Faith Defenders

Presented by **Earlrodson Cariño**  
Software Architect / Engineering Leader  
Catholic Faith Defenders

**Visual:** iCFD logo/app branding.

---

## 2. Who I Am
# From Software Engineering to Catholic Apologetics

- Almost **17 years** in software engineering and architecture
- Currently a **Line Manager**
- Experience building software systems and platforms
- Involved in CFD through a personal journey of rediscovering and defending the Catholic faith

**Speaker note:** Keep the professional background brief. The important point is why software engineering became connected to the apostolate.

**Visual:** Professional portrait + subtle software/faith imagery.

---

## 3. My Journey
# This Did Not Begin as a Software Project

During my college and postgraduate years, I encountered Catholic apologetics debates involving **Bro. Ryan and Bro. Windell**.

At the time, I was wrestling with questions about atheism and trying to understand the Catholic faith again.

My wife was an **INC member**, which became another reason for me to continue studying the Catholic faith seriously.

Through God's grace, that journey eventually led me to the **Catholic Faith Defenders**.

**Visual:** Questions → Study → Apologetics → CFD → iCFD

---

## 4. The Problem
# The Information Is There. The Connection Is Missing.

There is already a tremendous amount of Catholic information online:

- Bible
- Catechism
- Church documents
- Apologetics
- Theology
- Church Fathers
- Articles and discussions

But information is often **scattered across different sources**.

For someone trying to learn and defend the faith:

**Where do I start?**  
**What should I study next?**  
**How are these sources connected?**  
**Can I access them offline?**

**Visual:** Disconnected information sources converging toward one central platform.

---

## 5. Problem Video
# The Problem We Are Trying to Solve

**PLAY PROBLEM VIDEO**

Keep this slide minimal and full-screen.

---

## 6. The Moment iCFD Started
# It Started With 12 Questions

My wife gave me a list of **12 topics** she wanted to understand.

She asked me to write explanations so she could study them.

Because Cebuano was difficult for her, I initially created the material in **Tagalog and English**.

Then I asked:

> **“Why stop at 12 articles when I can build something that can become a library?”**

That became the beginning of **iCFD**.

**Visual:** 12 question cards transforming into the iCFD app.

---

## 7. From Articles to Platform
# The Idea Grew

**12 Questions**  
↓  
**Apologetics Articles**  
↓  
**Centralized Catholic Resources**  
↓  
**Learning Paths**  
↓  
**Quizzes & Progress**  
↓  
**Formation Platform**

The goal evolved from simply **providing answers** to helping Catholics **learn, practice, and defend the faith**.

---

## 8. Vision
# iCFD — Codex Defensoris

### A Digital Apologetics and Formation Companion

iCFD brings together:

- Catholic apologetics
- Scripture
- Catechism
- Church documents
- Church Fathers
- theological terminology
- structured learning
- quizzes
- progress tracking
- certificates
- CFD resources

> **Make Catholic formation easier to access, easier to study, easier to connect, and easier to continue.**

---

## 9. Live Demonstration
# Let Me Show You iCFD

**LIVE DEMO**

Use one coherent journey:

**Home → Course/Handbook → Topic → References → Search → Learning Progress → Offline**

Do not randomly click through features.

---

## 10. Connected Knowledge
# One Question, Many Connections

Example:

**Apologetics Question**  
↓  
**Answer**  
↓  
**Scripture**  
↓  
**Catechism**  
↓  
**Church Fathers**  
↓  
**Church Documents**  
↓  
**Theological Terms**  
↓  
**Related Topics**

**Visual:** Connected knowledge graph.

---

## 11. Offline First
# Formation Should Not Depend on Internet Access

iCFD is designed as a **Progressive Web App (PWA)** with offline capabilities.

Users can download/cache important content and continue reading when internet access is unavailable.

### Live demo
1. Load content
2. Disable internet
3. Open previously downloaded content
4. Continue reading

**Visual:** Phone showing iCFD while disconnected.

---

## 12. From Reading to Learning
# Reading Is Not the Same as Formation

iCFD moves beyond static articles through:

- Learning Paths
- Course progression
- Topic completion
- Quizzes
- Passing thresholds
- Progress tracking
- Certificates

**Read → Understand → Test → Progress → Complete → Certificate**

---

## 13. CFD Formation
# Bringing CFD Formation Into a Digital Experience

The CFD Layman's Biblical Theology and Apologetics Course provides a structured formation framework with **20 themes/topics**.

iCFD provides a digital layer around that formation:

**Course → Topic → Study Material → Quiz → Progress → Completion → Certificate**

**Important:** The complete question bank is still being developed. Clearly distinguish current implementation from planned completion.

**Visual:** CFD manual → digital course.

---

## 14. Catholic Reference Library
# A Central Place to Find the Sources

Reference direction includes:

- **Holy Bible**
- **Catechism of the Catholic Church**
- **General Instruction of the Roman Missal**
- **Code of Canon Law**
- **Church documents**
- **Church Fathers**
- **Apologetics topics**

The purpose is not merely to store documents.

> **The goal is to connect sources to the topics being studied.**

---

## 15. Theological Etymology
# Sometimes the Meaning Is in the Word

Examples:

**ekklesia**  
**latria**  
**dulia**  
**Theotokos**  
**kecharitomene**

The objective is to help the defender understand terminology behind theological arguments—not merely memorize conclusions.

**Visual:** Greek word → transliteration → meaning → theological context.

---

## 16. CFD Resources
# From Personal Study to CFD Formation

The platform can support:

- CFD members
- formation materials
- presentations
- apologetics resources
- learning paths
- certificates
- user progress
- administrative content management

### Long-term direction
**Personal study tool → CFD formation infrastructure**

---

## 17. Administration & Analytics
# If We Care About Formation, We Need Visibility

Administrative capabilities/direction include:

- User management
- Topic management
- Learning paths
- Quiz management
- Certificates
- Content/reference management
- Presentations
- Activity and learning analytics

### Long-term objective

Understand:

- What are members studying?
- Which topics are being completed?
- Where are learners struggling?
- Which formation materials are actually being used?

> **The objective is formation insight, not surveillance.**

---

## 18. Current Architecture
# How iCFD Works

Use an accurate architecture diagram based on the repository. At a high level:

**Users**  
↓  
**iCFD PWA / Web Application**  
↓  
**Hosting**  
↓  
**Backend/API**  
↓  
**Database / Auth / Storage**

Then show major domains:

- Topics
- Bible
- CCC
- Church Documents
- Learning Paths
- Quizzes
- Certificates
- Users
- Analytics

**Speaker note:** The Board needs reliability, maintainability, scalability and cost explained—not a deep framework lecture.

---

## 19. Why This Architecture
# Designed to Start Small and Scale With Evidence

Current principles:

- Cloud-hosted
- PWA-based
- Centralized database
- Authentication
- Storage
- API-based architecture
- Offline-capable client
- Scalable infrastructure

> **Do not pay for capacity we do not yet need.**

---

## 20. Current Infrastructure Cost
# What Does It Cost Today?

Populate with actual current values before presenting:

| Service | Current Plan | Cost |
|---|---|---:|
| Vercel | Free tier | ₱0 |
| Supabase | Current/free tier | ₱0 or actual |
| Domain | Current | ₱X/year |
| Other services | Current | ₱X |
| **Total recurring** | | **₱X** |

> The current deployment is intentionally operating within free-tier/low-cost infrastructure appropriate for the current pilot and user base.

**Do not invent prices.**

---

## 21. When Do We Upgrade?
# We Upgrade Based on Usage — Not the Calendar

### Capacity
- Database/storage limits
- Bandwidth
- Server/function limits

### Usage
- Growing users
- Concurrent usage
- Increasing traffic

### Reliability
- Backup requirements
- Monitoring
- Availability requirements

### Product growth
- Larger content library
- Advanced analytics
- Additional organizational features

> **Scale when the evidence says we need to scale.**

---

## 22. Future Cost Model
# Scaling the Platform

### Stage 1 — Pilot
**Current**
- Free/low-cost infrastructure
- Validate concept
- Build content
- Measure adoption

### Stage 2 — CFD Davao
- More users
- More content
- More learning activity
- Paid infrastructure where required

### Stage 3 — Organization-Wide
- Larger user base
- Higher reliability requirements
- More advanced administration
- Infrastructure becomes an organizational investment

---

## 23. Roadmap
# Where iCFD Goes From Here

**TODAY**  
Digital Library + Apologetics  
↓  
**Guided Learning**  
↓  
**Quizzes + Certification**  
↓  
**CFD Chapter Formation Support**  
↓  
**Organization-Wide Formation Platform**

Only describe future capabilities as **planned directions**, not existing features.

---

## 24. What iCFD Is Not
# iCFD Does Not Replace the Church

It does not replace:

- Priests
- Catechists
- CFD leaders
- Personal formation
- Parish communities
- The Magisterium
- Face-to-face evangelization

> **Technology should serve formation—not replace it.**

---

## 25. Mission
# Technology Is the Instrument.
# Formation Is the Mission.

> I didn't build iCFD because CFD needed another website.
>
> I built it because I experienced personally how difficult it can be to find, understand, and connect the teachings of the Catholic faith.
>
> What started with twelve questions became a library.
>
> The library became a learning platform.
>
> And the learning platform can become a tool for CFD formation.
>
> **The goal is to equip—not replace—our teachers, priests, chapters, and defenders of the faith.**
>
> To make the faith easier to study, easier to understand, easier to defend, and easier to pass on to the next generation.

---

## 26. Board of Governors
# Questions, Recommendations & Guidance

> “I would now like to open the floor for questions, recommendations, and guidance from the Board.”

---

# PART II — DESIGN DIRECTION

Use the existing **iCFD logo/branding** as the source of truth.

Visual style:

- Modern Catholic
- Professional
- Clean
- Serious
- Mission-oriented
- Strong typography
- White/light backgrounds
- Red/yellow accents derived from the existing branding
- Avoid brownish/sepia palettes
- Avoid generic corporate blue
- Avoid excessive gradients
- Avoid cheesy stock photography
- Avoid startup/SaaS visual clichés

Prefer **actual application screenshots, custom diagrams, icons, and tasteful generated conceptual visuals** over generic stock images.

Good image/diagram slides:
1. Personal journey
2. Scattered information problem
3. 12 questions → platform
4. Knowledge graph
5. Offline access
6. CFD manual → digital course
7. Etymology
8. Analytics dashboard
9. Architecture
10. Scaling roadmap
11. Closing

Do not use an image merely to fill space.

---

# PART III — CLAUDE CODE PROMPT

You are creating a professional PowerPoint presentation for the **CFD Board of Governors** about the current implementation and future direction of **iCFD — Codex Defensoris**.

Read this Markdown file completely before doing anything.

Also inspect the actual iCFD repository/codebase and relevant project documentation. The final presentation must represent the **real implementation**, not imagined functionality.

## Primary story

Build the presentation around:

**Personal journey → Real problem → Video → iCFD solution → Live demonstration → Formation value → Current implementation → Architecture → Current cost → Scaling strategy → Roadmap → Mission → Board Q&A**

The key message is:

> **iCFD is not merely an app. It is a potential digital formation infrastructure for the Catholic Faith Defenders.**

Do not oversell it.

Clearly distinguish:
- implemented
- partially implemented
- planned/future

Accuracy is more important than impressive claims.

## Audience

The audience is the **CFD Board of Governors**, not primarily software engineers.

Therefore:
- explain architecture in understandable language
- emphasize organizational value
- explain sustainability and cost
- explain governance implications
- explain how technology supports formation
- avoid excessive framework-specific detail

## Inspect the repository

Before producing the final presentation:

1. Inspect the repository.
2. Identify the actual technology stack.
3. Identify actual deployment architecture if documented.
4. Identify implemented features.
5. Identify partially implemented features.
6. Identify planned features.
7. Inspect README, PRD, architecture documents and relevant source code.
8. Use actual screenshots from the application where available.
9. Do not claim a feature is implemented without evidence.

## Infrastructure and pricing

Find the actual current infrastructure configuration.

If current pricing cannot be established from the repository, leave explicit placeholders:

`[INSERT CURRENT VERCEL PLAN/COST]`

`[INSERT CURRENT SUPABASE PLAN/COST]`

Never invent pricing.

If online research is needed, use official provider pricing and cite it.

Clearly distinguish:
- current cost
- projected future cost

The message should be that infrastructure is upgraded when actual usage or operational requirements justify it.

## Visual storytelling

Create custom diagrams for:

### Personal journey
Questions → Study → Apologetics → CFD → iCFD

### Problem
Scattered Catholic resources → need for connected access

### Origin
12 Questions → Articles → Library → Platform

### Knowledge
Question → Answer → Scripture → CCC → Fathers → Church Documents → Etymology → Related Topics

### Learning
Read → Understand → Quiz → Progress → Complete → Certificate

### Infrastructure
Pilot → CFD Davao → Organization-wide

Use actual app screenshots where appropriate.

## Video

Slide 5 is reserved for the problem video.

If a video file exists in the repository, identify it and reference it appropriately.

Do not embed a nonexistent video.

## Live demo

Slide 9 should be a clean transition slide:

# Let Me Show You iCFD

Home → Learn → Search → References → Progress → Offline

The presenter will switch to the actual application.

## Speaker notes

Add natural speaker notes to major slides, especially:
- personal story
- problem
- 12-question origin
- vision
- CFD formation connection
- architecture
- cost
- upgrade strategy
- closing

## Tone

Confident but humble.

Technical but understandable.

Mission-driven but not sentimental.

Ambitious but realistic.

Transparent about limitations.

Avoid marketing terms such as:
- revolutionary
- game-changing
- disruptive
- world-class
- cutting-edge

unless objectively justified.

## Catholic framing

Do not imply that iCFD has doctrinal authority.

Make clear:

> iCFD is a tool for formation and access to Catholic resources. It does not replace the teaching authority of the Church or formation provided by priests, catechists and CFD leaders.

## Final slide

End with:

> **Technology is the instrument. Formation is the mission.**

Then:

> The goal is to make the faith easier to study, easier to understand, easier to defend, and easier to pass on to the next generation.

Finish with:

**Questions, Recommendations & Guidance**

## Deliverables

Create:

1. `iCFD-Board-of-Governors-Presentation.pptx`
2. `iCFD-Board-of-Governors-Presentation.pdf` if PDF export is available
3. Presentation assets in a dedicated directory
4. `PRESENTATION-NOTES.md`

`PRESENTATION-NOTES.md` should document:
- slide sequence
- demo sequence
- assumptions
- placeholders requiring actual data
- current vs planned features

## Validation

Before finishing:
- check text overflow
- check clipped elements
- check broken images
- check font consistency
- check projector readability
- check architecture accuracy
- check pricing accuracy
- check current vs future feature labeling
- render/inspect slides if the tooling allows it

The final result should look like a **serious Board-level presentation for a Catholic organization**, not a generic software startup pitch.
