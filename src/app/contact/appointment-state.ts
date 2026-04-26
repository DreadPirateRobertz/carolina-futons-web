export type AppointmentRequest = {
  appointmentName: string;
  appointmentEmail: string;
  appointmentDate: string;
  appointmentTime: string;
};

export type AppointmentErrors = Partial<Record<keyof AppointmentRequest, string>>;

export type AppointmentActionState =
  | { status: "idle" }
  | {
      status: "error";
      errors: AppointmentErrors;
      transportError?: string;
      values: AppointmentRequest;
    }
  | { status: "success"; date: string; time: string };

export const initialAppointmentActionState: AppointmentActionState = {
  status: "idle",
};
