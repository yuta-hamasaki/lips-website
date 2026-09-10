type TicketEmailProps = {
  customerName: string
  eventName: string
  eventDate: Date | null
  venue: string | null
  ticketUrl: string
  qrImageSrc: string
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)

export function ticketEmailHtml(props: TicketEmailProps): string {
  const date = props.eventDate?.toLocaleDateString('en-CA', { dateStyle: 'long', timeZone: 'America/Vancouver' }) ?? 'Date to be announced'
  return `<!doctype html><html><body style="margin:0;background:#050305;color:#fff;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" style="max-width:600px;border:1px solid #432035;background:#090609"><tr><td style="padding:42px"><div style="color:#ff3292;font-size:42px;font-style:italic">LIPS.</div><p style="color:#ff8fc7;font-size:11px;letter-spacing:3px">YOUR LIPS TICKET IS READY</p><h1 style="font-size:30px;font-weight:normal">${escapeHtml(props.eventName)}</h1><p>Hello ${escapeHtml(props.customerName)},</p><p style="line-height:1.8;color:#ddd">${escapeHtml(date)}<br>${escapeHtml(props.venue ?? 'Venue to be announced')}</p><p style="text-align:center;padding:20px"><img src="${escapeHtml(props.qrImageSrc)}" width="220" height="220" alt="Ticket QR code" style="background:#fff;padding:10px"></p><p style="text-align:center"><a href="${escapeHtml(props.ticketUrl)}" style="display:inline-block;background:#ff3292;color:#090609;text-decoration:none;padding:17px 30px;border-radius:30px;font-weight:bold">VIEW YOUR TICKET</a></p><p style="font-size:12px;color:#aaa;word-break:break-all">If the QR image does not load, open your ticket:<br><a href="${escapeHtml(props.ticketUrl)}" style="color:#ff8fc7">${escapeHtml(props.ticketUrl)}</a></p></td></tr></table></td></tr></table></body></html>`
}
