"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, PaymentStatus } from "@/lib/types";

/* ---------------------------------------------------------------------------
   Validation
--------------------------------------------------------------------------- */

const nameField = z
  .string()
  .trim()
  .min(2, "Enter the student's full name.")
  .max(120, "That name is too long (120 characters maximum).")
  .refine(
    (value) => (value.match(/\p{L}/gu) ?? []).length >= 2,
    "Enter a valid full name using letters.",
  );

const remarksField = z
  .string()
  .trim()
  .max(600, "Remarks must be 600 characters or fewer.");

const statusField = z.enum(["paid", "unpaid"]);

const meritNumberField = z
  .string()
  .trim()
  .max(40, "Merit number must be 40 characters or fewer.");

const studentSchema = z
  .object({
    fullName: nameField,
    remarks: remarksField,
    status: statusField,
    meritNumber: meritNumberField,
  })
  .refine((value) => value.status === "paid" || value.meritNumber.length === 0, {
    message: "A merit number can only be recorded for a paid student.",
    path: ["meritNumber"],
  });

const statusSchema = z
  .object({
    id: z.string().uuid("Unknown student record."),
    status: statusField,
    meritNumber: meritNumberField.optional(),
  })
  .refine((value) => value.status === "paid" || !value.meritNumber, {
    message: "A merit number can only be recorded for a paid student.",
    path: ["meritNumber"],
  });

const idSchema = z.object({
  id: z.string().uuid("Unknown student record."),
});

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */

function revalidateLedger() {
  revalidatePath("/");
  revalidatePath("/admin");
}

type DbError = { code?: string; message: string };

function describeDbError(error: DbError): string {
  if (error.code === "23505" || /duplicate key/i.test(error.message)) {
    return "A student with that exact name already exists.";
  }
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return "You do not have permission to change this record.";
  }
  if (error.code === "23514" || /violates check constraint/i.test(error.message)) {
    return "Those details did not pass validation. Check the fields and try again.";
  }
  return "Could not save your change. Please try again.";
}

function statusCopy(status: PaymentStatus): string {
  return status === "paid" ? "paid" : "unpaid";
}

/* ---------------------------------------------------------------------------
   Mutations
--------------------------------------------------------------------------- */

export async function createStudent(input: {
  fullName: string;
  remarks?: string;
  status: PaymentStatus;
  meritNumber?: string;
}): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = studentSchema.safeParse({
    fullName: input.fullName,
    remarks: input.remarks ?? "",
    status: input.status,
    meritNumber: input.meritNumber ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid student details." };
  }

  const { error } = await ctx.supabase.from("it3a_students").insert({
    full_name: parsed.data.fullName,
    remarks: parsed.data.remarks,
    payment_status: parsed.data.status,
    merit_number: parsed.data.meritNumber || null,
  });

  if (error) return { ok: false, error: describeDbError(error) };

  const meritNote = parsed.data.meritNumber
    ? ` Merit no. ${parsed.data.meritNumber} recorded.`
    : "";

  revalidateLedger();
  return {
    ok: true,
    message:
      parsed.data.status === "paid"
        ? `${parsed.data.fullName} added and marked paid. \u20b150 collected.${meritNote}`
        : `${parsed.data.fullName} added to the roster.`,
  };
}

export async function updateStudent(input: {
  id: string;
  fullName: string;
  remarks?: string;
  status: PaymentStatus;
  meritNumber?: string;
}): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const idParsed = idSchema.safeParse({ id: input.id });
  if (!idParsed.success) {
    return { ok: false, error: idParsed.error.issues[0]?.message ?? "Unknown student record." };
  }

  const parsed = studentSchema.safeParse({
    fullName: input.fullName,
    remarks: input.remarks ?? "",
    status: input.status,
    meritNumber: input.meritNumber ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid student details." };
  }

  const { error } = await ctx.supabase
    .from("it3a_students")
    .update({
      full_name: parsed.data.fullName,
      remarks: parsed.data.remarks,
      payment_status: parsed.data.status,
      merit_number: parsed.data.meritNumber || null,
    })
    .eq("id", idParsed.data.id);

  if (error) return { ok: false, error: describeDbError(error) };

  revalidateLedger();
  return { ok: true, message: `${parsed.data.fullName} updated.` };
}

export async function setPaymentStatus(input: {
  id: string;
  status: PaymentStatus;
  meritNumber?: string;
}): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const patch: { payment_status: PaymentStatus; merit_number?: string } = {
    payment_status: parsed.data.status,
  };

  if (parsed.data.status === "paid" && parsed.data.meritNumber) {
    patch.merit_number = parsed.data.meritNumber;
  }

  const { data, error } = await ctx.supabase
    .from("it3a_students")
    .update(patch)
    .eq("id", parsed.data.id)
    .select("full_name")
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: "That student no longer exists." };

  revalidateLedger();

  const meritNote =
    parsed.data.status === "paid" && parsed.data.meritNumber
      ? ` Merit no. ${parsed.data.meritNumber} recorded.`
      : "";

  return {
    ok: true,
    message:
      parsed.data.status === "paid"
        ? `${data.full_name} marked paid. \u20b150 added to the collection.${meritNote}`
        : `${data.full_name} marked unpaid. \u20b150 removed from the collection.`,
  };
}

export async function deleteStudent(input: { id: string }): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Unknown student record." };
  }

  const { data, error } = await ctx.supabase
    .from("it3a_students")
    .delete()
    .eq("id", parsed.data.id)
    .select("full_name")
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: "That student no longer exists." };

  revalidateLedger();
  return { ok: true, message: `${data.full_name} removed from the roster.` };
}
