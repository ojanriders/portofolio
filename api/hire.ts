import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { createDigest, summarizeMessage } from '../lib/summarize.js';

const hireSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  message: z.string().min(10, 'Message should be at least 10 characters'),
  company: z.string().max(120).optional(),
});

type HirePayload = z.infer<typeof hireSchema>;

function ensureEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseBody(req: VercelRequest): HirePayload {
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const result = hireSchema.safeParse(payload);

  if (!result.success) {
    const flattened = result.error.flatten();
    throw Object.assign(new Error('Validation error'), { statusCode: 400, details: flattened });
  }

  return result.data;
}

async function sendHireEmail(payload: HirePayload): Promise<string> {
  const user = ensureEnv('GMAIL_USER');
  const password = ensureEnv('GMAIL_APP_PASSWORD');
  const recipient = process.env.GMAIL_TO ?? user;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: password,
    },
  });

  const summary = summarizeMessage(payload.message);
  const digest = createDigest(payload.name, payload.email, payload.company, payload.message, summary);

  await transporter.sendMail({
    from: user,
    replyTo: `${payload.name} <${payload.email}>`,
    to: recipient,
    subject: `New hire request from ${payload.name}`,
    text: digest,
  });

  return summary;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = parseBody(req);
    const summary = await sendHireEmail(payload);

    res.status(200).json({ message: 'Hire request sent successfully', summary });
  } catch (error) {
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      return;
    }

    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    const response: Record<string, unknown> = { error: (error as Error).message ?? 'Unexpected error' };

    if ((error as any)?.details) {
      response.details = (error as any).details;
    }

    res.status(statusCode).json(response);
  }
}

export { hireSchema, parseBody, sendHireEmail };
