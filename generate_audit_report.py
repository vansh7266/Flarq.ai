#!/usr/bin/env python3
"""Generate FLARQ Code Review & Design Audit PDF Report."""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, CondPageBreak,
    KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Palette ━━
ACCENT       = colors.HexColor('#1c7795')
TEXT_PRIMARY  = colors.HexColor('#222426')
TEXT_MUTED    = colors.HexColor('#767d83')
BG_SURFACE   = colors.HexColor('#d5d9dd')
BG_PAGE      = colors.HexColor('#f1f3f4')
CRITICAL_RED = colors.HexColor('#c0392b')
MAJOR_ORANGE = colors.HexColor('#d35400')
MINOR_YELLOW = colors.HexColor('#8a6d3b')
POSITIVE_GREEN = colors.HexColor('#27ae60')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans-Bold')

# ━━ Styles ━━
PAGE_W, PAGE_H = A4
LEFT_M = 0.9 * inch
RIGHT_M = 0.9 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'ReportTitle', fontName='LiberationSerif', fontSize=28, leading=34,
    alignment=TA_CENTER, spaceAfter=6, textColor=ACCENT
)
subtitle_style = ParagraphStyle(
    'ReportSubtitle', fontName='LiberationSerif', fontSize=14, leading=20,
    alignment=TA_CENTER, spaceAfter=4, textColor=TEXT_MUTED
)
h1_style = ParagraphStyle(
    'H1', fontName='LiberationSerif', fontSize=20, leading=26,
    spaceBefore=18, spaceAfter=10, textColor=ACCENT
)
h2_style = ParagraphStyle(
    'H2', fontName='LiberationSerif', fontSize=15, leading=20,
    spaceBefore=14, spaceAfter=8, textColor=TEXT_PRIMARY
)
h3_style = ParagraphStyle(
    'H3', fontName='LiberationSerif', fontSize=12, leading=16,
    spaceBefore=10, spaceAfter=6, textColor=TEXT_PRIMARY
)
body_style = ParagraphStyle(
    'Body', fontName='LiberationSerif', fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, spaceAfter=6
)
body_left_style = ParagraphStyle(
    'BodyLeft', fontName='LiberationSerif', fontSize=10.5, leading=17,
    alignment=TA_LEFT, spaceAfter=6
)
code_style = ParagraphStyle(
    'Code', fontName='DejaVuSans', fontSize=8.5, leading=13,
    alignment=TA_LEFT, spaceAfter=4, leftIndent=12,
    backColor=colors.HexColor('#f4f6f7'), borderPadding=4
)
bullet_style = ParagraphStyle(
    'Bullet', fontName='LiberationSerif', fontSize=10.5, leading=17,
    alignment=TA_LEFT, spaceAfter=4, leftIndent=24, bulletIndent=12
)
caption_style = ParagraphStyle(
    'Caption', fontName='LiberationSerif', fontSize=9, leading=13,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6
)
toc_h1 = ParagraphStyle('TOCH1', fontName='LiberationSerif', fontSize=13, leftIndent=20, leading=20)
toc_h2 = ParagraphStyle('TOCH2', fontName='LiberationSerif', fontSize=11, leftIndent=40, leading=18)

header_cell_style = ParagraphStyle(
    'HeaderCell', fontName='LiberationSerif', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER, leading=14
)
cell_style = ParagraphStyle(
    'Cell', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13
)
cell_center_style = ParagraphStyle(
    'CellCenter', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, leading=13
)

critical_style = ParagraphStyle('Critical', parent=body_style, textColor=CRITICAL_RED)
major_style = ParagraphStyle('Major', parent=body_style, textColor=MAJOR_ORANGE)

# ━━ TOC Document Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN = (PAGE_H - TOP_M - BOTTOM_M) * 0.15

def add_major_section(text):
    return [CondPageBreak(H1_ORPHAN), add_heading(text, h1_style, level=0)]

def severity_badge(sev):
    color_map = {'CRITICAL': CRITICAL_RED, 'MAJOR': MAJOR_ORANGE, 'MINOR': MINOR_YELLOW, 'POSITIVE': POSITIVE_GREEN}
    c = color_map.get(sev.upper(), TEXT_MUTED)
    s = ParagraphStyle('sev', fontName='LiberationSerif', fontSize=9, textColor=colors.white, alignment=TA_CENTER, leading=12)
    bg = TableStyle([('BACKGROUND', (0,0), (0,0), c), ('ALIGN', (0,0), (0,0), 'CENTER'),
                     ('VALIGN', (0,0), (0,0), 'MIDDLE'), ('TOPPADDING', (0,0), (0,0), 2),
                     ('BOTTOMPADDING', (0,0), (0,0), 2), ('LEFTPADDING', (0,0), (0,0), 6),
                     ('RIGHTPADDING', (0,0), (0,0), 6), ('ROUNDEDCORNERS', [3,3,3,3])])
    t = Table([[Paragraph(sev, s)]], colWidths=[60])
    t.setStyle(bg)
    return t

def make_issue_table(issues):
    """Build a table of issues: [[severity, location, description]]"""
    header = [
        Paragraph('<b>Severity</b>', header_cell_style),
        Paragraph('<b>Location</b>', header_cell_style),
        Paragraph('<b>Issue</b>', header_cell_style),
    ]
    data = [header]
    for sev, loc, desc in issues:
        sev_color = {'CRITICAL': CRITICAL_RED, 'MAJOR': MAJOR_ORANGE, 'MINOR': MINOR_YELLOW}.get(sev, TEXT_MUTED)
        sev_style = ParagraphStyle('sevcell', fontName='LiberationSerif', fontSize=9, textColor=sev_color, alignment=TA_CENTER, leading=12)
        data.append([
            Paragraph(sev, sev_style),
            Paragraph(loc, cell_style),
            Paragraph(desc, cell_style),
        ])
    col_widths = [0.10 * CONTENT_W, 0.35 * CONTENT_W, 0.55 * CONTENT_W]
    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD))
        else:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN))
    t.setStyle(TableStyle(style_cmds))
    return t

def bullet(text):
    return Paragraph('<bullet>&bull;</bullet> ' + text, bullet_style)

def body(text):
    return Paragraph(text, body_style)

def body_left(text):
    return Paragraph(text, body_left_style)

def h2(text):
    return add_heading(text, h2_style, level=1)

def h3(text):
    return add_heading(text, h3_style, level=2)

# ━━ Build Document ━━
output_path = '/home/z/my-project/download/FLARQ_Code_Review_Design_Audit.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = TocDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title='FLARQ Code Review & Design Audit',
    author='Z.ai', creator='Z.ai'
)

story = []

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER PAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph('<b>FLARQ</b>', ParagraphStyle('CoverTitle', fontName='LiberationSerif', fontSize=42, leading=48, alignment=TA_CENTER, textColor=ACCENT)))
story.append(Spacer(1, 8))
story.append(Paragraph('Code Review & Design Audit', ParagraphStyle('CoverSub', fontName='LiberationSerif', fontSize=22, leading=28, alignment=TA_CENTER, textColor=TEXT_PRIMARY)))
story.append(Spacer(1, 24))
story.append(HRFlowable(width='60%', thickness=2, color=ACCENT, spaceAfter=24, spaceBefore=0, hAlign='CENTER'))
story.append(Paragraph('Professional code quality, design, and deployment readiness assessment', ParagraphStyle('CoverDesc', fontName='LiberationSerif', fontSize=12, leading=18, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 18))
story.append(Paragraph('Google Cloud Rapid Agent Hackathon Submission', ParagraphStyle('CoverMeta', fontName='LiberationSerif', fontSize=11, leading=16, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 6))
story.append(Paragraph('MongoDB Track | $5,000 First Place Prize', ParagraphStyle('CoverMeta2', fontName='LiberationSerif', fontSize=11, leading=16, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 36))
story.append(Paragraph('Repository: github.com/vansh7266/Flarq.ai', ParagraphStyle('CoverRepo', fontName='LiberationSerif', fontSize=10, leading=14, alignment=TA_CENTER, textColor=ACCENT)))
story.append(Spacer(1, 6))
story.append(Paragraph('Submission Deadline: June 11, 2026', ParagraphStyle('CoverDate', fontName='LiberationSerif', fontSize=10, leading=14, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph('Prepared by Z.ai | May 2026', ParagraphStyle('CoverAuthor', fontName='LiberationSerif', fontSize=10, leading=14, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE OF CONTENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle('TOCTitle', fontName='LiberationSerif', fontSize=20, leading=26, alignment=TA_LEFT, textColor=ACCENT, spaceAfter=12)))
toc = TableOfContents()
toc.levelStyles = [toc_h1, toc_h2]
story.append(toc)
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART 1: CODE QUALITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('PART 1: Code Quality Audit'))
story.append(body('This section provides a comprehensive code quality audit of the FLARQ codebase, covering both the React/TypeScript frontend and the Python/FastAPI backend. Each issue is classified by severity: Critical (will break in production), Major (will hurt judge score), and Minor (polish items).'))

# --- Critical Issues ---
story.append(h2('Critical Issues (Will Break in Production)'))
story.append(body('These issues represent fundamental problems that would cause failures, data corruption, or security breaches in a live production environment. Any one of these could eliminate FLARQ from competition contention.'))

critical_issues = [
    ('CRITICAL', 'frontend/src/components/agent/MessageBubble.tsx:47-63', 'Typing animation re-runs on every parent re-render. Every time a new message is added, ALL assistant messages restart their character-by-character animation from scratch, causing visible flicker and up to 1000 setState calls per message. This makes the Agent page look broken during multi-turn conversations.'),
    ('CRITICAL', 'frontend/src/store/authStore.ts + main.tsx', 'Triple token storage: Tokens are stored in Zustand persist, manually in localStorage under flarq_access_token/flarq_refresh_token, AND written a third time in main.tsx hydration. This creates desynchronization risk and makes token rotation bugs extremely difficult to debug.'),
    ('CRITICAL', 'frontend/src/pages/ProfilePage.tsx:244', 'Skill remove button has no onClick handler. The X button renders visually but clicking it does absolutely nothing. Dead UI elements are worse than no button at all, as they erode user trust.'),
    ('CRITICAL', 'frontend/src/App.tsx:17', 'Auth guard disabled by default: VITE_REQUIRE_AUTH defaults to falsy. Unless explicitly set to "true" in environment, all protected routes (/dashboard, /profile, /analyze, etc.) are accessible without authentication. Users see broken loading states from failed API calls.'),
    ('CRITICAL', 'backend/app/services/mongodb/mcp_client.py:241-243', 'NoSQL injection via unsanitized filters in MCP server. The mongodb_find_one, mongodb_find_many, and mongodb_aggregate tools pass user-controlled filter/pipeline arguments directly to MongoDB with zero sanitization. An attacker could inject {"$where": "sleep(5000)"} for DoS or {"$gt": ""} to dump all records.'),
    ('CRITICAL', 'backend/app/services/mongodb/mcp_client.py:292-355', 'Unscoped MCP aggregate/count/vectorSearch: These tools accept any pipeline without enforcing user_id scoping. A crafted pipeline [{{$match: {{}}}}] could dump every user\'s data from any collection.'),
    ('CRITICAL', 'backend/app/services/mongodb/mcp_client.py:292-308', 'Destructive pipeline stages allowed: $out, $merge, and $currentOp are not blocked. A malicious pipeline could overwrite collections or modify data across user boundaries.'),
    ('CRITICAL', 'backend/app/services/mongodb/mcp_client.py:48-62', 'Race condition in MCP session initialization: Two concurrent requests can both see self._session is None, both spawn subprocesses, creating orphaned processes. No asyncio.Lock guards the initialization path.'),
    ('CRITICAL', 'backend/app/services/agent/agent_builder.py + all Gemini services', 'Prompt injection vulnerability: Only jd_analyzer.py has sanitize_jd(). All other Gemini services (resume_parser, cover_letter, gap_analyzer, follow_up_email) inject user-controlled text directly into prompts. A malicious resume containing "Ignore previous instructions..." would manipulate AI output.'),
    ('CRITICAL', 'backend/ (architecture)', 'Dual data access architecture: FlarqMCPClient (MCP subprocess) used by all routes vs Motor repositories used only by auth. Two completely different data access patterns never interact, with no shared validation or schema enforcement. Auth uses Motor directly (fast), everything else goes through MCP subprocess (slow, JSON serialization overhead).'),
    ('CRITICAL', 'backend/tests/', 'Near-zero test coverage: Only 7 tests exist, none of which test any FastAPI endpoint. Zero tests for profile CRUD, application CRUD, file upload, analytics, agent chat, error paths, security boundaries, or authorization checks. The conftest.py provides no TestClient or database fixtures.'),
]
story.append(make_issue_table(critical_issues))
story.append(Spacer(1, 12))

# --- Major Issues ---
story.append(h2('Major Issues (Will Hurt Judge Score)'))
story.append(body('These issues would not necessarily crash the application but represent significant quality gaps that professional judges would identify and penalize. They span type safety, state management, performance, accessibility, API design, and security.'))

major_issues = [
    ('MAJOR', 'frontend/src/pages/AnalyticsPage.tsx (8 locations)', 'Pervasive "as" type assertions: 8 unsafe type casts because AnalyticsOverview types everything as Record<string, unknown>. Root cause is analyticsService.ts defining all sub-fields as Record<string, unknown> instead of proper interfaces.'),
    ('MAJOR', 'frontend/src/services/api.ts:10-11,78', 'Dual refresh token read paths: refreshAccessToken() reads from Zustand store while authService.refreshSession() reads directly from localStorage. Two different storage sources for the same token.'),
    ('MAJOR', 'frontend/src/components/ui/Modal.tsx', 'No focus trapping and no Escape key close handler. Tab key escapes to background content. This is an accessibility fail under WCAG 2.1 and would be flagged by any automated accessibility audit.'),
    ('MAJOR', 'frontend/src/components/applications/ApplicationCard.tsx:132', 'Action buttons hidden via opacity-0 group-hover:opacity-100 are invisible on touch/mobile devices. Keyboard users also cannot access Notes, Interview, CoverLetter, or Archive actions.'),
    ('MAJOR', 'frontend (6+ components)', 'Inconsistent raw <button> vs <Button> component: At least 6 places use raw <button> with inline Tailwind instead of the well-designed <Button> component (AnalyzePage tone selector, ApplicationsPage priority pills, AgentPage suggestion chips, etc.)'),
    ('MAJOR', 'backend/app/core/dependencies.py:38-41 vs auth.py', 'Dual response format: get_current_user dependency raises HTTPException returning {"detail": "..."}, while all route handlers use json_response() returning {"success": false, "message": "..."}. Frontend must handle two completely different error shapes.'),
    ('MAJOR', 'backend (all route files)', 'All endpoints use response_model=None. The entire API has zero OpenAPI response documentation. The auto-generated /docs page shows no response schemas.'),
    ('MAJOR', 'backend/app/api/v1/auth.py:166,229', 'Bare except Exception swallows all errors including system-level exceptions. If decode_token has a configuration bug, it returns "Invalid refresh token" instead of surfacing the real problem.'),
    ('MAJOR', 'backend/app/services/mongodb/mcp_client.py:73-110', 'No timeout on MCP subprocess calls. If the MCP subprocess hangs, the entire request hangs forever. Also, the MCP client kills the session on ANY error, including transient query errors, forcing expensive re-initialization.'),
    ('MAJOR', 'backend/app/services/applications/application_service.py:202-265', 'Triple MCP round-trip on every update: find (read 1) + update (write) + find (read 2). N+1 queries in get_detail: three sequential subprocess round-trips for a single detail view.'),
    ('MAJOR', 'backend/app/services/agent/agent_tools.py:51-56', 'Regex injection: User-provided company string is used directly in MongoDB $regex without escaping. Pattern ".*" matches everything; "^(?:(?:.*)*)*$" could cause ReDoS.'),
    ('MAJOR', 'backend/app/api/v1/profile.py:184', 'Content-type bypass: if file.content_type is None (possible with some clients), the MIME check short-circuits to False and malicious files bypass validation entirely.'),
    ('MAJOR', 'backend/app/core/security.py:32-42', 'JWT tokens lack iss (issuer) and aud (audience) claims. If two FLARQ instances share a JWT secret, tokens from one would work on the other.'),
    ('MAJOR', 'backend/app/models/*.py', 'All Pydantic models (UserDocument, ProfileDocument, etc.) are defined but never used anywhere. Routes use inline BaseModel classes or raw dict serialization, meaning no schema validation on data going into or out of MongoDB.'),
    ('MAJOR', 'backend/app/services/gemini/vertex_client.py:95-98', 'New GenerativeModel created per call instead of caching. Model initialization involves SDK overhead that could be avoided by caching instances per (model_name, system_instruction) pair.'),
    ('MAJOR', 'backend/app/services/agent/agent_builder.py:69-85', 'Extra Gemini call for suggestions on every agent turn doubles cost and latency of every chat turn just to generate 3 suggestion strings.'),
    ('MAJOR', 'backend/app/services/gemini/*.py', 'No structured output validation: Gemini returns JSON but it is never validated against expected schemas. If Gemini returns {"match_score": "high"} instead of a number, it is stored directly and causes runtime errors downstream.'),
]
story.append(make_issue_table(major_issues))
story.append(Spacer(1, 12))

# --- Minor Issues ---
story.append(h2('Minor Issues (Polish)'))
story.append(body('These are code quality improvements that demonstrate attention to detail and professional standards. While none would break functionality, fixing them would elevate the codebase quality and signal maturity to judges.'))

minor_issues = [
    ('MINOR', 'frontend (AgentPage, Navbar)', 'Duplicate initials() utility function defined in two files. Should be extracted to utils/helpers.ts.'),
    ('MINOR', 'frontend (Dashboard, Analytics)', 'Duplicate useCountUp hook and duplicate StatCard component with different APIs. Should be unified into shared modules.'),
    ('MINOR', 'frontend/src (10 components)', '10 unused components exist as dead code: GapAnalysisCard, CoverLetterModal, JDPasteBox, ResponseRateChart, InsightCard, PatternSummary, ResumeUpload, SkillTags, ProfileCard, Sidebar. These bloat the bundle and confuse contributors.'),
    ('MINOR', 'frontend/src/pages/LandingPage.tsx:272-277', 'Footer links to /privacy and /terms routes that do not exist in App.tsx. Clicking navigates to catch-all redirect to /.'),
    ('MINOR', 'backend/app/services/mongodb/client.py', 'Missing TTL indexes on token_blocklist and analytics_cache collections. Expired entries are never cleaned, causing unbounded collection growth.'),
    ('MINOR', 'backend/app/services/mongodb/aggregations/', 'Duplicated _JD_LOOKUP_STAGE copy-pasted across company_patterns.py and skill_demand.py (30 lines each). Should be extracted to shared module.'),
    ('MINOR', 'backend/app/services/agent/tools.py', 'Dead file: defines mongo.find tool that does not exist in MCP server. Never imported. Confuses architecture.'),
    ('MINOR', 'backend/app/services/agent/prompts.py', 'Dead file: SYSTEM_PROMPT never used. agent_builder.py defines its own. Two different system prompts for the same agent.'),
    ('MINOR', 'backend/app/services/mongodb/repositories/', 'ProfileRepository, ApplicationRepository, AnalyticsRepository defined but never wired into the application. Dead code.'),
]
story.append(make_issue_table(minor_issues))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART 2: DESIGN & UX AUDIT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('PART 2: Design & UX Audit'))

story.append(h2('Page Scores'))
story.append(body('Each page was evaluated for visual design, UX quality, brand consistency, and competitive polish. Scores reflect how the page would appear to a professional judge evaluating against other hackathon submissions with similar tech stacks.'))

page_scores = [
    ['Landing Page', '6 / 10', 'NodeGraph SVG is unique and on-brand; mesh-bg creates atmosphere; "Powered by Gemini" badge builds credibility. But stats are invisible 12px pills, no product screenshot, feature cards are flat white boxes, and footer is skeletal.'],
    ['Auth Page', '7 / 10', 'Animated tab indicator with layoutId is buttery smooth; AnimatePresence for form switching is polished; gradient-border card feels premium. But no Google OAuth for a Google Cloud product, no "Forgot password?" link, and no password strength indicator.'],
    ['Dashboard', '6.5 / 10', 'useCountUp numbers are delightful; time-based greeting is warm; stale alert banner is useful. But group-hover:teal-cta is BROKEN (custom class cannot be used with hover: prefix), quick-actions all say "Open workspace", no chart, and stat cards lack trend indicators.'],
    ['Profile', '5.5 / 10', 'Completeness progress bar with spring animation is nice; skill tags with category colors are informative; experience timeline works. But skill remove buttons do nothing, "Add skill" opens crude comma-separated textarea, no profile avatar, and two-column layout is cramped.'],
    ['Analyze', '7.5 / 10', 'MatchScoreRing is the best visual component in the app; staggered skill tag animations are satisfying; rotating loading messages are thoughtful; tone selector is distinctive. Best page overall, but empty state is weak and tone buttons use raw <button> instead of <Button>.'],
    ['Applications', '7 / 10', 'Full Kanban with @dnd-kit is real, functional, complex UI; filter bar is well-designed; color-coded column borders aid scanning. But action buttons hidden on mobile, window.confirm() for delete is amateurish, and no drag overlay preview.'],
    ['Analytics', '6 / 10', 'Count-up stats are consistent; Recharts AreaChart looks professional; stale apps section is useful. But FunnelChart is raw SVG with no animation/tooltip, chart text is tiny (fontSize:10), "Powered by MongoDB aggregations" is developer copy, and no date range selector.'],
    ['Agent', '7 / 10', 'FlarqOrb with orbiting dots is the most futuristic visual element; dark sidebar creates strong contrast; tool chips add personality. But the "F" avatar is just a letter, no markdown rendering, no streaming, FlarqOrb disappears after first message, and chat feels like a ChatGPT clone.'],
]
score_data = [[Paragraph('<b>Page</b>', header_cell_style), Paragraph('<b>Score</b>', header_cell_style), Paragraph('<b>Key Findings</b>', header_cell_style)]]
for page, score, findings in page_scores:
    score_data.append([
        Paragraph(page, cell_style),
        Paragraph(score, cell_center_style),
        Paragraph(findings, cell_style),
    ])
score_table = Table(score_data, colWidths=[0.13*CONTENT_W, 0.08*CONTENT_W, 0.79*CONTENT_W], hAlign='CENTER', repeatRows=1)
score_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('BACKGROUND', (0,1), (-1,1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0,2), (-1,2), TABLE_ROW_ODD),
    ('BACKGROUND', (0,3), (-1,3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0,4), (-1,4), TABLE_ROW_ODD),
    ('BACKGROUND', (0,5), (-1,5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0,6), (-1,6), TABLE_ROW_ODD),
    ('BACKGROUND', (0,7), (-1,7), TABLE_ROW_EVEN),
    ('BACKGROUND', (0,8), (-1,8), TABLE_ROW_ODD),
]))
story.append(score_table)
story.append(Spacer(1, 12))
story.append(body('<b>Overall Design Score: 6.5 / 10</b> -- Solid MVP quality, but lacks the visual punch and brand consistency expected of a $5K competition winner. Reads as "clean startup product," not "jaw-dropping demo."'))

story.append(h2('Top 5 Design Improvements (By Judge Impact)'))

story.append(h3('1. Fix Favicon Brand Mismatch (5 minutes, massive impact)'))
story.append(body('The favicon SVG uses #6366f1 (indigo/purple) while the entire app uses teal (#0d9488) and cyan (#0891b2). A purple favicon on a teal app screams "unfinished." Replace public/favicon.svg with a teal-branded version using the Flarq "F" letterform. This is the single fastest fix with the highest visual impact.'))

story.append(h3('2. Make the Agent Page Actually Futuristic (1 hour, competition differentiator)'))
story.append(body('The FlarqOrb with orbiting dots is the single best visual element, but it vanishes after the first message. Once in conversation, the chat is indistinguishable from ChatGPT. Specific changes needed: (a) Add glassmorphism background with gradient from-slate-50 via-white to-primary-light/20; (b) Replace the plain "F" letter avatar with the actual Flarq logo mark from the SVG; (c) Add ambient glow behind assistant messages using absolute -inset-2 bg-primary/5 blur-xl; (d) Replace hover:rotate-45 on send button with hover:shadow glow and scale; (e) Render markdown in assistant responses using react-markdown; (f) Show a small pulsing FlarqOrb next to the typing indicator instead of basic bouncing bars.'))

story.append(h3('3. Fix All Broken teal-cta Hover States (30 minutes)'))
story.append(body('teal-cta is defined in @layer utilities as a plain CSS class. It works with className="teal-cta" but CANNOT be used with Tailwind modifiers like hover:, group-hover:, or focus:. The JIT compiler does not recognize it. This affects DashboardPage quick-actions (group-hover:teal-cta), ApplicationsPage priority pills, and AnalyzePage tone buttons. Fix: Replace every hover:teal-cta with hover:bg-primary hover:text-white and register teal-cta as a Tailwind plugin component.'))

story.append(h3('4. Make Application Card Actions Visible on Mobile (15 minutes, critical UX bug)'))
story.append(body('ApplicationCard action buttons use opacity-0 group-hover:opacity-100, making them invisible on touch devices and inaccessible to keyboard users. On mobile, users cannot access Notes, Interview, CoverLetter, or Archive actions at all. Fix: Use opacity-100 on mobile with md:opacity-0 md:group-hover:opacity-100 to show actions always on touch devices while preserving the hover-reveal pattern on desktop.'))

story.append(h3('5. Elevate Landing Page Stats from Pills to Hero Numbers (15 minutes)'))
story.append(body('The current "10,000+ cover letters generated" stat is a tiny 12px pill that a judge will not even read. Social proof should be hero-scale. Replace the small pills with a bold, centered stat row: 3 columns with large numbers (text-4xl font-extrabold text-gradient) and descriptive labels underneath. This transforms the landing page from "explains" to "sells."'))

story.append(h2('Agent Page Verdict'))
story.append(body('<b>Not unique or futuristic enough for a competition winner.</b> The FlarqOrb is genuinely distinctive but disappears after the first message. Once in conversation, the interface is indistinguishable from any standard AI chat product (ChatGPT, Claude, etc.). The page has one unique element when it needs at least three. Key missing differentiators: no markdown rendering in responses, no streaming (fake character-by-character display via setInterval), no "thinking" visualization beyond basic bouncing bars, and no real-time tool execution display. The dark sidebar is a good start but the white chat panel feels disjointed against it. The send button hover:rotate-45 is gratuitous and slightly jarring. A proper AI agent interface should feel alive, ambient, and distinct from commodity chat products.'))

story.append(h2('Landing Page Verdict'))
story.append(body('<b>Barely converts.</b> A judge would understand what Flarq does from the subheadline ("analyzes job descriptions, identifies skill gaps, writes tailored cover letters, and tracks every application"), but they would not feel the value. The page lacks: a product screenshot or animated demo of the analysis flow, compelling social proof at hero scale, a clear "aha moment" showing the match score ring, and trust signals (company logos where users got hired, testimonials). The NodeGraph SVG is abstract art rather than a product preview. The "See how it works" link goes to /analyze which requires authentication, breaking the funnel for curious visitors. The page explains; it does not sell.'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART 3: MISSING FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('PART 3: Missing Features Audit'))

story.append(h2('Broken/Stubbed Flows'))

story.append(h3('Flow 1: Sign Up > Login > Dashboard'))
story.append(body('Works end-to-end but auth guard is disabled by default (VITE_REQUIRE_AUTH defaults to falsy). A judge can browse all protected routes without logging in, seeing broken loading states from failed API calls.'))

story.append(h3('Flow 2: Upload Resume > Parse > View Profile'))
story.append(body('Works end-to-end. All backend logic is real: file validation, text extraction (pdfminer + PyPDF2 fallback + python-docx), Gemini parsing, and confirm flow. Minor gap: skill remove button has no onClick handler (decorative only).'))

story.append(h3('Flow 3: Paste JD > Analyze > Gap Analysis > Cover Letter'))
story.append(body('Fully functional end-to-end. This is the strongest flow in the app. Gap analysis, match score, cover letter generation with 3 tones, copy to clipboard, and "Save & Track" all connect to real API endpoints. The jdHint search parameter from ApplicationsPage is not consumed by AnalyzePage, but this is minor.'))

story.append(h3('Flow 4: Add Application > Move Through Kanban'))
story.append(body('Works end-to-end with @dnd-kit drag-and-drop, optimistic updates, and real API calls. Notes modal, interview scheduling, and soft delete all functional. Layout requires wide viewport due to min-w-[220px] per column plus 720px outcomes section.'))

story.append(h3('Flow 5: View Analytics > See Real Charts'))
story.append(body('Works end-to-end with real MongoDB aggregations via MCP (response rate, company patterns, skill demand, timeline). 1-hour cache in analytics_cache collection. Empty data shows blank charts which could confuse judges.'))

story.append(h3('Flow 6: Chat with AI Agent > Get Real Responses'))
story.append(body('Works end-to-end with genuine Vertex AI function calling and 6 real MCP-backed tools. This is genuinely impressive. The agent has: get_profile_summary, search_applications, get_analytics_insight, get_stale_applications, generate_follow_up, and update_application_status. Conversation history persists. However, there is a fragile protobuf import fallback in agent_builder.py.'))

story.append(h3('Flow 7: Receive Stale Application Alerts'))
story.append(body('PARTIALLY IMPLEMENTED. Backend has check_stale_applications() and generate_follow_up_email() that work on-demand. Frontend shows stale count on Dashboard and Analytics. BUT: scheduler/__init__.py is empty with no periodic job. The AlertDocument model exists but is never used. No push notifications, no email sending, no in-app notification center. Alerts only appear when the user actively visits Dashboard or Analytics.'))

story.append(h2('Stubbed Features'))

stubbed = [
    ['Skill remove button', 'ProfilePage.tsx:244', 'Renders X icon but no onClick handler'],
    ['Privacy Policy page', 'LandingPage.tsx:272', 'Link to /privacy but no route exists'],
    ['Terms of Service page', 'LandingPage.tsx:274', 'Link to /terms but no route exists'],
    ['Settings icon (agent)', 'AgentPage.tsx:198', 'Purely decorative, no onClick'],
    ['AnalyticsRepository', 'analytics_repo.py', 'Comment says "Phase 2 placeholder"'],
    ['tools.py (old catalog)', 'agent/tools.py', 'Dead file with mongo.find that does not exist'],
    ['Scheduler', 'scheduler/__init__.py', 'Empty file, no cron/periodic implementation'],
    ['AlertDocument model', 'models/alert.py', 'Defined but never referenced or used'],
]
stub_data = [[Paragraph('<b>Feature</b>', header_cell_style), Paragraph('<b>Location</b>', header_cell_style), Paragraph('<b>Problem</b>', header_cell_style)]]
for feat, loc, prob in stubbed:
    stub_data.append([Paragraph(feat, cell_style), Paragraph(loc, cell_style), Paragraph(prob, cell_style)])
stub_table = Table(stub_data, colWidths=[0.22*CONTENT_W, 0.28*CONTENT_W, 0.50*CONTENT_W], hAlign='CENTER', repeatRows=1)
stub_cmds = [
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]
for i in range(1, len(stub_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    stub_cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
stub_table.setStyle(TableStyle(stub_cmds))
story.append(stub_table)

story.append(h2('What Judges Will Find in 10 Minutes'))
story.append(body('A judge spending 10 minutes clicking through the app would discover the following:'))
story.append(bullet('Landing page looks polished and animated but Privacy/Terms links are dead (redirect to /)'))
story.append(bullet('Can access dashboard without login if VITE_REQUIRE_AUTH is not set (likely in demo)'))
story.append(bullet('Resume upload works beautifully -- upload PDF, Gemini parses, profile populated'))
story.append(bullet('Job analysis is the star feature -- paste JD, get match score + gap analysis + cover letter'))
story.append(bullet('Kanban board drag-and-drop works, but requires wide screen and uses window.confirm() for delete'))
story.append(bullet('Analytics charts render with real data but look empty with no applications'))
story.append(bullet('AI Agent is the real deal -- converses with real tools and pulls actual data'))
story.append(bullet('Skill remove buttons on Profile page do nothing when clicked'))
story.append(bullet('No notification system, no scheduled tasks, no email sending'))
story.append(bullet('Favicon is purple while the entire app is teal -- immediate brand inconsistency'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART 4: PRE-DEPLOYMENT CHECKLIST
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('PART 4: Pre-Deployment Checklist'))

story.append(h2('Blockers'))

blockers = [
    ('CRITICAL', 'No frontend Dockerfile', 'No frontend/Dockerfile exists. For Cloud Run, the frontend must be built and served somehow. The docker-compose.yml only runs npm run dev. The backend does not serve static files. The frontend cannot be deployed as-is.'),
    ('CRITICAL', 'No .dockerignore', 'No .dockerignore file exists anywhere in the project. Docker will copy __pycache__, .venv, .git, node_modules, tests, etc. into the image, creating huge build contexts and slow builds.'),
    ('CRITICAL', 'Hardcoded localhost API URL', 'frontend/src/utils/constants.ts defaults to http://localhost:8000. VITE_API_URL must be set at BUILD time (vite build inlines env vars). If not set, the production bundle will call localhost.'),
    ('CRITICAL', 'Hardcoded localhost CORS', 'backend/app/core/config.py defaults FRONTEND_URL to http://localhost:3000. If not overridden in production, CORS will block ALL cross-origin requests from the deployed frontend.'),
    ('CRITICAL', 'VITE_REQUIRE_AUTH undocumented', 'The VITE_REQUIRE_AUTH env var is not in .env.example and defaults to falsy. In production, the app will be fully open without authentication.'),
]
story.append(make_issue_table(blockers))

story.append(h2('Configuration Needed'))

story.append(h3('Dockerfile Issues'))
story.append(bullet('No multi-stage build: final image includes build-essential, gcc, and all build artifacts (~200MB extra)'))
story.append(bullet('No USER directive: container runs as root (security risk for Cloud Run)'))
story.append(bullet('pytest and pytest-asyncio in production requirements.txt instead of dev requirements'))
story.append(bullet('uvicorn --reload flag in docker-compose.yml is development only'))

story.append(h3('Environment Variables'))
story.append(body('Required env vars that must be set for production:'))

env_vars = [
    ['MONGODB_URI', 'Yes', 'App crashes without it'],
    ['JWT_SECRET_KEY', 'Yes', 'App crashes without it'],
    ['GOOGLE_CLOUD_PROJECT', 'Yes', 'Vertex AI crashes without it'],
    ['FRONTEND_URL', 'Yes', 'CORS blocks everything if localhost'],
    ['VITE_API_URL', 'Yes (build-time)', 'Frontend calls localhost if not set'],
    ['VITE_REQUIRE_AUTH', 'Yes (build-time)', 'Auth disabled if not set to "true"'],
    ['MONGODB_DB_NAME', 'No', 'Defaults to "flarq"'],
    ['GOOGLE_CLOUD_LOCATION', 'No', 'Defaults to "us-central1"'],
    ['VERTEX_AI_MODEL', 'No', 'Defaults to "gemini-2.0-flash-001"'],
    ['ENVIRONMENT', 'No', 'Defaults to "development"'],
]
env_data = [[Paragraph('<b>Variable</b>', header_cell_style), Paragraph('<b>Required?</b>', header_cell_style), Paragraph('<b>Notes</b>', header_cell_style)]]
for var, req, note in env_vars:
    env_data.append([Paragraph(var, cell_style), Paragraph(req, cell_center_style), Paragraph(note, cell_style)])
env_table = Table(env_data, colWidths=[0.28*CONTENT_W, 0.15*CONTENT_W, 0.57*CONTENT_W], hAlign='CENTER', repeatRows=1)
env_cmds = [
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]
for i in range(1, len(env_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    env_cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
env_table.setStyle(TableStyle(env_cmds))
story.append(env_table)

story.append(h3('MongoDB Atlas Configuration'))
story.append(bullet('Connection string must allow Cloud Run IPs (use 0.0.0.0/0 or Private Service Connect)'))
story.append(bullet('MCP server subprocess also needs MONGODB_URI passed via os.environ'))
story.append(bullet('No connection pooling config in MongoClientManager (Motor defaults are usually fine)'))
story.append(bullet('ensure_indexes runs on every startup (idempotent but adds latency)'))
story.append(bullet('token_blocklist and analytics_cache need TTL indexes for cleanup'))

story.append(h3('Health Check'))
story.append(body('GET /health exists and returns {"status": "ok", "environment": "..."}. However, it does NOT verify MongoDB connectivity or Vertex AI availability. A judge testing during an outage would get 200 OK even if the database is down.'))

story.append(h3('MCP Subprocess Concerns'))
story.append(bullet('FlarqMCPClient spawns a Python subprocess via stdio_client(). On Cloud Run, the container needs both the main app AND the MCP server script.'))
story.append(bullet('Cloud Run read-only filesystem after startup could cause issues with subprocess approach.'))
story.append(bullet('MCP client reads os.environ["MONGODB_URI"] directly, bypassing the Settings model validation. KeyError if missing.'))
story.append(bullet('No graceful degradation: if MCP subprocess fails, all database operations fail.'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FINAL VERDICT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.extend(add_major_section('Final Verdict'))

story.append(h2('Score Prediction (Per Judging Criterion)'))

verdict_data = [
    [Paragraph('<b>Criterion</b>', header_cell_style), Paragraph('<b>Current</b>', header_cell_style), Paragraph('<b>After Fixes</b>', header_cell_style), Paragraph('<b>Notes</b>', header_cell_style)],
    [Paragraph('Innovation & Creativity', cell_style), Paragraph('7/10', cell_center_style), Paragraph('8/10', cell_center_style), Paragraph('Agent with real MCP tools is genuinely innovative; needs better visual differentiation'), Paragraph('  ', cell_style)],
    [Paragraph('Technical Complexity', cell_style), Paragraph('8/10', cell_center_style), Paragraph('8.5/10', cell_center_style), Paragraph('Vertex AI function calling + MCP + Kanban + aggregations is impressive; security holes hurt'), Paragraph('  ', cell_style)],
    [Paragraph('Design & UX', cell_style), Paragraph('6.5/10', cell_center_style), Paragraph('8/10', cell_center_style), Paragraph('Solid MVP but not competition-winning polish; favicon mismatch, broken hovers, generic agent page'), Paragraph('  ', cell_style)],
    [Paragraph('Completeness', cell_style), Paragraph('7/10', cell_center_style), Paragraph('8/10', cell_center_style), Paragraph('Core flows work end-to-end; alerts/scheduler stubbed, dead buttons, auth disabled by default'), Paragraph('  ', cell_style)],
    [Paragraph('Code Quality', cell_style), Paragraph('6/10', cell_center_style), Paragraph('7.5/10', cell_center_style), Paragraph('Dual architecture, near-zero tests, NoSQL injection, type safety issues'), Paragraph('  ', cell_style)],
    [Paragraph('Deployment Readiness', cell_style), Paragraph('3/10', cell_center_style), Paragraph('7/10', cell_center_style), Paragraph('No frontend Dockerfile, hardcoded localhost, no .dockerignore, auth disabled'), Paragraph('  ', cell_style)],
]
verdict_table = Table(verdict_data, colWidths=[0.22*CONTENT_W, 0.10*CONTENT_W, 0.10*CONTENT_W, 0.58*CONTENT_W], hAlign='CENTER', repeatRows=1)
verdict_cmds = [
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]
for i in range(1, len(verdict_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    verdict_cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
verdict_table.setStyle(TableStyle(verdict_cmds))
story.append(verdict_table)
story.append(Spacer(1, 18))

story.append(h2('Ready to Deploy?'))
story.append(Paragraph('<b>No.</b> The application has critical deployment blockers: no frontend Dockerfile, hardcoded localhost URLs in both frontend and backend, no .dockerignore, and auth protection disabled by default. Additionally, the NoSQL injection vulnerability in the MCP server and the race condition in MCP session initialization pose serious security and reliability risks that must be addressed before any public deployment.', body_style))

story.append(h2('Top 3 Things to Fix Before Deployment'))

story.append(h3('1. Fix Critical Security Issues (2-3 hours)'))
story.append(body('The NoSQL injection vulnerability in the MCP server (unsanitized filters, unscoped aggregates, destructive pipeline stages) is the single most dangerous issue. Whitelist allowed filter operators ($eq, $in, $ne, $gte, $lte, $regex, $exists), enforce user_id scoping on all MCP aggregate/count operations, block destructive pipeline stages ($out, $merge, $currentOp), and add prompt input sanitization to all Gemini services. Also fix the regex injection in agent_tools.py by using re.escape() on user-provided strings.'))

story.append(h3('2. Create Production Deployment Configuration (2-4 hours)'))
story.append(body('Create a frontend/Dockerfile with multi-stage build (node:20 for build, nginx:alpine for serving). Add .dockerignore at project root. Remove --reload from backend production command. Add non-root USER directive. Set VITE_API_URL and VITE_REQUIRE_AUTH=true at build time. Set FRONTEND_URL environment variable for production CORS. Add health check that verifies MongoDB connectivity. Create proper docker-compose.prod.yml or Cloud Run service definitions.'))

story.append(h3('3. Fix the Three Most Visible UX Bugs (1-2 hours)'))
story.append(body('Fix the favicon brand mismatch (purple to teal, 5 minutes). Fix the broken teal-cta hover states across Dashboard, Applications, and Analyze pages (30 minutes). Make ApplicationCard action buttons visible on mobile by using opacity-100 md:opacity-0 md:group-hover:opacity-100 (15 minutes). Fix the typing animation re-run issue in MessageBubble by tracking animation completion with useRef (30 minutes). Wire up or remove the dead skill remove button on ProfilePage (15 minutes). These five fixes together would dramatically improve the judge experience without touching backend code.'))

# ━━ Build ━━
doc.multiBuild(story)
print(f'PDF generated: {output_path}')
