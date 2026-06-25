import nodemailer from 'nodemailer'

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string
  subject: string
  text: string
}) {
  const pass = (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s/g, '')

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass,
    },
  })

  await transporter.verify()

  const info = await transporter.sendMail({
    from: `abeille <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  })

  console.log('[abeille] email sent:', info.messageId, '→', to)
}