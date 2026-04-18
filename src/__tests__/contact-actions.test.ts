import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-contact-form: Server Action + nodemailer transport. The action owns
// validation (shared with the client), env-driven SMTP transport creation,
// and the success/error shape the form renders from `useActionState`.

type SendMail = (opts: unknown) => Promise<{ accepted: string[] }>;
type MailMocks = {
  sendMail: ReturnType<typeof vi.fn<SendMail>>;
  createTransport: ReturnType<
    typeof vi.fn<(opts: unknown) => { sendMail: SendMail }>
  >;
};
const mailMocks: MailMocks = vi.hoisted(() => ({
  sendMail: vi.fn<SendMail>(),
  createTransport: vi.fn<(opts: unknown) => { sendMail: SendMail }>(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: mailMocks.createTransport },
  createTransport: mailMocks.createTransport,
}));

beforeEach(() => {
  mailMocks.sendMail.mockReset();
  mailMocks.sendMail.mockResolvedValue({ accepted: ["carolinafutons@gmail.com"] });
  mailMocks.createTransport.mockReset();
  mailMocks.createTransport.mockImplementation(() => ({
    sendMail: mailMocks.sendMail,
  }));
  process.env.SMTP_HOST = "smtp.example.com";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "mailer@example.com";
  process.env.SMTP_PASS = "hunter2";
});

function fd(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

const VALID = {
  name: "Jane Customer",
  email: "jane@example.com",
  subject: "Question about the Monterey",
  message: "Hi — do you ship to Asheville? Thanks.",
};

describe("sendContactForm — validation", () => {
  it("returns field errors when required fields are missing", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd({ name: "", email: "", subject: "", message: "" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.subject).toBeTruthy();
    expect(result.errors.message).toBeTruthy();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns email-shape error for malformed email", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd({ ...VALID, email: "not-an-email" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.email).toBeTruthy();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns message-length error for too-short messages", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd({ ...VALID, message: "hi" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.message).toBeTruthy();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("sendContactForm — nodemailer transport", () => {
  it("invokes transport.sendMail with to=BUSINESS.email and the user's fields in the body", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("success");
    expect(mailMocks.sendMail).toHaveBeenCalledTimes(1);
    const call = mailMocks.sendMail.mock.calls[0]![0] as {
      to: string;
      replyTo: string;
      subject: string;
      text: string;
    };
    expect(call.to).toBe("carolinafutons@gmail.com");
    expect(call.replyTo).toContain("jane@example.com");
    expect(call.subject).toContain("Monterey");
    expect(call.text).toContain("Jane Customer");
    expect(call.text).toContain("jane@example.com");
    expect(call.text).toContain("Asheville");
  });

  it("builds the transport from SMTP_* env vars", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    await sendContactForm(null, fd(VALID));
    expect(mailMocks.createTransport).toHaveBeenCalledTimes(1);
    const cfg = mailMocks.createTransport.mock.calls[0]![0] as {
      host: string;
      port: number;
      auth: { user: string; pass: string };
    };
    expect(cfg.host).toBe("smtp.example.com");
    expect(cfg.port).toBe(587);
    expect(cfg.auth.user).toBe("mailer@example.com");
    expect(cfg.auth.pass).toBe("hunter2");
  });

  it("returns a transport error when sendMail throws", async () => {
    mailMocks.sendMail.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
  });

  it("returns a configuration error when SMTP env vars are missing", async () => {
    delete process.env.SMTP_HOST;
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });
});
