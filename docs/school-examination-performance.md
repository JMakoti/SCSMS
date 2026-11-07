# School examination performance

School Performance opens a school-specific dashboard using its stable school ID. Senior schools show KCSE, junior schools KJSEA, and primary schools KPSEA. An ambiguous school name never selects the first matching school.

Cohort means the year the examination was taken. Select it using **Cohort (examination year)**. Entry forms derive it from that year, and candidate tables and reports use the examination record's year, including when older candidate data contains class labels. Cohort is not a separate class or stream field.

## Results and calculations

Use **Enter whole candidature** to capture the school examination/centre number and the complete male/female candidature without entering candidates individually. Each gender has registered, present, absent, submitted-results and withheld counts. Present plus absent must equal registered. Record absence reasons as categories with counts that account for every absentee; do not enter candidate names in reasons. Boys' schools show male entry only, girls' schools female only, and mixed schools both.

The dashboard provides direct **Update grades & student numbers** and **Update subjects & student numbers** buttons. Each opens the relevant form section. The form also has navigation between attendance, grades and subjects. All official grade rows remain editable when reopening a summary, including grades previously omitted or saved with no results. Subject counts and grades are displayed in expanded sections, with gender counts and total students per grade.

Select the subjects actually taken and enter each subject's own male/female candidature, attendance, absence reasons and official grade/level counts. Elective counts can be smaller than school totals. No subject is automatically assigned to every candidate. Senior choices come from the selected year's offered subject combinations and previously recorded subjects; configure Subjects before entering a new senior school's results.

KCSE overall grade counts determine the submitted-results totals. Each subject's grade counts determine its submitted totals. Grade sums must match each gender's submitted count, and subject registration/presence cannot exceed school gender totals. Presence is distinct from having a submitted result. Zero submitted results are allowed while results are pending. Bulk grade counts support weighted mean points, not invented raw marks.

Saving a bulk summary makes it the authoritative source for that school, year and examination. Existing individual records remain stored separately and are never added to the bulk totals or exported as if they belong to the bulk summary. Bulk reports include candidature, attendance, absence reasons and subject attendance sheets. Examination year (cohort), gender and subject filters work with bulk counts. Candidate searches, individual-grade filters and elective-to-overall-grade cross-tabulations are unavailable because totals cannot establish individual membership. Bulk history compares recorded bulk summaries; it does not merge individual and bulk datasets.

KCSE uses official mean grades and subject grades, with optional recorded marks. KJSEA uses EE1 through BE2, and KPSEA uses EE, ME, AE and BE. Learning areas remain separate: the dashboard does not manufacture a combined CBC mean or convert marks to national grades. Missing, absent and withheld results are distinct and do not count towards means. Zero marks are valid submitted marks.

The configurable KCSE degree mean-grade threshold defaults to C+. Bulk counts use the submitted official mean-grade distribution; existing individual datasets use their candidate grades. Meeting this threshold does not establish programme-specific eligibility or guarantee placement.

Examination year (cohort), gender, subject and outcome filters apply to analysis and reports. Candidate search applies to the candidate table and candidate export sheets. History uses recorded years only. Empty data shows empty states rather than sample results. Subject and gender insights require sufficient records and do not imply causation.

Existing aggregate performance remains identified as a legacy summary. A unique matching national examination record is reused when results are first entered, and its original summary is preserved in its notes. Aggregate totals never become fabricated candidate records.

## Permissions

Permissions are checked against the authenticated account on the web server and in the desktop native write/access commands. Administrators with `*` have full access. Other roles can grant `performance:school:<school-id>:read`, `:write`, or `:candidates`. Area-wide `performance:read`, `performance:write`, and `performance:candidates` apply only within the account's sub-county. Write access includes candidate access. Summary-only readers do not receive identifiable candidate rows or candidate export sheets.

## Database deployment

The SQLite migrations `0007_messy_mysterio.sql` and `0008_needy_orphan.sql` are wired into desktop startup as versions 8 and 9 and run automatically. The PostgreSQL migrations are `0008_nappy_nick_fury.sql` and `0009_chunky_doctor_octopus.sql`. Deploy them using the project's established PostgreSQL migration process before serving the updated web application or syncing the new tables. For a database already managed by Drizzle migrations, the command is `pnpm.cmd --filter @scsms/db db:migrate:postgres`; databases originally provisioned with push need their migration history reconciled first.

Deploy the updated sync API with the apps: it includes `performance_candidates`, `performance_candidate_subjects` and `performance_candidature_summaries`, ordered after `performance_records`. Writes are atomic on both database targets. No hosted database is modified by building the application.

## Verification

- `node --test tests/examinations.test.mjs` from `apps/desktop`: real SQLite migrations, filtering, grades, access, atomic writes, legacy preservation, and generated XLSX/PDF files.
- `cargo test --lib database::` from `apps/desktop/src-tauri`: native database tests, including repeatable migrations and aggregate numeric/null decoding.
- Build and type-check both Next.js apps after changing the shared dashboard.

The Excel report contains separate analysis sheets. Bulk reports include gender candidature, attendance, absence reasons and subject attendance, without individual candidate worksheets. Individual datasets include authorised matching candidates fetched in bounded pages. PDF reports are actual paginated PDFs. Both identify the school, examination, year and selected filters.
