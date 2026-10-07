"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { createPortal } from "react-dom";
import { createDeleteConfirmationSchema } from "../schemas/delete-confirmation-schema";

export function ConfirmDeleteDialog({
  item,
  confirmCode = item,
  onCancel,
  onConfirm,
  error,
}: {
  item: string;
  confirmCode?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  error?: string;
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
  const [isMounted, setIsMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmDelete = async () => {
    setDeleteError("");
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (confirmError) {
      setDeleteError(
        confirmError instanceof Error
          ? confirmError.message
          : "The record could not be deleted.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isMounted || !dialog) return;

    dialog.showModal();
    return () => dialog.close();
  }, [isMounted]);

  const isDarkMode =
    isMounted &&
    document.querySelector(".dark-theme") !== null;

  if (!isMounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`confirm-delete-backdrop${isDarkMode ? " is-dark" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="confirm-delete-dialog"
        aria-labelledby="delete-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-delete-heading">
          <div className="confirm-delete-icon">
            <Trash2 size={17} />
          </div>
          <div>
            <h2 id="delete-dialog-title">Delete {item}?</h2>
            <p>
              This action cannot be undone. Type the confirmation code to
              continue.
            </p>
          </div>
        </div>
        <div className="confirm-delete-code">
          <span>
            Confirmation code
          </span>
          <strong>{confirmCode}</strong>
        </div>
        <form onSubmit={handleSubmit(confirmDelete)}>
          {(error || deleteError) && (
            <p className="confirm-delete-error" role="alert">
              {error || deleteError}
            </p>
          )}
          <label className="confirm-delete-label">
            Type code
            <input
              autoFocus
              {...register("confirmationCode")}
              placeholder={confirmCode}
            />
          </label>
          <div className="confirm-delete-actions">
            <button
              type="button"
              className="confirm-delete-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="confirm-delete-submit"
              disabled={!isValid || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </form>
      </div>
    </dialog>,
    document.body,
  );
}
