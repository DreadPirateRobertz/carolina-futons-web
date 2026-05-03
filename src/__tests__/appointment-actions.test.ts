import { describe, it, expect, vi, beforeEach } from "vitest";

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

// Compute the next Wednesday at or after today so this date never becomes stale.
function nextWednesday(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // noon local — avoids DST edge cases
  const dow = d.getDay(); // 0=Sun … 6=Sat; Wednesday=3
  const daysAhead = dow <= 3 ? 3 - dow : 7 - (dow - 3);
  d.setDate(d.getDate() + (daysAhead === 0 ? 7 : daysAhead));
  return d.toISOString().slice(0, 10);
}

const VALID = {
  appointmentName: "Alice Buyer",
  appointmentEmail: "alice@example.com",
  appointmentDate: nextWednesday(),
  appointmentTime: "10:00",
};

describe("bookAppointment — validation", () => {
  it("returns name error when name is blank", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentName: "  " }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentName).toBeTruthy();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns email error when email is blank", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentEmail: "" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentEmail).toBeTruthy();
  });

  it("returns email-shape error for malformed email", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentEmail: "not-an-email" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentEmail).toMatch(/valid email/i);
  });

  it("returns date error when date is missing", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentDate: "" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentDate).toBeTruthy();
  });

  it("returns future-date error for a past weekday", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentDate: "2020-01-08" })); // past Wednesday
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentDate).toMatch(/future/i);
  });

  it("returns future-date error (not Wed-Sat error) for a past Sunday", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentDate: "2020-01-05" })); // past Sunday
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentDate).toMatch(/future/i);
    expect(result.errors.appointmentDate).not.toMatch(/wednesday/i);
  });

  it("returns Wed-Sat error for a future Sunday", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentDate: "2026-05-03" })); // future Sunday
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentDate).toMatch(/wednesday/i);
  });

  it("returns time error when time is not in the allowed set", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentTime: "09:00" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.appointmentTime).toBeTruthy();
  });

  it("echoes submitted values back on validation error", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd({ ...VALID, appointmentName: "" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.values.appointmentEmail).toBe("alice@example.com");
  });
});

describe("bookAppointment — nodemailer transport", () => {
  it("returns success with date and time label on valid submission", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd(VALID));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.date).toBe(VALID.appointmentDate);
    expect(result.time).toBe("10:00 AM");
  });

  it("sends mail with appointment details in subject and body", async () => {
    const { bookAppointment } = await import("@/app/contact/actions");
    await bookAppointment(null, fd(VALID));
    expect(mailMocks.sendMail).toHaveBeenCalledTimes(1);
    const call = mailMocks.sendMail.mock.calls[0]![0] as {
      to: string;
      subject: string;
      text: string;
    };
    expect(call.to).toBe("carolinafutons@gmail.com");
    expect(call.subject).toContain(VALID.appointmentDate);
    expect(call.text).toContain("Alice Buyer");
    expect(call.text).toContain("alice@example.com");
    expect(call.text).toContain("10:00 AM");
  });

  it("returns transport error when SMTP env vars are missing", async () => {
    delete process.env.SMTP_HOST;
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns transport error when sendMail throws", async () => {
    mailMocks.sendMail.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { bookAppointment } = await import("@/app/contact/actions");
    const result = await bookAppointment(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
  });
});
