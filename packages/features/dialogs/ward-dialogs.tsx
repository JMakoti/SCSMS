"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { addWardSchema } from "../schemas/add-ward-schema";
import type { AddWardFormValues } from "../types/forms";
import { useFeatureData } from "../data/feature-data-context";
import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";

export function AddWardDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave?: (values: AddWardFormValues) => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const { subCounties } = useFeatureData();
  const availableSubCounties = subCounties
    .filter((subCounty) => subCounty.isActive)
    .sort((a, b) =>
      (a.subCounty ?? "").localeCompare(b.subCounty ?? ""),
    );
  const { register, handleSubmit, watch } = useForm<AddWardFormValues>({
    resolver: zodResolver(addWardSchema),
    defaultValues: {
      wardName: "",
      wardCode: "",
      subCountyId: "",
      notes: "",
    },
  });
  const selectedSubCounty = availableSubCounties.find(
    (subCounty) => subCounty.id === watch("subCountyId"),
  );

  const saveWard = async (values: AddWardFormValues) => {
    setSaveError("");
    setSaving(true);
    try {
      if (onSave) {
        await onSave(values);
        window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      }
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save the ward.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="form-dialog add-ward-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Ward management</span>
            <h2>Add ward record</h2>
            <p>Create a ward-level record for school coverage and reporting.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close add ward form"
          >
            <X />
          </button>
        </div>
        {saved ? (
          <div className="success-state">
            <div>
              <Check />
            </div>
            <h3>Ward record saved</h3>
            <p>
              {onSave
                ? "The ward record has been saved to the database."
                : "The ward record has been added to the synchronization queue."}
            </p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(saveWard)}>
            <div className="form-section">
              <h3>Ward details</h3>
              <div className="form-grid">
                <label>
                  Ward name
                  <input
                    {...register("wardName")}
                    autoFocus
                    placeholder="Enter ward name"
                  />
                </label>
                <label>
                  Ward code
                  <input {...register("wardCode")} placeholder="0067" />
                </label>
                <label>
                  County
                  <input value={selectedSubCounty?.county ?? ""} readOnly />
                </label>
                <label>
                  County code
                  <input value={selectedSubCounty?.countyCode ?? ""} readOnly />
                </label>
                <label>
                  Sub-County
                  <select {...register("subCountyId")}>
                    <option value="">Select a sub-county</option>
                    {availableSubCounties.map((subCounty) => (
                      <option key={subCounty.id} value={subCounty.id}>
                        {subCounty.subCounty ?? "Unnamed sub-county"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sub-County code
                  <input value={selectedSubCounty?.subCountyCode ?? ""} readOnly />
                </label>
                <label>
                  Constituency
                  <input value={selectedSubCounty?.constituency ?? ""} readOnly />
                </label>
                <label>
                  Constituency code
                  <input value={selectedSubCounty?.constituencyCode ?? ""} readOnly />
                </label>
              </div>
            </div>
            {saveError && (
              <p className="form-error" role="alert">
                {saveError}
              </p>
            )}
            <div className="dialog-footer">
              <button
                className="outline-button"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <Button
                className="modal-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save ward"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
