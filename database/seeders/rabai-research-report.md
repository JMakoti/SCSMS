# Rabai Sub-County School Research Report

Scope: Kilifi County, Rabai Sub-County, Kenya.

Research/seed integration date: 2026-09-20.

Source dataset used by the app:

- `seeders/accurate-rabai-data.ts`

Dataset notes:

- Official names are preserved where the source lists a primary institution hosting JSS.
- JSS records are represented separately from the corresponding primary-school records where the source dataset does so.
- `null` means the information was not sufficiently verified from the available source material.
- Demo year data in `rabaiSchoolYears` is generated only to demonstrate year-dependent behavior. It is not official enrollment, staffing or class-count data.

Imported master data:

- Total Rabai school records imported: 128
- Primary schools: 62
- Junior Secondary Schools: 46
- Senior Secondary Schools: 20
- Public schools: 113
- Private schools: 15
- Schools with school codes: 18
- Schools missing ward: 27
- Schools missing location: 14

School classifications discovered:

- `PRIMARY`
- `JUNIOR_SECONDARY`
- `SENIOR_SECONDARY`

Year-specific sample data:

- Academic years seeded: 2025, 2026
- School-year rows created: 256
- 2025 rows: 128 demo rows
- 2026 rows: 128 demo rows

Incomplete information handling:

- The app preserves null values in the seed data.
- The UI displays null values as "Not provided" instead of inventing details.
- Missing phones, emails, latitude and longitude values are not fabricated.
- Missing wards and locations remain null in master data.
