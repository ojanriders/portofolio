import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { parseBody } from '../api/hire.js';
import { summarizeMessage } from '../lib/summarize.js';

const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: createTransportMock,
  },
  createTransport: createTransportMock,
}));

type MockResponse = VercelResponse & {
  statusCode?: number;
  payload?: unknown;
  headers: Record<string, string>;
};

function createMockRes(): MockResponse {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    status: vi.fn(function (this: MockResponse, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: MockResponse, data: unknown) {
      this.payload = data;
      return this;
    }),
    setHeader: vi.fn((key: string, value: string) => {
      headers[key] = value;
    }),
  } as unknown as MockResponse;

  return res;
}

describe('summarizeMessage', () => {
  it('picks the first two sentences', () => {
    const summary = summarizeMessage('Hello there. I would like to hire you! Please contact me soon.');
    expect(summary).toBe('Hello there. I would like to hire you!');
  });

  it('trims overly long summaries', () => {
    const longSentence = 'A'.repeat(400);
    const summary = summarizeMessage(longSentence, 2, 50);
    expect(summary.endsWith('…')).toBe(true);
    expect(summary.length).toBe(50);
  });
});

describe('parseBody', () => {
  it('parses valid payloads', () => {
    const req = { body: { name: 'John', email: 'john@example.com', message: 'Hello, I want to hire you.' } } as VercelRequest;
    expect(parseBody(req)).toMatchObject({ name: 'John' });
  });

  it('throws on invalid payloads', () => {
    const req = { body: { name: '', email: 'bad', message: 'short' } } as VercelRequest;
    expect(() => parseBody(req)).toThrowError(/Validation error/);
  });
});

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMailMock.mockReset();
    createTransportMock.mockReset();
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_TO;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-POST methods', async () => {
    const req = { method: 'GET' } as unknown as VercelRequest;
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.payload).toMatchObject({ error: 'Method Not Allowed' });
    expect(res.headers['Allow']).toBe('POST');
  });

  it('returns 400 on invalid JSON', async () => {
    const req = { method: 'POST', body: '{bad json' } as unknown as VercelRequest;
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload).toMatchObject({ error: 'Invalid JSON payload' });
  });

  it('returns 500 when env vars missing', async () => {
    const req = {
      method: 'POST',
      body: { name: 'Jane', email: 'jane@example.com', message: 'I would like to discuss a project with you.' },
    } as unknown as VercelRequest;
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.payload).toMatchObject({ error: /Missing required environment variable/ });
  });

  it('sends email on valid payload', async () => {
    process.env.GMAIL_USER = 'owner@example.com';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
    process.env.GMAIL_TO = 'inbox@example.com';

    const req = {
      method: 'POST',
      body: { name: 'Jane', email: 'jane@example.com', company: 'Acme', message: 'I would like to hire you. Let me know when you are available.' },
    } as unknown as VercelRequest;

    const res = createMockRes();
    await handler(req, res);

    expect(createTransportMock).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'owner@example.com', pass: 'app-password' },
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.payload).toMatchObject({
      message: 'Hire request sent successfully',
      summary: expect.stringContaining('I would like to hire you.'),
    });
  });
});
