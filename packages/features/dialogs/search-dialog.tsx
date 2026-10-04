"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { rabaiSchools } from "../data/fixtures/rabai-schools";
import {
  ChevronRight,
  FileBarChart2,
  Plus,
  Search,
  School,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { searchDialogSchema } from "../schemas/search-dialog-schema";

export function SearchDialog({
  onClose,
  setActive,
}: {
  onClose: () => void;
  setActive: (v: string) => void;
}) {
  type SearchDialogValues = z.infer<typeof searchDialogSchema>;
  const { register, watch } = useForm<SearchDialogValues>({
    resolver: zodResolver(searchDialogSchema),
    defaultValues: { query: "" },
  });
  const query = watch("query");
  const results = [...rabaiSchools]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .filter((x) =>
      `${x.displayName} ${x.officialName} ${x.schoolCode ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 4);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        <form className="dialog-search" onSubmit={(event) => event.preventDefault()}>
          <Search />
          <input
            autoFocus
            {...register("query")}
            placeholder="Search schools, records, staff..."
          />
          <kbd>ESC</kbd>
        </form>
        <div className="search-section">
          <span>Schools</span>
          {results.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                setActive("Schools");
                onClose();
              }}
            >
              <School />
              <div>
                <strong>{s.displayName}</strong>
                <small>
                  {s.schoolCode ?? "No code"} - {s.ward ?? "Not mapped"}
                </small>
              </div>
              <ChevronRight />
            </button>
          ))}
        </div>
        <div className="search-section">
          <span>Quick actions</span>
          <button
            type="button"
            onClick={() => {
              setActive("Schools");
              onClose();
            }}
          >
            <Plus />
            <div>
              <strong>Add School</strong>
              <small>Create a new registry record</small>
            </div>
            <kbd>Ctrl N</kbd>
          </button>
          <button
            type="button"
            onClick={() => {
              setActive("Reports");
              onClose();
            }}
          >
            <FileBarChart2 />
            <div>
              <strong>Generate Report</strong>
              <small>Open reports center</small>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchDialog;
