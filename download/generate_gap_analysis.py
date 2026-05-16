#!/usr/bin/env python3
"""Generate FLARQ Hackathon Compliance Gap Analysis PDF Report."""

import os, sys

# ── Palette (auto-generated) ──
from reportlab.lib import colors
ACCENT       = colors.HexColor('#542bd0')
TEXT_PRIMARY  = colors.HexColor('#1f2122')
TEXT_MUTED    = colors.HexColor('#7f878b')
BG_SURFACE   = colors.HexColor('#dadfe1')
BG_PAGE      = colors.HexColor('#edeff0')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ── Imports ──
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, CondPageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Font Registration ──
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif-Bold')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

# ── Page Setup ──
PAGE_W, PAGE_H = A4
LEFT_M = 0.9 * inch
RIGHT_M = 0.9 * inch
TOP_M = 0.8 * inch
BOT_M = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

# ── Styles ──
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'ReportTitle', fontName='LiberationSerif', fontSize=28,
    leading=34, textColor=ACCENT, spaceAfter=6, alignment=TA_LEFT
)
subtitle_style = ParagraphStyle(
    'ReportSubtitle', fontName='LiberationSerif', fontSize=14,
    leading=18, textColor=TEXT_MUTED, spaceAfter=18, alignment=TA_LEFT
)
h1_style = ParagraphStyle(
    'H1', fontName='LiberationSerif', fontSize=20,
    leading=26, textColor=ACCENT, spaceBefore=18, spaceAfter=10
)
h2_style = ParagraphStyle(
    'H2', fontName='LiberationSerif', fontSize=15,
    leading=20, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8
)
h3_style = ParagraphStyle(
    'H3', fontName='LiberationSerif', fontSize=12,
    leading=16, textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6
)
body_style = ParagraphStyle(
    'Body', fontName='LiberationSerif', fontSize=10.5,
    leading=16, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY,
    spaceBefore=2, spaceAfter=6
)
body_left = ParagraphStyle(
    'BodyLeft', fontName='LiberationSerif', fontSize=10.5,
    leading=16, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=2, spaceAfter=6
)
bullet_style = ParagraphStyle(
    'Bullet', fontName='LiberationSerif', fontSize=10.5,
    leading=16, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=20, bulletIndent=8, spaceBefore=2, spaceAfter=4
)
callout_style = ParagraphStyle(
    'Callout', fontName='LiberationSerif', fontSize=10.5,
    leading=16, textColor=ACCENT, alignment=TA_LEFT,
    leftIndent=16, borderPadding=6, spaceBefore=6, spaceAfter=6
)
muted_style = ParagraphStyle(
    'Muted', fontName='LiberationSerif', fontSize=9,
    leading=13, textColor=TEXT_MUTED, alignment=TA_LEFT,
    spaceBefore=2, spaceAfter=4
)
header_cell = ParagraphStyle(
    'HeaderCell', fontName='LiberationSerif', fontSize=10,
    leading=14, textColor=colors.white, alignment=TA_CENTER
)
cell_style = ParagraphStyle(
    'Cell', fontName='LiberationSerif', fontSize=9.5,
    leading=14, textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
cell_center = ParagraphStyle(
    'CellCenter', fontName='LiberationSerif', fontSize=9.5,
    leading=14, textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
cell_bold = ParagraphStyle(
    'CellBold', fontName='LiberationSerif', fontSize=9.5,
    leading=14, textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
red_cell = ParagraphStyle(
    'RedCell', fontName='LiberationSerif', fontSize=9.5,
    leading=14, textColor=colors.HexColor('#dc2626'), alignment=TA_CENTER
)
green_cell = ParagraphStyle(
    'GreenCell', fontName='LiberationSerif', fontSize=9.5,
    leading=14, textColor=colors.HexColor('#059669'), alignment=TA_CENTER
)
amber_cell = ParagraphStyle(
    'AmberCell', fontName='LiberationSerif', fontSize=9.5,
    leading=14, textColor=colors.HexColor('#d97706'), alignment=TA_CENTER
)

# ── Helper Functions ──
def make_table(headers, rows, col_widths=None):
    """Create a styled table with header row."""
    header_row = [Paragraph(f'<b>{h}</b>', header_cell) for h in headers]
    data = [header_row] + rows
    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def status_cell(status):
    """Return a styled Paragraph for compliance status."""
    if status == 'COMPLIANT' or status == 'YES':
        return Paragraph('COMPLIANT', green_cell)
    elif status == 'NON-COMPLIANT' or status == 'NO':
        return Paragraph('NON-COMPLIANT', red_cell)
    elif status == 'PARTIAL':
        return Paragraph('PARTIAL', amber_cell)
    else:
        return Paragraph(status, cell_center)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', bullet_style)

# ── Build Document ──
output_path = '/home/z/my-project/download/FLARQ_Hackathon_Compliance_Gap_Analysis.pdf'

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='FLARQ Hackathon Compliance Gap Analysis',
    author='Z.ai',
    subject='Google Cloud Rapid Agent Hackathon - Compliance Assessment'
)

story = []

# ══════════════════════════════════════════════════════════
# PAGE 1: TITLE & EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 40))
story.append(Paragraph('<b>FLARQ Hackathon Compliance</b>', title_style))
story.append(Paragraph('<b>Gap Analysis Report</b>', title_style))
story.append(Spacer(1, 8))
story.append(Paragraph('Google Cloud Rapid Agent Hackathon - MongoDB Track', subtitle_style))
story.append(Paragraph('Assessment Date: May 17, 2026 | Version 2.0', muted_style))
story.append(Spacer(1, 12))
story.append(HRFlowable(width='100%', thickness=1.5, color=ACCENT, spaceBefore=6, spaceAfter=12))

# Executive Summary Box
exec_summary = (
    'This report evaluates the FLARQ project (flarq.ai) against every requirement of the '
    'Google Cloud Rapid Agent Hackathon. After a complete re-analysis of the codebase following '
    'recent changes, the project demonstrates strong engineering fundamentals with a genuine MCP '
    'integration and a well-structured frontend. However, it has <b>one critical compliance gap</b> '
    'that poses a disqualification risk: the project does not use <b>Google Cloud Agent Builder</b>, '
    'the centerpiece technology of this hackathon. Additionally, the project lacks a production '
    'deployment on Cloud Run, which is a submission requirement. Without addressing these two '
    'issues, the project cannot be competitively submitted.'
)
story.append(Paragraph('<b>Executive Summary</b>', h2_style))
story.append(Paragraph(exec_summary, body_style))
story.append(Spacer(1, 10))

# Verdict Box
verdict_data = [
    [Paragraph('<b>Assessment</b>', header_cell), Paragraph('<b>Status</b>', header_cell), Paragraph('<b>Risk Level</b>', header_cell)],
    [Paragraph('Overall Hackathon Compliance', cell_bold), Paragraph('NOT READY TO SUBMIT', red_cell), Paragraph('CRITICAL', red_cell)],
    [Paragraph('Google Cloud Agent Builder Usage', cell_bold), Paragraph('NON-COMPLIANT', red_cell), Paragraph('DISQUALIFICATION', red_cell)],
    [Paragraph('MCP + MongoDB Integration', cell_bold), Paragraph('COMPLIANT', green_cell), Paragraph('LOW', green_cell)],
    [Paragraph('Production Deployment (Cloud Run)', cell_bold), Paragraph('NON-COMPLIANT', red_cell), Paragraph('HIGH', red_cell)],
    [Paragraph('Open Source License', cell_bold), Paragraph('PARTIAL', amber_cell), Paragraph('MEDIUM', amber_cell)],
    [Paragraph('Design & UX Quality', cell_bold), Paragraph('GOOD', green_cell), Paragraph('LOW', green_cell)],
]
verdict_table = Table(verdict_data, colWidths=[CONTENT_W*0.45, CONTENT_W*0.30, CONTENT_W*0.25], hAlign='CENTER')
verdict_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#fef2f2')),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#fef2f2')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#f0fdf4')),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#fef2f2')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor('#fffbeb')),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#f0fdf4')),
]))
story.append(verdict_table)

story.append(Spacer(1, 12))

# Score overview
story.append(Paragraph('<b>Judging Criteria Estimated Scores</b>', h2_style))
scores_data = [
    [Paragraph('<b>Criterion</b>', header_cell), Paragraph('<b>Weight</b>', header_cell), Paragraph('<b>Score</b>', header_cell), Paragraph('<b>Key Gap</b>', header_cell)],
    [Paragraph('Technological Implementation', cell_style), Paragraph('25%', cell_center), Paragraph('5/10', amber_cell), Paragraph('No Agent Builder, no Cloud Run, no Secret Manager', cell_style)],
    [Paragraph('Design', cell_style), Paragraph('25%', cell_center), Paragraph('7/10', green_cell), Paragraph('Agent page is basic chatbot, no streaming', cell_style)],
    [Paragraph('Potential Impact', cell_style), Paragraph('25%', cell_center), Paragraph('7/10', green_cell), Paragraph('Crowded market, individual-level impact', cell_style)],
    [Paragraph('Quality of the Idea', cell_style), Paragraph('25%', cell_center), Paragraph('6/10', amber_cell), Paragraph('Not novel; Vector Search is stubbed', cell_style)],
]
scores_table = Table(scores_data, colWidths=[CONTENT_W*0.22, CONTENT_W*0.12, CONTENT_W*0.12, CONTENT_W*0.54], hAlign='CENTER')
scores_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
]))
story.append(scores_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Weighted Overall Score: 6.25 / 10</b> (but Agent Builder gap likely overrides scores)', callout_style))

# ══════════════════════════════════════════════════════════
# SECTION 1: HACKATHON REQUIREMENTS COMPLIANCE MATRIX
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>1. Hackathon Requirements Compliance Matrix</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'The hackathon states: "Build a functional agent - powered by Gemini and Google Cloud Agent Builder - '
    'that integrates a Partner Entity\'s MCP server to solve a real challenge." Below is a detailed '
    'assessment of FLARQ\'s compliance against each explicit requirement from the problem statement.',
    body_style
))
story.append(Spacer(1, 8))

# Core requirement table
req_data = [
    [Paragraph('<b>Requirement</b>', header_cell), Paragraph('<b>Status</b>', header_cell), Paragraph('<b>Evidence / Gap</b>', header_cell)],
    [Paragraph('Powered by Gemini', cell_style), status_cell('COMPLIANT'),
     Paragraph('Uses vertexai.generative_models.GenerativeModel (gemini-2.0-flash-001) via Vertex AI SDK. 6 function declarations for tool use. Retry logic with exponential backoff.', cell_style)],
    [Paragraph('Powered by Google Cloud Agent Builder', cell_style), status_cell('NON-COMPLIANT'),
     Paragraph('AGENT_BUILDER_ID field exists in config.py but is NEVER referenced anywhere in codebase. The agent loop is a custom implementation using raw GenerativeModel.generate_with_tools(). No google-cloud-discoveryengine or Agent Platform SDK in requirements.txt.', cell_style)],
    [Paragraph('Move Beyond Chat (use tools)', cell_style), status_cell('COMPLIANT'),
     Paragraph('Agent uses 6 tools: get_profile_summary, search_applications, get_analytics_insight, get_stale_applications, generate_follow_up, update_application_status. These accomplish real tasks, not just Q&A.', cell_style)],
    [Paragraph('Multi-Step Mission (plan + execute)', cell_style), status_cell('PARTIAL'),
     Paragraph('Agent loop runs max 8 iterations with tool chaining. Gemini can chain calls (e.g., find stale apps then generate follow-up). However, there is no explicit planning step shown to the user, and no human-in-the-loop confirmation before actions.', cell_style)],
    [Paragraph('Partner MCP Integration (MongoDB)', cell_style), status_cell('COMPLIANT'),
     Paragraph('Genuine MCP server with 9 MongoDB tools via proper MCP SDK (stdio transport). All data operations flow through MCP: analytics aggregations, profile lookups, application CRUD, conversation storage. Collection allowlist prevents arbitrary access.', cell_style)],
    [Paragraph('Hosted Project URL', cell_style), status_cell('NON-COMPLIANT'),
     Paragraph('No cloudbuild.yaml, no Cloud Run deployment, no CI/CD pipeline. Only docker-compose.yml for local development. No evidence of any cloud deployment.', cell_style)],
    [Paragraph('Public Repo with License', cell_style), status_cell('PARTIAL'),
     Paragraph('MIT License exists at repo root (good). But copyright year says 2026 (likely typo). Also, README.md has zero setup instructions and does not mention Agent Builder.', cell_style)],
    [Paragraph('Demo Video (~3 min)', cell_style), status_cell('PARTIAL'),
     Paragraph('No video found in repo (expected - typically uploaded to YouTube/Devpost separately). Cannot verify. Must be created before submission.', cell_style)],
]
req_table = Table(req_data, colWidths=[CONTENT_W*0.28, CONTENT_W*0.16, CONTENT_W*0.56], hAlign='CENTER')
style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(req_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
req_table.setStyle(TableStyle(style_cmds))
story.append(req_table)

# ══════════════════════════════════════════════════════════
# SECTION 2: CRITICAL GAP - GOOGLE CLOUD AGENT BUILDER
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>2. Critical Gap: Google Cloud Agent Builder (Disqualification Risk)</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'This is the single most important finding in this entire audit. The hackathon\'s core requirement '
    'explicitly states: "Build a functional agent - powered by Gemini and <b>Google Cloud Agent Builder</b>." '
    'The current FLARQ implementation uses the raw Vertex AI SDK directly, bypassing Agent Builder entirely. '
    'This is not a minor gap; it is a fundamental architectural mismatch with the hackathon\'s primary '
    'technology requirement. Judges will immediately notice this absence, and it could result in '
    'disqualification regardless of the project\'s other merits.',
    body_style
))

story.append(Paragraph('<b>2.1 Current Architecture vs. Required Architecture</b>', h2_style))
arch_data = [
    [Paragraph('<b>Aspect</b>', header_cell), Paragraph('<b>Current Implementation</b>', header_cell), Paragraph('<b>Required by Hackathon</b>', header_cell)],
    [Paragraph('Agent Framework', cell_style),
     Paragraph('Custom hand-rolled ReAct loop in agent_builder.py (max 8 iterations)', cell_style),
     Paragraph('Google Cloud Agent Builder (managed orchestration, grounding, tool use)', cell_style)],
    [Paragraph('Gemini Integration', cell_style),
     Paragraph('Direct vertexai.generative_models.GenerativeModel + generate_with_tools()', cell_style),
     Paragraph('Agent Builder SDK with extensions, data stores, and deployment', cell_style)],
    [Paragraph('Tool Registration', cell_style),
     Paragraph('Manual FunctionDeclaration objects in vertex_client.py', cell_style),
     Paragraph('Agent Builder Extensions (pre-built or custom API extensions)', cell_style)],
    [Paragraph('Knowledge/Grounding', cell_style),
     Paragraph('None - no data store, no grounding', cell_style),
     Paragraph('Agent Builder Data Stores (index PDFs, websites, BigQuery)', cell_style)],
    [Paragraph('Deployment', cell_style),
     Paragraph('Docker + FastAPI (manual)', cell_style),
     Paragraph('Agent Builder Deployment (web interface + API) or Cloud Run', cell_style)],
    [Paragraph('Safety', cell_style),
     Paragraph('None - no SafetySettings configured', cell_style),
     Paragraph('Gemini Enterprise Agent Platform Safety Settings', cell_style)],
    [Paragraph('State/Secrets', cell_style),
     Paragraph('.env file (plaintext)', cell_style),
     Paragraph('Google Secret Manager', cell_style)],
]
arch_table = Table(arch_data, colWidths=[CONTENT_W*0.18, CONTENT_W*0.41, CONTENT_W*0.41], hAlign='CENTER')
arch_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(arch_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    arch_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
arch_table.setStyle(TableStyle(arch_style_cmds))
story.append(arch_table)

story.append(Spacer(1, 10))
story.append(Paragraph('<b>2.2 Dead Config Proof</b>', h2_style))
story.append(Paragraph(
    'The config.py file defines an agent_builder_id field (line 28), and .env.example includes '
    'AGENT_BUILDER_ID= (empty). However, a search of the entire codebase reveals zero references '
    'to settings.agent_builder_id anywhere in the business logic. This field was likely added to '
    '"check the box" but was never wired to the Agent Builder API. The requirements.txt also has no '
    'google-cloud-discoveryengine or google-cloud-agentplatform package. This is the strongest '
    'evidence that Agent Builder was planned but never implemented.',
    body_style
))

story.append(Paragraph('<b>2.3 Phase 1-5 Technology Compliance</b>', h2_style))
story.append(Paragraph(
    'The hackathon outlines a 5-phase technical journey with specific Google Cloud technologies. '
    'Here is FLARQ\'s coverage across all recommended phases:',
    body_style
))
phase_data = [
    [Paragraph('<b>Phase</b>', header_cell), Paragraph('<b>Technology</b>', header_cell), Paragraph('<b>Used?</b>', header_cell)],
    [Paragraph('Phase 1', cell_style), Paragraph('Gemini Enterprise Agent Platform API', cell_style), status_cell('PARTIAL')],
    [Paragraph('Phase 1', cell_style), Paragraph('Agent Builder Guide (low-code path)', cell_style), status_cell('NO')],
    [Paragraph('Phase 1', cell_style), Paragraph('Agent Platform SDK for Python', cell_style), status_cell('NO')],
    [Paragraph('Phase 2', cell_style), Paragraph('Agent Builder Extensions (tool use)', cell_style), status_cell('PARTIAL')],
    [Paragraph('Phase 2', cell_style), Paragraph('Agent Builder Data Stores (grounding)', cell_style), status_cell('NO')],
    [Paragraph('Phase 3', cell_style), Paragraph('MongoDB MCP Integration', cell_style), status_cell('YES')],
    [Paragraph('Phase 4', cell_style), Paragraph('Agent Runtime (orchestration)', cell_style), status_cell('NO')],
    [Paragraph('Phase 4', cell_style), Paragraph('Secret Manager', cell_style), status_cell('NO')],
    [Paragraph('Phase 5', cell_style), Paragraph('Cloud Run Deployment', cell_style), status_cell('NO')],
    [Paragraph('Phase 5', cell_style), Paragraph('Safety Settings', cell_style), status_cell('NO')],
]
phase_table = Table(phase_data, colWidths=[CONTENT_W*0.12, CONTENT_W*0.63, CONTENT_W*0.25], hAlign='CENTER')
phase_style = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(phase_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    phase_style.append(('BACKGROUND', (0, i), (-1, i), bg))
phase_table.setStyle(TableStyle(phase_style))
story.append(phase_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Coverage: 1.5 / 10 technologies (15%)</b> - Only MongoDB MCP is fully compliant.', callout_style))

# ══════════════════════════════════════════════════════════
# SECTION 3: MCP INTEGRATION ASSESSMENT (MONGODB TRACK)
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>3. MCP Integration Assessment (MongoDB Track)</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'The MCP integration is the project\'s strongest point and the primary reason it can compete '
    'in the MongoDB track. FLARQ implements a genuine, custom MCP server with proper protocol '
    'compliance, not a thin wrapper around Motor. All data operations (except auth) flow through '
    'the MCP layer, giving the agent real superpowers over the user\'s data.',
    body_style
))

story.append(Paragraph('<b>3.1 MCP Protocol Compliance</b>', h2_style))
story.append(Paragraph(
    'The MCP server uses the official Python MCP SDK (mcp >= 1.0.0 in requirements.txt) with '
    'proper @server.list_tools() and @server.call_tool() decorators. The client uses ClientSession '
    'with stdio transport (StdioServerParameters), spawning the server as a subprocess. This is a '
    'real MCP implementation, not a REST API wrapper. The server exposes 9 tools covering the full '
    'CRUD spectrum plus aggregation and vector search.',
    body_style
))

story.append(Paragraph('<b>3.2 MongoDB Feature Depth</b>', h2_style))
mongo_data = [
    [Paragraph('<b>Feature</b>', header_cell), Paragraph('<b>Status</b>', header_cell), Paragraph('<b>Details</b>', header_cell)],
    [Paragraph('Aggregation Pipeline', cell_style), status_cell('COMPLIANT'),
     Paragraph('4 dedicated modules with $lookup, $unwind, $group, $addFields, $convert, $dateToString. Cross-collection joins between applications and job_descriptions.', cell_style)],
    [Paragraph('Atlas Vector Search', cell_style), status_cell('PARTIAL'),
     Paragraph('$vectorSearch pipeline exists in MCP tool but catches all exceptions and returns []. No embedding generation code exists. This is dead/stub code.', cell_style)],
    [Paragraph('Atlas Text Search', cell_style), status_cell('PARTIAL'),
     Paragraph('One text index on requirements field. No $search queries - uses $regex instead. Should upgrade to Atlas Search for production.', cell_style)],
    [Paragraph('Change Streams', cell_style), status_cell('NO'),
     Paragraph('Not implemented. Would add real-time notifications for application status changes.', cell_style)],
    [Paragraph('Schema Introspection', cell_style), status_cell('YES'),
     Paragraph('mongodb_inspect_schema tool samples documents, extracts field names, shows indexes. Unique feature.', cell_style)],
    [Paragraph('Soft Delete Pattern', cell_style), status_cell('YES'),
     Paragraph('All deletes set deleted: true + deleted_at timestamp. No hard deletes anywhere.', cell_style)],
    [Paragraph('Collection Allowlist', cell_style), status_cell('YES'),
     Paragraph('ALLOWED_COLLECTIONS frozenset prevents arbitrary collection access. Security best practice.', cell_style)],
]
mongo_table = Table(mongo_data, colWidths=[CONTENT_W*0.22, CONTENT_W*0.16, CONTENT_W*0.62], hAlign='CENTER')
mongo_style = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(mongo_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    mongo_style.append(('BACKGROUND', (0, i), (-1, i), bg))
mongo_table.setStyle(TableStyle(mongo_style))
story.append(mongo_table)

story.append(Spacer(1, 10))
story.append(Paragraph('<b>3.3 MCP Integration Weakness: Auth Bypasses MCP</b>', h2_style))
story.append(Paragraph(
    'There is a dual data access pattern in the codebase. Auth endpoints use UserRepository with '
    'direct Motor (AsyncIOMotorDatabase) access, bypassing the MCP layer entirely. This undermines '
    'the "all data flows through MCP" narrative that would score highly with MongoDB judges. For '
    'maximum hackathon impact, even authentication should route through the MCP client.',
    body_style
))

# ══════════════════════════════════════════════════════════
# SECTION 4: FRONTEND & DESIGN ASSESSMENT
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>4. Frontend and Design Assessment</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'The frontend is built with React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, and '
    'TanStack Query. The overall design quality is good (7/10), with a cohesive teal-cyan color '
    'system and consistent component library. However, there are significant issues that would '
    'lower the "Design" judging score, particularly around the Agent page.',
    body_style
))

story.append(Paragraph('<b>4.1 Page-by-Page Design Scores</b>', h2_style))
page_scores = [
    [Paragraph('<b>Page</b>', header_cell), Paragraph('<b>Score</b>', header_cell), Paragraph('<b>Key Issues</b>', header_cell)],
    [Paragraph('Landing Page', cell_style), Paragraph('7/10', cell_center), Paragraph('Dead "See how it works" link, no mobile hero visual, fabricated 10,000+ stat', cell_style)],
    [Paragraph('Auth Page', cell_style), Paragraph('8/10', cell_center), Paragraph('No Google OAuth button (critical for Google hackathon), no forgot password flow', cell_style)],
    [Paragraph('Dashboard', cell_style), Paragraph('7/10', cell_center), Paragraph('CSS hover bug (invalid group-hover:teal-cta), Sidebar component never rendered, no charts', cell_style)],
    [Paragraph('Profile', cell_style), Paragraph('6/10', cell_center), Paragraph('Dead skill remove buttons, 3 unused component files, no education section displayed', cell_style)],
    [Paragraph('Analyze', cell_style), Paragraph('8/10', cell_center), Paragraph('Best-designed page. No edit after submission, no save-as-draft', cell_style)],
    [Paragraph('Applications', cell_style), Paragraph('8/10', cell_center), Paragraph('Kanban breaks on mobile, window.confirm for delete, no edit modal', cell_style)],
    [Paragraph('Analytics', cell_style), Paragraph('6/10', cell_center), Paragraph('3 unused chart components, weakly typed data, hardcoded "30 days"', cell_style)],
    [Paragraph('Agent Page', cell_style), Paragraph('5/10', red_cell), Paragraph('BASIC CHATBOT, NOT AN AGENT. No streaming, no thinking steps, no rich responses, no markdown rendering', cell_style)],
]
page_table = Table(page_scores, colWidths=[CONTENT_W*0.18, CONTENT_W*0.10, CONTENT_W*0.72], hAlign='CENTER')
page_style = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('BACKGROUND', (0, 8), (-1, 8), colors.HexColor('#fef2f2')),  # Agent row highlighted
]
for i in range(1, len(page_scores)):
    if i != 8:  # Skip agent row (already highlighted)
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        page_style.append(('BACKGROUND', (0, i), (-1, i), bg))
page_table.setStyle(TableStyle(page_style))
story.append(page_table)

story.append(Spacer(1, 10))
story.append(Paragraph('<b>4.2 Agent Page: The Critical Weakness</b>', h2_style))
story.append(Paragraph(
    'The Agent page is the hackathon\'s centerpiece feature, yet it currently feels like a basic '
    'chatbot rather than a powerful AI agent. This is the single biggest design gap because the '
    'hackathon explicitly requires agents that "accomplish tasks" and "handle complex goals." '
    'When a user asks the agent to "find stale applications and draft follow-ups," the experience '
    'should feel like watching an intelligent assistant work through the problem step by step - not '
    'like waiting 10 seconds for a chatbot to dump a text response.',
    body_style
))

agent_gaps = [
    [Paragraph('<b>Feature</b>', header_cell), Paragraph('<b>Status</b>', header_cell), Paragraph('<b>Impact on Judges</b>', header_cell)],
    [Paragraph('Streaming responses', cell_style), status_cell('NO'), Paragraph('CRITICAL - 10s silence then dump feels laggy and unagent-like', cell_style)],
    [Paragraph('Real-time tool execution timeline', cell_style), status_cell('NO'), Paragraph('HIGH - chips appear after response, not during execution', cell_style)],
    [Paragraph('Thinking/reasoning visualization', cell_style), status_cell('NO'), Paragraph('HIGH - no "Analyzing your data..." step before tool calls', cell_style)],
    [Paragraph('Markdown rendering', cell_style), status_cell('NO'), Paragraph('HIGH - plain text responses look primitive', cell_style)],
    [Paragraph('Rich inline cards', cell_style), status_cell('NO'), Paragraph('MEDIUM - structured data shown as text, not interactive cards', cell_style)],
    [Paragraph('Cancel/abort button', cell_style), status_cell('NO'), Paragraph('LOW - code creates AbortController but no UI button', cell_style)],
    [Paragraph('Conversation management', cell_style), status_cell('PARTIAL'), Paragraph('LOW - sidebar works but no delete/rename', cell_style)],
]
agent_table = Table(agent_gaps, colWidths=[CONTENT_W*0.30, CONTENT_W*0.16, CONTENT_W*0.54], hAlign='CENTER')
agent_style = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(agent_gaps)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    agent_style.append(('BACKGROUND', (0, i), (-1, i), bg))
agent_table.setStyle(TableStyle(agent_style))
story.append(agent_table)

story.append(Spacer(1, 10))
story.append(Paragraph('<b>4.3 Dead Code and Performance Issues</b>', h2_style))
story.append(Paragraph(
    'The frontend contains 12 dead component/store files (~600 lines of unused code) that add '
    'bundle bloat and code confusion: ResumeUpload.tsx, ProfileCard.tsx, SkillTags.tsx, '
    'ResponseRateChart.tsx, PatternSummary.tsx, InsightCard.tsx, JDPasteBox.tsx, '
    'GapAnalysisCard.tsx, CoverLetterModal.tsx, Sidebar.tsx, profileStore.ts, applicationStore.ts. '
    'Additionally, there is no code splitting - all pages are eagerly imported, meaning Recharts '
    '(~450KB), Framer Motion (~150KB), and DnD Kit are loaded even on pages that do not use them. '
    'Lazy loading via React.lazy() and Suspense should be implemented for every page.',
    body_style
))

story.append(Paragraph('<b>4.4 Missing Google OAuth Button</b>', h2_style))
story.append(Paragraph(
    'This is a Google Cloud hackathon, and the auth page has no "Sign in with Google" button. '
    'This is a significant oversight that judges will notice immediately. Adding a Google OAuth '
    'button using @react-oauth/google would be a strong signal of Google Cloud integration and '
    'would improve both the Design and Technological Implementation scores.',
    body_style
))

# ══════════════════════════════════════════════════════════
# SECTION 5: SUBMISSION READINESS
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>5. Submission Readiness Checklist</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'The hackathon requires specific deliverables for submission. Below is the current status '
    'of each requirement, along with what needs to be done before the project can be submitted.',
    body_style
))

submit_data = [
    [Paragraph('<b>Deliverable</b>', header_cell), Paragraph('<b>Status</b>', header_cell), Paragraph('<b>Action Required</b>', header_cell)],
    [Paragraph('Hosted Project URL', cell_style), status_cell('NO'),
     Paragraph('Create cloudbuild.yaml, deploy backend + frontend to Cloud Run, configure environment variables and secrets. Estimated: 2-3 hours.', cell_style)],
    [Paragraph('Public GitHub Repository', cell_style), status_cell('PARTIAL'),
     Paragraph('Repo exists but README has no setup instructions, no mention of Agent Builder, and no architecture diagram. Must improve before judges review code.', cell_style)],
    [Paragraph('Open Source License (visible)', cell_style), status_cell('PARTIAL'),
     Paragraph('MIT License exists at root. Fix copyright year from 2026 to 2025. Ensure it is visible in GitHub About section.', cell_style)],
    [Paragraph('Demo Video (~3 min)', cell_style), status_cell('NO'),
     Paragraph('Must create a 3-minute demo video showing: problem statement, agent capabilities, MCP tool usage, and Google Cloud integration. Upload to YouTube, link on Devpost.', cell_style)],
    [Paragraph('Track Selection (MongoDB)', cell_style), status_cell('YES'),
     Paragraph('MCP integration with MongoDB is genuine and deep. MongoDB track is the correct choice.', cell_style)],
    [Paragraph('Devpost Submission Form', cell_style), status_cell('NO'),
     Paragraph('Must complete the Devpost form with project description, tech stack, what you built, how you built it, and challenges.', cell_style)],
]
submit_table = Table(submit_data, colWidths=[CONTENT_W*0.22, CONTENT_W*0.14, CONTENT_W*0.64], hAlign='CENTER')
submit_style = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(submit_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    submit_style.append(('BACKGROUND', (0, i), (-1, i), bg))
submit_table.setStyle(TableStyle(submit_style))
story.append(submit_table)

# ══════════════════════════════════════════════════════════
# SECTION 6: PRIORITY FIX LIST
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>6. Priority Fix List (Ordered by Impact)</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'Below are the specific fixes needed, ordered by their impact on hackathon qualification '
    'and scoring. Items marked "DISQUALIFICATION RISK" must be addressed before submission; '
    'the project cannot be competitively submitted without them.',
    body_style
))

fix_data = [
    [Paragraph('<b>#</b>', header_cell), Paragraph('<b>Fix</b>', header_cell), Paragraph('<b>Risk</b>', header_cell), Paragraph('<b>Est. Time</b>', header_cell), Paragraph('<b>Details</b>', header_cell)],
    [Paragraph('1', cell_center), Paragraph('Integrate Google Cloud Agent Builder', cell_bold), Paragraph('DISQUALIFY', red_cell), Paragraph('3-4 hrs', cell_center),
     Paragraph('Add google-cloud-discoveryengine to requirements. Create AgentBuilderClient class. Wire AGENT_BUILDER_ID config. Minimum: Agent Builder as first-pass routing, fall back to custom Vertex AI agent for complex tool calls.', cell_style)],
    [Paragraph('2', cell_center), Paragraph('Deploy to Cloud Run', cell_bold), Paragraph('DISQUALIFY', red_cell), Paragraph('2-3 hrs', cell_center),
     Paragraph('Create cloudbuild.yaml. Create frontend/Dockerfile (nginx). Create nginx.conf. Deploy both services. Configure secrets. Get hosted URL.', cell_style)],
    [Paragraph('3', cell_center), Paragraph('Add Secret Manager', cell_bold), Paragraph('HIGH', amber_cell), Paragraph('1 hr', cell_center),
     Paragraph('Add google-cloud-secret-manager to requirements. Create secrets.py module. Move MONGODB_URI and JWT_SECRET_KEY to Secret Manager. Update config.py to load from secrets.', cell_style)],
    [Paragraph('4', cell_center), Paragraph('Add Safety Settings to Gemini', cell_bold), Paragraph('MEDIUM', amber_cell), Paragraph('30 min', cell_center),
     Paragraph('Import SafetySetting, HarmCategory, HarmBlockThreshold from vertexai. Add DEFAULT_SAFETY_SETTINGS to all Gemini calls. Document in README.', cell_style)],
    [Paragraph('5', cell_center), Paragraph('Upgrade Agent Page UX', cell_bold), Paragraph('HIGH', amber_cell), Paragraph('4-6 hrs', cell_center),
     Paragraph('Add streaming (SSE). Show real-time tool execution timeline. Add markdown rendering (react-markdown). Add "thinking" indicator. Show progress per tool call. This is the #1 design improvement.', cell_style)],
    [Paragraph('6', cell_center), Paragraph('Add Google OAuth', cell_bold), Paragraph('MEDIUM', amber_cell), Paragraph('1-2 hrs', cell_center),
     Paragraph('Add "Sign in with Google" button on auth page. Use @react-oauth/google. Configure OAuth consent screen in GCP. Critical signal for Google Cloud hackathon.', cell_style)],
    [Paragraph('7', cell_center), Paragraph('Activate Atlas Vector Search', cell_bold), Paragraph('MEDIUM', amber_cell), Paragraph('2-3 hrs', cell_center),
     Paragraph('Generate embeddings using text-embedding-004. Create Atlas Vector Search index. Wire mongodb_vector_search MCP tool to return real results. This makes the MongoDB track competitive.', cell_style)],
    [Paragraph('8', cell_center), Paragraph('Fix README + License', cell_bold), Paragraph('LOW', green_cell), Paragraph('30 min', cell_center),
     Paragraph('Fix LICENSE year (2026 to 2025). Add setup instructions to README. Add architecture diagram. Mention Agent Builder, Gemini, MCP, Cloud Run. Make it judge-friendly.', cell_style)],
    [Paragraph('9', cell_center), Paragraph('Remove 12 dead frontend files', cell_bold), Paragraph('LOW', green_cell), Paragraph('15 min', cell_center),
     Paragraph('Delete: ResumeUpload.tsx, ProfileCard.tsx, SkillTags.tsx, ResponseRateChart.tsx, PatternSummary.tsx, InsightCard.tsx, JDPasteBox.tsx, GapAnalysisCard.tsx, CoverLetterModal.tsx, Sidebar.tsx, profileStore.ts, applicationStore.ts.', cell_style)],
    [Paragraph('10', cell_center), Paragraph('Add lazy loading (React.lazy)', cell_bold), Paragraph('LOW', green_cell), Paragraph('30 min', cell_center),
     Paragraph('Wrap every page in React.lazy() + Suspense. Critical for perceived performance in demos. Reduces initial bundle by ~600KB.', cell_style)],
]
fix_table = Table(fix_data, colWidths=[CONTENT_W*0.04, CONTENT_W*0.22, CONTENT_W*0.12, CONTENT_W*0.10, CONTENT_W*0.52], hAlign='CENTER')
fix_style = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]
for i in range(1, len(fix_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    fix_style.append(('BACKGROUND', (0, i), (-1, i), bg))
fix_table.setStyle(TableStyle(fix_style))
story.append(fix_table)

# ══════════════════════════════════════════════════════════
# SECTION 7: BACKEND CODE QUALITY
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>7. Backend Code Quality Assessment</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'While the primary focus of this audit is hackathon compliance, the backend code quality '
    'directly impacts the "Technological Implementation" judging criterion. Below are the key '
    'findings from the complete code review.',
    body_style
))

story.append(Paragraph('<b>7.1 Strengths</b>', h2_style))
strengths = [
    'MCP protocol implementation is genuinely correct and deep (not a wrapper) - all data operations flow through real MCP tool calls with proper @server.list_tools() and @server.call_tool() decorators.',
    'Aggregation pipelines are sophisticated and production-quality, using $lookup with $convert for cross-collection joins, multi-stage $group/$sort pipelines, and $dateToString for time-based analytics.',
    'Multi-step agent loop with parallel tool execution via asyncio.gather - up to 8 iterations with conversation history windowing.',
    'Security: JWT + bcrypt + token rotation + prompt injection defense + collection allowlist in MCP server + rate limiting on all endpoints.',
    'Structured logging with request IDs, exponential backoff for Vertex AI retries (3 attempts), and JSON parse fallback for Gemini responses.',
    'Docker + docker-compose ready for local development with proper volume mounts and env_file support.',
]
for s in strengths:
    story.append(bullet(s))

story.append(Paragraph('<b>7.2 Issues</b>', h2_style))
issues = [
    'No Agent Builder usage (CRITICAL - covered in Section 2). The hand-rolled agent loop is well-implemented but does not use the hackathon\'s required technology.',
    'Auth bypasses MCP layer - UserRepository uses direct Motor access instead of routing through the MCP client. This undermines the "all data through MCP" narrative.',
    'No Safety Settings on any Gemini call - the hackathon recommends configuring Gemini Enterprise Agent Platform Safety Settings, and their absence could be noticed by judges.',
    'MCP server spawns as a subprocess per container instance - the stdio transport works but is not ideal for Cloud Run. Consider SSE transport for production.',
    'No Cloud Run deployment configuration - no cloudbuild.yaml, no service.yaml, no Terraform. Only docker-compose for local dev.',
    'No Secret Manager integration - all secrets from .env file in plaintext. The hackathon recommends Google Secret Manager.',
    'Vector Search is scaffolded but non-functional - the $vectorSearch pipeline catches all exceptions and returns []. No embedding generation code exists.',
]
for s in issues:
    story.append(bullet(s))

# ══════════════════════════════════════════════════════════
# SECTION 8: RECOMMENDED ACTION PLAN
# ══════════════════════════════════════════════════════════
story.append(Spacer(1, 18))
story.append(Paragraph('<b>8. Recommended Action Plan</b>', h1_style))
story.append(HRFlowable(width='100%', thickness=0.5, color=ACCENT, spaceBefore=2, spaceAfter=10))

story.append(Paragraph(
    'Based on the findings in this audit, here is the recommended action plan organized by '
    'priority and timeline. The total estimated effort is 15-20 hours of focused development.',
    body_style
))

story.append(Paragraph('<b>8.1 Day 1: Critical Disqualification Fixes (6-7 hours)</b>', h2_style))
day1_items = [
    '<b>Agent Builder Integration (3-4 hrs):</b> Add google-cloud-discoveryengine to requirements.txt. Create an AgentBuilderClient class that uses the Discovery Engine ConversationalSearchService API. Wire the AGENT_BUILDER_ID config field. Minimum viable approach: Agent Builder as first-pass routing for simple queries, fall back to the custom Vertex AI agent for complex tool calls that require MCP interaction.',
    '<b>Cloud Run Deployment (2-3 hrs):</b> Create cloudbuild.yaml with build steps for backend and frontend. Create frontend/Dockerfile (multi-stage: Node build + Nginx serve). Create nginx.conf with SPA routing. Deploy both services to Cloud Run. Configure MONGODB_URI and JWT_SECRET_KEY as environment variables initially (upgrade to Secret Manager on Day 2). Get the hosted URL for submission.',
]
for item in day1_items:
    story.append(Paragraph(item, body_style))

story.append(Paragraph('<b>8.2 Day 2: High-Impact Score Improvements (5-7 hours)</b>', h2_style))
day2_items = [
    '<b>Agent Page UX Overhaul (4-6 hrs):</b> Add Server-Sent Events (SSE) for streaming responses. Implement real-time tool execution timeline showing each MCP tool call as it happens ("Searching your profile..." then "Running analytics..." then "Drafting follow-up..."). Add react-markdown + remark-gfm for rich response rendering. Add a "thinking" indicator before tool calls begin. These changes alone would bump the Agent page score from 5/10 to 8/10 and dramatically improve the demo experience.',
    '<b>Secret Manager Integration (1 hr):</b> Add google-cloud-secret-manager to requirements. Create a secrets.py module that loads MONGODB_URI, JWT_SECRET_KEY, and other sensitive values from Google Secret Manager. Update config.py to use Secret Manager as the primary source with .env fallback for local development.',
]
for item in day2_items:
    story.append(Paragraph(item, body_style))

story.append(Paragraph('<b>8.3 Day 3: Polish and Submission (4-6 hours)</b>', h2_style))
day3_items = [
    '<b>Safety Settings (30 min):</b> Add SafetySetting configurations for all four harm categories (harassment, hate speech, sexually explicit, dangerous content) at BLOCK_MEDIUM_AND_ABOVE threshold to every Gemini call.',
    '<b>Google OAuth (1-2 hrs):</b> Add "Sign in with Google" button to the auth page. Configure OAuth consent screen in Google Cloud Console. Use @react-oauth/google or similar library. This is a critical signal for a Google Cloud hackathon.',
    '<b>Atlas Vector Search (2-3 hrs):</b> Generate embeddings using text-embedding-004 model. Create Atlas Vector Search index on the embedding field. Wire the mongodb_vector_search MCP tool to return real semantic search results. This transforms the MongoDB integration from "good CRUD" to "intelligent search."',
    '<b>README and Submission Polish (1 hr):</b> Fix LICENSE year. Add comprehensive README with setup instructions, architecture diagram, Agent Builder mention, MCP explanation, and screenshots. Create Devpost submission. Record 3-minute demo video.',
]
for item in day3_items:
    story.append(Paragraph(item, body_style))

story.append(Spacer(1, 12))

# Final verdict
story.append(HRFlowable(width='100%', thickness=1.5, color=ACCENT, spaceBefore=6, spaceAfter=10))
story.append(Paragraph('<b>Final Verdict</b>', h2_style))
story.append(Paragraph(
    'FLARQ is a well-engineered project with a genuine MCP + MongoDB integration and a clean '
    'frontend. The team has built something that genuinely solves a real-world problem. However, '
    'in its current state, it <b>cannot be competitively submitted</b> to the Google Cloud Rapid '
    'Agent Hackathon because it does not use the hackathon\'s core required technology (Agent Builder) '
    'and lacks a production deployment on Cloud Run. The good news is that both of these gaps are '
    'fixable within 6-7 hours of focused work. The MCP integration and MongoDB feature depth are '
    'genuinely competitive - once Agent Builder and Cloud Run are added, this project has strong '
    'potential to place in the MongoDB track.',
    body_style
))
story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Recommendation:</b> Do not submit until Agent Builder integration and Cloud Run deployment '
    'are complete. These are not optional improvements - they are qualification requirements. Once '
    'fixed, focus the demo video on the agent\'s multi-step reasoning, real-time MCP tool execution, '
    'and the depth of the MongoDB integration (aggregation pipelines, vector search, schema '
    'introspection). This is what will differentiate FLARQ from other entries.',
    callout_style
))

# ── Build ──
doc.build(story)
print(f"PDF generated: {output_path}")
