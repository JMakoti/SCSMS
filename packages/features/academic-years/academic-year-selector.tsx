"use client";

import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAcademicYear } from "./academic-year-context";

function getNextAcademicYearDefaults(currentYearName: string) {
  const currentYear = Number(currentYearName.match(/\d{4}/)?.[0]);
  const nextYear = Number.isFinite(currentYear)
    ? String(currentYear + 1)
    : String(new Date().getFullYear() + 1);

  return {
    name: nextYear,
    startDate: `${nextYear}-01-01`,
    endDate: `${nextYear}-12-31`,
  };
}

export function AcademicYearSelector({
  variant = "compact",
}: {
  variant?: "compact" | "dashboard";
}) {
  const {
    academicYears,
    activeAcademicYear,
    currentAcademicYear,
    setCurrentAcademicYearId,
    transitionAcademicYear,
  } = useAcademicYear();
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const defaults = getNextAcademicYearDefaults(activeAcademicYear.name);
  const [form, setForm] = useState({
    closingYearId: activeAcademicYear.id,
    name: defaults.name,
    startDate: defaults.startDate,
    endDate: defaults.endDate,
  });
  const [error, setError] = useState("");

  const openTransition = () => {
    const nextDefaults = getNextAcademicYearDefaults(activeAcademicYear.name);
    setForm({
      closingYearId: activeAcademicYear.id,
      name: nextDefaults.name,
      startDate: nextDefaults.startDate,
      endDate: nextDefaults.endDate,
    });
    setError("");
    setSaved(false);
    setTransitionOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError("Enter the academic year name and active dates.");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("The end date must be after the start date.");
      return;
    }

    transitionAcademicYear(form);
    setSaved(true);
  };

  const activeAndOpenYears = academicYears.filter((year) => !year.isClosed);
  const closedYears = academicYears.filter((year) => year.isClosed);

  const selector = (
    <label
      className={
        variant === "dashboard"
          ? "date-chip dashboard-year-select"
          : "academic-year-selector"
      }
    >
      {variant === "dashboard" && (
        <CalendarDays className="dashboard-year-icon" />
      )}
      <span className={variant === "dashboard" ? "dashboard-year-copy" : ""}>
        <small>Academic Year</small>
        <select
          value={currentAcademicYear.id}
          onChange={(event) => setCurrentAcademicYearId(event.target.value)}
        >
          <optgroup label="Open years">
            {activeAndOpenYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
                {year.isActive ? " - Active" : " - Open"}
              </option>
            ))}
          </optgroup>
          {closedYears.length > 0 && (
            <optgroup label="Previous closed years">
              {closedYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} - Closed
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </span>
      <ChevronDown />
    </label>
  );

  return (
    <div
      className={`academic-year-switcher ${
        variant === "dashboard" ? "dashboard-academic-year-switcher" : ""
      }`}
    >
      {selector}
      <button
        className="academic-year-transition-button"
        type="button"
        onClick={openTransition}
        aria-label="Create or transition academic year"
        title="Create / Transition Academic Year"
      >
        <CalendarPlus />
      </button>

      {transitionOpen && (
        <div className="overlay" onClick={() => setTransitionOpen(false)}>
          <div
            className="form-dialog academic-year-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-head">
              <div>
                <span className="eyebrow">Academic Year Switcher</span>
                <h2>Create / Transition Academic Year</h2>
                <p>
                  Close the current year and open the next active reporting
                  period.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setTransitionOpen(false)}
                aria-label="Close academic year form"
              >
                <X />
              </button>
            </div>
            {saved ? (
              <div className="success-state">
                <div>
                  <Check />
                </div>
                <h3>Academic year transitioned</h3>
                <p>{form.name} is now the active academic year.</p>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setTransitionOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3>Transition details</h3>
                  <div className="form-grid">
                    <label>
                      Year to close
                      <select
                        value={form.closingYearId}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            closingYearId: event.target.value,
                          }))
                        }
                      >
                        {academicYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name}
                            {year.isClosed ? " - already closed" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      New academic year
                      <input
                        value={form.name}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            name: event.target.value,
                          }))
                        }
                        placeholder="2027"
                        autoFocus
                      />
                    </label>
                    <label>
                      Active start date
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            startDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Active end date
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            endDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  {error && <p className="form-error">{error}</p>}
                </div>
                <div className="dialog-footer">
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => setTransitionOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="modal-primary-button" type="submit">
                    Create and activate year
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AcademicYearSelector;
