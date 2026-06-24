import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Verify connection on cold start — logs to Vercel function logs
transporter.verify().then(() => {
  console.log('[abeille] Gmail SMTP ready')
}).catch((err) => {
  console.error('[abeille] Gmail SMTP failed to connect:', err.message)
})

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string
  subject: string
  text: string
}) {
  const info = await transporter.sendMail({
    from: `abeille <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  })
  console.log('[abeille] email sent:', info.messageId, '→', to)
}