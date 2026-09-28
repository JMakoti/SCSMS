"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { createDeleteConfirmationSchema } from "../schemas/delete-confirmation-schema";

export function ConfirmDeleteDialog({
  item,
  confirmCode = item,
  onCancel,
  onConfirm,
}: {
  item: string;
  confirmCode?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const deleteConfirmationSchema = useMemo(
    () => createDeleteConfirmationSchema(confirmCode),
    [confirmCode],
  );
  type DeleteConfirmationValues = z.infer<typeof deleteConfirmationSchema>;
  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm<DeleteConfirmationValues>({
    resolver: zodResolver(deleteConfirmationSchema),
    defaultValues: { confirmationCode: "" },
    mode: "onChange",
  });

  return (
    <div
      className="fixed inset-0 z-[250] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.26)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
            <Trash2 className="size-4" />
          </div>
          <div>
            <h2
              id="delete-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-slate-50"
            >
              Delete {item}?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This action cannot be undone. Type the confirmation code to
              continue.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/40">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            Confirmation code
          </span>
          <strong className="mt-1 block font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
            {confirmCode}
          </strong>
        </div>
        <form onSubmit={handleSubmit(onConfirm)}>
          <label className="mt-4 grid gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            Type code
            <input
              autoFocus
              {...register("confirmationCode")}
              placeholder={confirmCode}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-red-950"
            />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              disabled={!isValid}
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
