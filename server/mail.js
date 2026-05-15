import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export async function sendResetCode(email, code) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured, reset code:', code)
    throw new Error('邮件服务未配置')
  }

  await transporter.sendMail({
    from: `"Mamio IELTS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Mamio IELTS - 密码重置验证码',
    html: `
      <div style="max-width: 400px; margin: 0 auto; padding: 24px; font-family: -apple-system, sans-serif;">
        <h2 style="margin: 0 0 16px;">Mamio IELTS</h2>
        <p>你正在重置密码，验证码为：</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #000; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 16px 0;">${code}</div>
        <p style="color: #666; font-size: 14px;">验证码 10 分钟内有效。如果不是你本人操作，请忽略此邮件。</p>
      </div>
    `
  })
}
