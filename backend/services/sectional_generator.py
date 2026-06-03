import os
import asyncio
import anthropic
from dotenv import load_dotenv
load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5-20251001"


def build_summary_prompt(ctx: dict) -> str:
    return f"""You are an expert resume writer. Write ONLY the professional summary section for this candidate.

CANDIDATE PROFILE:
{ctx['master_summary']}
Full experience: {ctx['raw_profile_text']}

TARGET JOB:
Company: {ctx['company_name']}
Title: {ctx['job_title']}
JD: {ctx['job_description'][:2000]}

TRACK: {ctx['track_name']} — {ctx['track_summary']}
TARGET SENIORITY: {ctx['target_seniority']}
CANDIDATE DIRECTION: {ctx['user_tweak']}

Write exactly 3 lines:
Line 1: Role identity + years of experience + primary domain. Mirror the seniority and language of the JD ideal candidate.
Line 2: Single most significant verifiable achievement with a quantified metric from the profile. Never fabricate a number.
Line 3: Forward hook toward this specific role at this company.

Rules:
- No first-person pronouns
- No buzzwords: results-driven, passionate, dynamic, seasoned
- Start with the role identity, not a generic opener
- Output ONLY the 3-line summary, no label, no preamble
"""


def build_experience_prompt(ctx: dict) -> str:
    return f"""You are an expert resume writer. Write ONLY the experience section for this candidate.

CANDIDATE PROFILE:
Full experience: {ctx['raw_profile_text']}
Education: {ctx['education_data']}

TARGET JOB:
Company: {ctx['company_name']}
Title: {ctx['job_title']}
JD: {ctx['job_description'][:2000]}
Skill gaps to address: {ctx['skill_gaps']}

TRACK: {ctx['track_name']}
EMPHASISE: {ctx['emphasized_skills']}
DE-EMPHASISE: {ctx['deemphasized_skills']}
ASPIRATION SKILLS: {ctx['aspiration_skills']}
CANDIDATE DIRECTION: {ctx['user_tweak']}

Write the full experience section in reverse chronological order.

For each role use this format:
[Job Title] | [Company] | [Month Year – Month Year]
- [X-Y-Z bullet with metric]
- [X-Y-Z bullet with metric]
- [X-Y-Z bullet with metric]

X-Y-Z framework: Accomplished [X], as measured by [Y], by doing [Z]

Rules:
- Every bullet must have a quantified metric (%, $, users, time, scale) if one exists in the profile — never fabricate
- Active verbs only: Led, Built, Reduced, Grew, Launched, Architected, Drove
- Never: Helped with, Worked on, Responsible for, Assisted
- Mirror exact JD keywords naturally in context
- Frame aspiration skills as: Applied [skill] in [context], currently scaling across [scope]
- Exclude roles older than 15 years unless highly relevant
- Output ONLY the experience section content, no label, no preamble
"""


def build_skills_prompt(ctx: dict) -> str:
    return f"""You are an expert resume writer. Write ONLY the skills section for this candidate.

ALL CANDIDATE SKILLS: {ctx['all_extracted_skills']}
TARGET JOB JD: {ctx['job_description'][:1500]}
TRACK: {ctx['track_name']}
EMPHASISE: {ctx['emphasized_skills']}
DE-EMPHASISE: {ctx['deemphasized_skills']}

Write a grouped skills section optimised for ATS parsing.

Format:
Languages: [comma separated]
Frameworks: [comma separated]
Tools: [comma separated]
Methodologies: [comma separated]
Leadership: [comma separated]

Rules:
- Include JD keywords the candidate genuinely has
- Do not surface de-emphasised skills unless JD explicitly requires them
- Normalise skill names: Python not python, React not ReactJS
- No duplicates across categories
- Output ONLY the skills content, no label, no preamble
"""


def build_education_prompt(ctx: dict) -> str:
    return f"""You are an expert resume writer. Write ONLY the education and certifications section.

EDUCATION DATA: {ctx['education_data']}
CANDIDATE PROFILE: {ctx['raw_profile_text']}

Format education as:
[Degree, Field] | [Institution] | [Year]

Format certifications as:
[Certification Name] | [Issuer] | [Year]

Rules:
- Include GPA only if above 3.5 and within 5 years of graduation
- List certifications separately only if professional credentials, not online courses
- Output ONLY the education and certifications content, no label, no preamble
"""


def build_ats_report_prompt(ctx: dict) -> str:
    return f"""You are an ATS optimization expert. Analyse this resume context against the job description.

JD: {ctx['job_description'][:2000]}
CANDIDATE SKILLS: {ctx['all_extracted_skills']}
TRACK: {ctx['track_name']}
SKILL GAPS: {ctx['skill_gaps']}

Generate an ATS keyword coverage report as a markdown table:

| JD Keyword | In Resume? | Where |
|---|---|---|
| [keyword] | Yes / Partial / Missing | [location] |

Then write:
Estimated ATS Match Strength: Low / Medium / High / Very High
(Based on keyword density, context match, and title alignment)

Output ONLY the report, no preamble.
"""


def build_recruiter_notes_prompt(ctx: dict) -> str:
    return f"""You are a senior recruiter reviewing this candidate for this role.

CANDIDATE PROFILE:
{ctx['master_summary']}
Experience: {ctx['raw_profile_text']}

TARGET JOB:
Company: {ctx['company_name']}
Title: {ctx['job_title']}
JD: {ctx['job_description'][:2000]}
Skill gaps: {ctx['skill_gaps']}

Write recruiter intelligence with these sections:

**Strongest Bullets for This JD:**
List the 2-3 bullets from the candidate's experience that most directly match what this role needs. Explain why each lands.

**Remaining Gaps:**
What's missing and how to address in the interview or cover letter.

**Suggested LinkedIn Headline:**
One line optimised for recruiter search.

**Red Flags and Mitigation:**
Anything a recruiter might pause on and how to address it proactively.

**Hiring Manager Signal:**
Why this candidate is a strong fit at the strategic level.

Output ONLY the recruiter notes, no preamble.
"""


async def generate_section(section_name: str, prompt: str) -> tuple[str, str]:
    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        content = message.content[0].text.strip()
        print(f"Section complete: {section_name} ({len(content)} chars)")
        return section_name, content
    except Exception as e:
        print(f"Section error {section_name}: {e}")
        return section_name, f"[Error generating {section_name}: {str(e)}]"


async def generate_resume_sectional(ctx: dict) -> dict:
    print(f"Starting sectional generation for {ctx['job_title']} at {ctx['company_name']}")

    tasks = [
        generate_section("summary", build_summary_prompt(ctx)),
        generate_section("experience", build_experience_prompt(ctx)),
        generate_section("skills", build_skills_prompt(ctx)),
        generate_section("education", build_education_prompt(ctx)),
        generate_section("ats_report", build_ats_report_prompt(ctx)),
        generate_section("recruiter_notes", build_recruiter_notes_prompt(ctx)),
    ]

    results = await asyncio.gather(*tasks)
    sections = dict(results)

    full_name = ctx.get("full_name", "Your Name")
    phone = ctx.get("phone", "[Phone]")
    location_city = ctx.get("location_city", "[City, State]")
    linkedin_url = ctx.get("linkedin_url", "[LinkedIn]")
    email = ctx.get("email", "[Email]")

    resume_content = f"""# {full_name}
{location_city} | {phone} | {email} | {linkedin_url}

---

## SUMMARY
{sections['summary']}

---

## EXPERIENCE
{sections['experience']}

---

## SKILLS
{sections['skills']}

---

## EDUCATION
{sections['education']}
"""

    return {
        "resume": resume_content,
        "ats_report": sections["ats_report"],
        "recruiter_notes": sections["recruiter_notes"],
        "full_output": f"### A. ATS-OPTIMISED RESUME\n{resume_content}\n\n### B. ATS KEYWORD COVERAGE REPORT\n{sections['ats_report']}\n\n### C. RECRUITER NOTES\n{sections['recruiter_notes']}",
    }


async def generate_cover_letter_sectional(ctx: dict) -> dict:
    tone = ctx.get("tone", "confident")
    tone_guidance = {
        "confident": "Direct and assertive. Own outcomes. No hedging. Short punchy sentences.",
        "formal": "Professional distance. Precise language. Structured paragraphs.",
        "conversational": "Warm and personal. Varied sentence rhythm. Human-sounding.",
        "concise": "Ruthlessly edited. One idea per sentence. No filler.",
    }.get(tone, "confident and direct")

    prompt = f"""You are an expert cover letter writer. Write a targeted cover letter.

CANDIDATE PROFILE:
{ctx['master_summary']}
Experience: {ctx['raw_profile_text']}

TARGET JOB:
Company: {ctx['company_name']}
Title: {ctx['job_title']}
JD: {ctx['job_description'][:2000]}
Skill gaps: {ctx['skill_gaps']}

TRACK: {ctx['track_name']}
KEY STRENGTHS: {ctx['emphasized_skills']}
CANDIDATE DIRECTION: {ctx['user_tweak']}

TONE: {tone_guidance}

Write exactly 4 paragraphs:

Paragraph 1 — The Hook (2-4 sentences):
Open with the central argument. Name the role. Make a specific claim. Reference something real about this company.
Forbidden openers: "I am writing to apply", "I have always been passionate", "I was excited to see this role"

Paragraph 2 — The Evidence (4-6 sentences):
Prove the central argument with ONE specific story using S-C-A-R:
Situation (1 sentence) → Complication (1 sentence) → Action (2 sentences, what YOU did) → Result (1 sentence with metric if it exists — never fabricate)

Paragraph 3 — The Company Argument (3-4 sentences):
Why THIS company, not just this role type. Reference their stage, product, market position, or known challenge. Must be specific enough that it cannot be copied to a different company.
Forbidden: "I have always admired your innovative culture", generic company flattery

Paragraph 4 — The Close (2-3 sentences):
Ask for a conversation, not consideration. One forward-looking signal. End on confidence not deference.
Forbidden: "Thank you for your time", "I look forward to hearing from you"

Then write:

**Strategic Rationale:**
3 bullet points explaining key choices — why this opening, which achievement was selected and why, what the central argument is.

**Weak Points:**
What could be more specific, what a recruiter might question after reading this.

Output ONLY the cover letter and strategic rationale, no preamble.
"""

    _, content = await generate_section("cover_letter", prompt)

    return {
        "cover_letter": content,
        "full_output": content,
    }