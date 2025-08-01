import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { to, subject, html, type = 'general' } = await req.json()

    // Hostinger SMTP Configuration
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.hostinger.com',
        port: 587,
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USERNAME") || 'management@bookmyreservation.org',
          password: Deno.env.get("SMTP_PASSWORD") || '',
        },
      },
    })

    // Send email via Hostinger SMTP
    await client.send({
      from: `BookMyReservation <${Deno.env.get("SMTP_USERNAME") || 'management@bookmyreservation.org'}>`,
      to: to,
      subject: subject,
      html: html,
    })

    await client.close()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via Hostinger',
        type: type,
        provider: 'hostinger_smtp',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Hostinger email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        provider: 'hostinger_smtp'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})