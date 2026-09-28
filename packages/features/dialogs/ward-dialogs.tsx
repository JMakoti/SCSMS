"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { addWardSchema } from "../schemas/add-ward-schema";
import type { AddWardFormValues } from "../types/forms";
import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";

export function AddWardDialog({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<AddWardFormValues>({
    resolver: zodResolver(addWardSchema),
    defaultValues: {
      wardName: "",
      wardCode: "",
      county: "Kilifi",
      countyCode: "003",
      subCounty: "Rabai",
      subCountyCode: "014",
      constituency: "Rabai",
      constituencyCode: "014",
    },
  });

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
            <p>The ward record has been added to the synchronization queue.</p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(() => setSaved(true))}>
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
                  <input {...register("county")} placeholder="Kilifi" />
                </label>
                <label>
                  County code
                  <input {...register("countyCode")} placeholder="003" />
                </label>
                <label>
                  Sub-County
                  <input {...register("subCounty")} placeholder="Rabai" />
                </label>
                <label>
                  Sub-County code
                  <input {...register("subCountyCode")} placeholder="014" />
                </label>
                <label>
                  Constituency
                  <input {...register("constituency")} placeholder="Rabai" />
                </label>
                <label>
                  Constituency code
                  <input {...register("constituencyCode")} placeholder="014" />
                </label>
              </div>
            </div>
            <div className="dialog-footer">
              <button
                className="outline-button"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <Button className="modal-primary-button" type="submit">
                Save ward
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
