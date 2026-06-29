"""PDF report generation service using ReportLab."""
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
)

STATUS_LABELS = {
    "GEPLANT": "Geplant",
    "IN_BEARBEITUNG": "In Bearbeitung",
    "QUALITAETSPRUEFUNG": "Qualitätsprüfung",
    "ABGESCHLOSSEN": "Abgeschlossen",
    "FEHLGESCHLAGEN": "Fehlgeschlagen",
}

PRIORITY_LABELS = {"HOCH": "Hoch", "MITTEL": "Mittel", "NIEDRIG": "Niedrig"}


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "SectionHeader", parent=styles["Heading2"],
        spaceAfter=6, spaceBefore=12, textColor=colors.HexColor("#1e3a5f"),
    ))
    styles.add(ParagraphStyle(
        "MetricLabel", parent=styles["Normal"],
        fontSize=9, textColor=colors.gray,
    ))
    styles.add(ParagraphStyle(
        "MetricValue", parent=styles["Normal"],
        fontSize=14, textColor=colors.HexColor("#111827"), leading=18,
    ))
    return styles


def _header(elements, styles, title: str, subtitle: str = ""):
    elements.append(Paragraph(title, styles["Title"]))
    if subtitle:
        elements.append(Paragraph(subtitle, styles["Normal"]))
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 6 * mm))


def _kpi_table(data: list[tuple[str, str]]) -> Table:
    """Create a horizontal KPI bar: [(label, value), ...]."""
    labels = [Paragraph(f'<font size="8" color="#6b7280">{d[0]}</font>') for d in data]
    values = [Paragraph(f'<font size="14"><b>{d[1]}</b></font>') for d in data]
    t = Table([values, labels], colWidths=[120] * len(data))
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _data_table(headers: list[str], rows: list[list[str]], col_widths=None) -> Table:
    """Standard data table with header row."""
    header_cells = [Paragraph(f'<font size="8" color="white"><b>{h}</b></font>') for h in headers]
    body = []
    for row in rows:
        body.append([Paragraph(f'<font size="8">{cell}</font>') for cell in row])
    t = Table([header_cells] + body, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ]))
    return t


def _footer_text() -> str:
    return f"ERP Integration Platform — Erstellt am {datetime.utcnow().strftime('%d.%m.%Y um %H:%M Uhr')}"


# ── Company Report PDF ──────────────────────────────────────────────────

def generate_company_report_pdf(data: dict) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _styles()
    el = []

    _header(el, styles, "Unternehmens-Report", _footer_text())

    # KPIs
    orders = data["orders"]
    perf = data["performance"]
    el.append(Paragraph("Kennzahlen", styles["SectionHeader"]))
    el.append(_kpi_table([
        ("Gesamt", str(orders["total"])),
        ("Offen", str(orders["open"])),
        ("Abgeschlossen", str(orders["completed"])),
        ("Fehlgeschlagen", str(orders["failed"])),
        ("Überfällig", str(orders["overdue"])),
    ]))
    el.append(Spacer(1, 4 * mm))

    # Performance
    el.append(Paragraph("Leistungskennzahlen", styles["SectionHeader"]))
    el.append(_kpi_table([
        ("Effizienz", f'{perf["efficiency_percent"]}%'),
        ("Ø Durchlaufzeit", f'{perf["avg_throughput_hours"]}h'),
        ("Aktive Nutzer", f'{data["workforce"]["active_users"]}/{data["workforce"]["total_users"]}'),
    ]))
    el.append(Spacer(1, 4 * mm))

    # Status breakdown table
    if orders.get("by_status"):
        el.append(Paragraph("Aufträge nach Status", styles["SectionHeader"]))
        rows = [[STATUS_LABELS.get(s, s), str(c)] for s, c in orders["by_status"].items()]
        el.append(_data_table(["Status", "Anzahl"], rows, col_widths=[200, 80]))
        el.append(Spacer(1, 4 * mm))

    # Priority breakdown
    if orders.get("by_priority"):
        el.append(Paragraph("Aufträge nach Priorität", styles["SectionHeader"]))
        rows = [[PRIORITY_LABELS.get(p, p), str(c)] for p, c in orders["by_priority"].items()]
        el.append(_data_table(["Priorität", "Anzahl"], rows, col_widths=[200, 80]))
        el.append(Spacer(1, 4 * mm))

    # Department load
    if perf.get("department_load"):
        el.append(Paragraph("Abteilungsauslastung (offene Aufträge)", styles["SectionHeader"]))
        rows = [[dept, str(count)] for dept, count in perf["department_load"].items()]
        el.append(_data_table(["Abteilung", "Offene Aufträge"], rows, col_widths=[200, 100]))
        el.append(Spacer(1, 4 * mm))

    # Trends
    if data["trends"].get("orders_per_day_7d"):
        el.append(Paragraph("Neue Aufträge (letzte 7 Tage)", styles["SectionHeader"]))
        rows = [[day, str(count)] for day, count in data["trends"]["orders_per_day_7d"].items()]
        el.append(_data_table(["Datum", "Neue Aufträge"], rows, col_widths=[200, 100]))

    doc.build(el)
    buf.seek(0)
    return buf


# ── Department Report PDF ───────────────────────────────────────────────

def generate_department_report_pdf(data: dict) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _styles()
    el = []

    dept_name = data["department"]["name"]
    _header(el, styles, f"Abteilungsbericht: {dept_name}", _footer_text())

    orders = data["orders"]
    metrics = data["metrics"]

    # KPIs
    el.append(Paragraph("Auftragsübersicht", styles["SectionHeader"]))
    el.append(_kpi_table([
        ("Gesamt", str(orders["total"])),
        ("Abgeschlossen", str(orders["completed"])),
        ("Fehlgeschlagen", str(orders["failed"])),
        ("Überfällig", str(orders["overdue"])),
    ]))
    el.append(Spacer(1, 4 * mm))

    # Metrics
    el.append(Paragraph("Leistungskennzahlen", styles["SectionHeader"]))
    el.append(_kpi_table([
        ("Fehlerquote", f'{metrics["error_rate_percent"]}%'),
        ("Liefertreue", f'{metrics["delivery_rate_percent"]}%'),
        ("Ø Durchlaufzeit", f'{metrics["avg_throughput_hours"]}h'),
    ]))
    el.append(Spacer(1, 4 * mm))

    # Status breakdown
    el.append(Paragraph("Aufträge nach Status", styles["SectionHeader"]))
    status_rows = [
        ["Geplant", str(orders["planned"])],
        ["In Bearbeitung", str(orders["in_progress"])],
        ["Qualitätsprüfung", str(orders["in_qa"])],
        ["Abgeschlossen", str(orders["completed"])],
        ["Fehlgeschlagen", str(orders["failed"])],
    ]
    el.append(_data_table(["Status", "Anzahl"], status_rows, col_widths=[200, 80]))
    el.append(Spacer(1, 4 * mm))

    # By priority
    if orders.get("by_priority"):
        el.append(Paragraph("Aufträge nach Priorität", styles["SectionHeader"]))
        rows = [[PRIORITY_LABELS.get(p, p), str(c)] for p, c in orders["by_priority"].items()]
        el.append(_data_table(["Priorität", "Anzahl"], rows, col_widths=[200, 80]))

    doc.build(el)
    buf.seek(0)
    return buf


# ── Order Detail PDF ────────────────────────────────────────────────────

def generate_order_detail_pdf(order, dept_name: str, assignee_name: str, history: list) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _styles()
    el = []

    _header(el, styles, f"Auftrag: {order.order_number}", _footer_text())

    # Order info
    el.append(Paragraph("Auftragsdetails", styles["SectionHeader"]))
    info_rows = [
        ["Auftragsnummer", order.order_number],
        ["Artikel", order.article],
        ["Menge", f"{order.quantity:,}".replace(",", ".")],
        ["Status", STATUS_LABELS.get(order.status, order.status)],
        ["Priorität", PRIORITY_LABELS.get(order.priority, order.priority or "-")],
        ["Abteilung", dept_name or "-"],
        ["Zugewiesen an", assignee_name or "-"],
        ["Fälligkeitsdatum", order.due_date.strftime("%d.%m.%Y") if order.due_date else "-"],
        ["Erstellt", order.created_at.strftime("%d.%m.%Y %H:%M") if order.created_at else "-"],
        ["Letzte Änderung", order.updated_at.strftime("%d.%m.%Y %H:%M") if order.updated_at else "-"],
    ]
    el.append(_data_table(["Feld", "Wert"], info_rows, col_widths=[150, 330]))
    el.append(Spacer(1, 4 * mm))

    # Notes
    if order.notes:
        el.append(Paragraph("Notizen", styles["SectionHeader"]))
        # Escape HTML special chars for safe rendering
        safe_notes = (order.notes
                      .replace("&", "&amp;")
                      .replace("<", "&lt;")
                      .replace(">", "&gt;")
                      .replace("\n", "<br/>"))
        el.append(Paragraph(f'<font size="9">{safe_notes}</font>', styles["Normal"]))
        el.append(Spacer(1, 4 * mm))

    # History
    if history:
        el.append(Paragraph("Änderungsverlauf", styles["SectionHeader"]))
        action_labels = {
            "CREATE": "Erstellt",
            "UPDATE": "Bearbeitet",
            "STATUS_CHANGE": "Statusänderung",
            "COMMENT": "Kommentar",
            "DELETE": "Gelöscht",
        }
        hist_rows = []
        for h in history:
            ts = h.created_at.strftime("%d.%m.%Y %H:%M") if h.created_at else "-"
            action = action_labels.get(h.action, h.action)
            user = h.username or "-"
            detail_str = ""
            if h.detail:
                import json
                try:
                    d = json.loads(h.detail)
                    if d.get("from") and d.get("to"):
                        detail_str = f'{STATUS_LABELS.get(d["from"], d["from"])} → {STATUS_LABELS.get(d["to"], d["to"])}'
                    if d.get("comment"):
                        detail_str += f' "{d["comment"]}"' if detail_str else f'"{d["comment"]}"'
                except (json.JSONDecodeError, TypeError):
                    detail_str = str(h.detail)[:80]
            hist_rows.append([ts, user, action, detail_str])
        el.append(_data_table(
            ["Zeitpunkt", "Benutzer", "Aktion", "Details"],
            hist_rows,
            col_widths=[95, 80, 90, 215],
        ))

    doc.build(el)
    buf.seek(0)
    return buf


# ── Orders List PDF ─────────────────────────────────────────────────────

def generate_orders_list_pdf(orders, depts: dict) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm,
                            leftMargin=12 * mm, rightMargin=12 * mm)
    styles = _styles()
    el = []

    _header(el, styles, "Auftragsliste", _footer_text())

    el.append(Paragraph(f"{len(orders)} Aufträge", styles["Normal"]))
    el.append(Spacer(1, 4 * mm))

    rows = []
    for o in orders:
        rows.append([
            o.order_number,
            o.article[:25],
            str(o.quantity),
            STATUS_LABELS.get(o.status, o.status),
            PRIORITY_LABELS.get(o.priority, o.priority or "-"),
            depts.get(o.department_id, "-"),
            o.due_date.strftime("%d.%m.%Y") if o.due_date else "-",
        ])

    el.append(_data_table(
        ["Auftragsnr.", "Artikel", "Menge", "Status", "Priorität", "Abteilung", "Fällig"],
        rows,
        col_widths=[72, 90, 42, 72, 55, 75, 60],
    ))

    doc.build(el)
    buf.seek(0)
    return buf
