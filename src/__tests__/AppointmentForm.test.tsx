import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const reactDomMocks = vi.hoisted(() => ({
  useFormStatus: vi.fn<() => { pending: boolean }>(() => ({ pending: false })),
}));

const reactMocks = vi.hoisted(() => {
  type Action = (prev: unknown, formData: FormData) => unknown | Promise<unknown>;
  return {
    state: { status: "idle" } as unknown,
    useActionState: vi.fn(
      (action: Action, _initial: unknown) =>
        [reactMocks.state, action, false] as const,
    ),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: reactMocks.useActionState };
});
vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return { ...actual, useFormStatus: reactDomMocks.useFormStatus };
});
vi.mock("@/app/contact/actions", () => ({
  bookAppointment: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/app/contact/appointment-state", () => ({
  initialAppointmentActionState: { status: "idle" },
}));

import { AppointmentForm } from "@/components/contact/AppointmentForm";

beforeEach(() => {
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
});

describe("AppointmentForm — rendering", () => {
  it("renders all fields with accessible labels", () => {
    render(<AppointmentForm />);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred time/i)).toBeInTheDocument();
  });

  it("renders name input with type=text and email input with type=email", () => {
    render(<AppointmentForm />);
    expect(screen.getByLabelText(/^name$/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute("type", "email");
  });

  it("renders a date input", () => {
    render(<AppointmentForm />);
    expect(screen.getByLabelText(/preferred date/i)).toHaveAttribute("type", "date");
  });

  it("renders time select with all 7 slot options", () => {
    render(<AppointmentForm />);
    const select = screen.getByLabelText(/preferred time/i);
    expect(select.tagName).toBe("SELECT");
    const options = Array.from((select as HTMLSelectElement).options).map(
      (o) => o.value,
    );
    expect(options).toContain("10:00");
    expect(options).toContain("16:00");
    expect(options.filter((v) => v !== "").length).toBe(7);
  });

  it("renders the submit button with id=appointmentBookBtn", () => {
    render(<AppointmentForm />);
    const btn = document.getElementById("appointmentBookBtn");
    expect(btn).toBeInTheDocument();
    expect(btn?.textContent).toMatch(/request appointment/i);
  });

  it("shows pending label when form is submitting", () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<AppointmentForm />);
    expect(screen.getByRole("button")).toHaveTextContent(/booking…/i);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("AppointmentForm — error state", () => {
  it("renders field-level errors with role=alert", () => {
    reactMocks.state = {
      status: "error",
      errors: {
        appointmentName: "Name is required.",
        appointmentEmail: "Please enter a valid email address.",
        appointmentDate: "We're open Wednesday through Saturday.",
        appointmentTime: "Please select a time.",
      },
      values: {
        appointmentName: "",
        appointmentEmail: "bad",
        appointmentDate: "2026-04-27",
        appointmentTime: "",
      },
    };
    render(<AppointmentForm />);
    expect(screen.getByText("Name is required.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Please enter a valid email address.")).toHaveAttribute("role", "alert");
    expect(screen.getByText(/wednesday through saturday/i)).toHaveAttribute("role", "alert");
    expect(screen.getByText("Please select a time.")).toHaveAttribute("role", "alert");
  });

  it("echoes submitted values back into the fields on error", () => {
    reactMocks.state = {
      status: "error",
      errors: { appointmentDate: "Please choose a future date." },
      values: {
        appointmentName: "Alice",
        appointmentEmail: "alice@example.com",
        appointmentDate: "2020-01-01",
        appointmentTime: "10:00",
      },
    };
    render(<AppointmentForm />);
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Alice");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("alice@example.com");
  });

  it("shows transport error message", () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      transportError: "Our booking system isn't configured yet — please call us to schedule.",
      values: { appointmentName: "Bob", appointmentEmail: "b@b.com", appointmentDate: "2026-05-07", appointmentTime: "14:00" },
    };
    render(<AppointmentForm />);
    expect(
      screen.getByText(/booking system isn't configured/i),
    ).toHaveAttribute("role", "alert");
  });
});

describe("AppointmentForm — success state", () => {
  it("renders success message with date and time", () => {
    reactMocks.state = {
      status: "success",
      date: "2026-05-07",
      time: "2:00 PM",
    };
    render(<AppointmentForm />);
    expect(screen.getByTestId("appointment-success")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/2026-05-07/);
    expect(screen.getByRole("status")).toHaveTextContent(/2:00 PM/);
  });

  it("does not render the form fields in success state", () => {
    reactMocks.state = { status: "success", date: "2026-05-07", time: "10:00 AM" };
    render(<AppointmentForm />);
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });
});
