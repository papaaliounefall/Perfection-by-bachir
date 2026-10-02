"""Génération du PDF de facture (ReportLab, sans dépendance système)."""

import io

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

GOLD = colors.HexColor("#B87D24")
DARK = colors.HexColor("#111317")


def fcfa(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " FCFA"


def render_invoice(invoice) -> bytes:
    business = settings.BUSINESS
    styles = getSampleStyleSheet()
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8.5, leading=11, textColor=colors.grey)
    normal = ParagraphStyle("n", parent=styles["Normal"], fontSize=9.5, leading=13)
    title = ParagraphStyle("t", parent=styles["Title"], fontSize=18, textColor=DARK, alignment=0, spaceAfter=2)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
        title=f"Facture {invoice.number}", author=business["name"],
    )
    customer = invoice.customer
    appointment = invoice.appointment
    vehicle = appointment.vehicle if appointment else None

    company = "<br/>".join(
        filter(None, [f"<b>{business['name']}</b>", business["address"], business["phone"], business["email"],
                      f"NINEA : {business['ninea']}" if business["ninea"] else ""])
    )
    billed = "<br/>".join(
        filter(None, ["<b>Facturé à</b>", customer.full_name, customer.address, customer.phone, customer.email])
    )
    header = Table(
        [[Paragraph(company, normal), Paragraph(billed, normal)]], colWidths=[95 * mm, 79 * mm]
    )
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))

    meta = [
        f"<b>Facture {invoice.number}</b>",
        f"Date d'émission : {timezone.localtime(invoice.issued_at):%d/%m/%Y}",
        f"Statut : {invoice.get_status_display()}",
    ]
    if appointment:
        meta.append(f"Rendez-vous : {appointment.reference}")
    if vehicle:
        meta.append(f"Véhicule : {vehicle.brand} {vehicle.model} — {vehicle.registration}")

    rows = [["Désignation", "Qté", "Prix unitaire", "Total"]]
    rows += [[Paragraph(l.label, normal), str(l.quantity), fcfa(l.unit_price), fcfa(l.total)] for l in invoice.lines.all()]
    rows.append(["", "", "Sous-total", fcfa(invoice.subtotal)])
    if invoice.discount:
        rows.append(["", "", "Remise", f"- {fcfa(invoice.discount)}"])
    rows.append(["", "", "Total", fcfa(invoice.total)])
    rows.append(["", "", "Déjà payé", fcfa(invoice.paid_amount)])
    rows.append(["", "", "Reste à payer", fcfa(invoice.balance)])
    lines = Table(rows, colWidths=[92 * mm, 14 * mm, 34 * mm, 34 * mm], repeatRows=1)
    n_lines = invoice.lines.count()
    lines.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("LINEBELOW", (0, 0), (-1, n_lines), 0.4, colors.lightgrey),
        ("FONTNAME", (2, -3), (-1, -3), "Helvetica-Bold"),
        ("FONTNAME", (2, -1), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (2, -1), (-1, -1), GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))

    story = [
        Paragraph(business["name"].upper(), title),
        Paragraph("L’excellence automobile, jusque dans les détails.", small),
        Spacer(1, 8 * mm),
        header,
        Spacer(1, 8 * mm),
        Paragraph("<br/>".join(meta), normal),
        Spacer(1, 6 * mm),
        lines,
    ]

    payments = [p for p in invoice.payments.all()]
    if payments:
        story += [Spacer(1, 6 * mm), Paragraph("<b>Paiements</b>", normal)]
        for p in payments:
            state = " (remboursé)" if p.refunded_at else ""
            story.append(Paragraph(
                f"{timezone.localtime(p.received_at):%d/%m/%Y} — {p.get_method_display()} — {fcfa(p.amount)}"
                f"{' — réf. ' + p.reference if p.reference else ''}{state}", small))
    if invoice.cancelled_at:
        story += [Spacer(1, 6 * mm), Paragraph(f"<b>FACTURE ANNULÉE</b> — {invoice.cancel_reason}", normal)]
    if invoice.notes:
        story += [Spacer(1, 6 * mm), Paragraph(invoice.notes, small)]
    story += [Spacer(1, 10 * mm), Paragraph("Montants exprimés en francs CFA (XOF).", small)]

    doc.build(story)
    return buffer.getvalue()
