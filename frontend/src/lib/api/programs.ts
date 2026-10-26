// The /programs API (backend/app/api/v1/endpoints/programs.py): a student's saved code.
import type { Language } from "@/lib/glossa/types";
import { ApiError, apiFetch } from "./client";

export type ProgramSummary = {
  id: string;
  title: string;
  language: Language;
  updated_at: string;
};

export type Program = ProgramSummary & { code: string; created_at: string };

export const listPrograms = () => apiFetch<ProgramSummary[]>("/programs");

export const getProgram = (id: string) => apiFetch<Program>(`/programs/${id}`);

export const createProgram = (body: { title: string; code: string; language: Language }) =>
  apiFetch<Program>("/programs", { method: "POST", body: JSON.stringify(body) });

export const updateProgram = (id: string, body: { title?: string; code?: string }) =>
  apiFetch<Program>(`/programs/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteProgram = (id: string) =>
  apiFetch<void>(`/programs/${id}`, { method: "DELETE" });

/** What went wrong, for the student. */
export function programError(err: unknown): string {
  if (!(err instanceof ApiError)) return "Δεν ήταν δυνατή η σύνδεση με τον διακομιστή.";
  switch (err.status) {
    case 401:
      return "Η σύνδεσή σου έληξε. Συνδέσου ξανά.";
    case 404:
      return "Το πρόγραμμα δεν βρέθηκε· ίσως σβήστηκε από άλλη καρτέλα.";
    case 409:
      return "Έφτασες το όριο των αποθηκευμένων προγραμμάτων. Σβήσε κάποια παλιά.";
    case 422:
      return "Ο κώδικας είναι πολύ μεγάλος για να αποθηκευτεί.";
    case 503:
      return "Η αποθήκευση δεν είναι διαθέσιμη αυτή τη στιγμή.";
    default:
      return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
  }
}
