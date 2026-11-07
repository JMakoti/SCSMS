use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashSet;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn attendance_requires_balanced_counts_and_complete_absence_reasons() {
        let mut value: Attendance = serde_json::from_value(serde_json::json!({"registered":20,"present":18,"absent":2,"submitted":15,"withheld":1,"reasons":[{"reason":"Illness","count":2}]})).unwrap();
        assert!(value.validate().is_ok());
        value.reasons[0].count = 1;
        assert!(value.validate().is_err());
        value.reasons[0].count = 2;
        value.present = 19;
        assert!(value.validate().is_err());
    }
    #[test]
    fn native_bulk_validation_accepts_elective_subsets_and_rejects_invalid_grades() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            for sql in ["CREATE TABLE school_subject_combinations(school_id TEXT,academic_year_id TEXT,combination TEXT,is_active INTEGER)","CREATE TABLE performance_records(id TEXT,school_id TEXT,academic_year_id TEXT)","CREATE TABLE performance_candidates(id TEXT,performance_record_id TEXT)","CREATE TABLE performance_candidate_subjects(candidate_id TEXT,subject_name TEXT)","CREATE TABLE performance_subject_rows(performance_record_id TEXT,subject TEXT)","INSERT INTO school_subject_combinations VALUES ('school','year','English, Biology',1)"] { sqlx::query(sql).execute(&pool).await.unwrap(); }
            let zero = serde_json::json!({"registered":0,"present":0,"absent":0,"submitted":0,"withheld":0,"reasons":[]});
            let mut value:BulkSummary=serde_json::from_value(serde_json::json!({"examinationNumber":" centre-001 ","male":{"registered":10,"present":8,"absent":2,"submitted":8,"withheld":0,"reasons":[{"reason":"Illness","count":2}]},"female":zero,"overallGrades":[{"grade":"C+","male":8,"female":0}],"subjects":[{"subjectCode":"231","subjectName":"Biology","male":{"registered":4,"present":3,"absent":1,"submitted":3,"withheld":0,"reasons":[{"reason":"Illness","count":1}]},"female":zero,"grades":[{"grade":"A","male":3,"female":0}]}]})).unwrap();
            assert!(value
                .validate(
                    &pool,
                    "school",
                    "year",
                    "KCSE",
                    Some("boys"),
                    super::super::examinations::KCSE
                )
                .await
                .is_ok());
            assert_eq!(value.examination_number, "CENTRE-001");
            value.subjects[0].grades[0].grade = "EE1".into();
            assert!(value
                .validate(
                    &pool,
                    "school",
                    "year",
                    "KCSE",
                    Some("boys"),
                    super::super::examinations::KCSE
                )
                .await
                .is_err());
        });
    }
}

#[derive(Deserialize, Serialize)]
pub(super) struct Reason {
    reason: String,
    count: u32,
}
#[derive(Deserialize, Serialize)]
pub(super) struct Attendance {
    pub registered: u32,
    pub present: u32,
    pub absent: u32,
    pub submitted: u32,
    pub withheld: u32,
    reasons: Vec<Reason>,
}
impl Attendance {
    fn validate(&self) -> Result<(), String> {
        if [
            self.registered,
            self.present,
            self.absent,
            self.submitted,
            self.withheld,
        ]
        .iter()
        .any(|n| *n > 100_000)
            || self.present as u64 + self.absent as u64 != self.registered as u64
            || self.submitted as u64 + self.withheld as u64 > self.present as u64
        {
            return Err("Present plus absent must equal registered; submitted and withheld cannot exceed present.".into());
        }
        if self.reasons.len() > 100
            || self.reasons.iter().any(|r| {
                r.reason.trim().is_empty()
                    || r.reason.chars().count() > 300
                    || r.count == 0
                    || r.count > 100_000
            })
            || self.reasons.iter().map(|r| r.count as u64).sum::<u64>() != self.absent as u64
        {
            return Err("Reasons and counts must account for every absent candidate.".into());
        }
        Ok(())
    }
}
#[derive(Deserialize, Serialize)]
pub(super) struct GradeCount {
    pub grade: String,
    pub male: u32,
    pub female: u32,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Subject {
    subject_code: String,
    subject_name: String,
    male: Attendance,
    female: Attendance,
    grades: Vec<GradeCount>,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct BulkSummary {
    examination_number: String,
    pub male: Attendance,
    pub female: Attendance,
    pub overall_grades: Vec<GradeCount>,
    subjects: Vec<Subject>,
}
fn check_grades(
    rows: &[GradeCount],
    grades: &[&str],
    male: u32,
    female: u32,
) -> Result<(), String> {
    let mut seen = HashSet::new();
    if rows.len() > 12
        || rows.iter().any(|r| {
            !grades.contains(&r.grade.as_str())
                || !seen.insert(&r.grade)
                || r.male > 100_000
                || r.female > 100_000
        })
        || rows.iter().map(|r| r.male as u64).sum::<u64>() != male as u64
        || rows.iter().map(|r| r.female as u64).sum::<u64>() != female as u64
    {
        return Err(
            "Use unique official grades whose gender totals match submitted results.".into(),
        );
    }
    Ok(())
}
impl BulkSummary {
    pub async fn validate(
        &mut self,
        pool: &SqlitePool,
        school: &str,
        year: &str,
        kind: &str,
        school_gender: Option<&str>,
        grades: &[&str],
    ) -> Result<(), String> {
        self.examination_number = self.examination_number.trim().to_uppercase();
        if self.examination_number.is_empty()
            || self.examination_number.chars().count() > 80
            || self.subjects.len() > 50
        {
            return Err("Enter a valid examination/centre number and at most 50 subjects.".into());
        }
        self.male.validate()?;
        self.female.validate()?;
        if (school_gender == Some("boys") && self.female.registered > 0)
            || (school_gender == Some("girls") && self.male.registered > 0)
        {
            return Err("Candidature gender does not match the school category.".into());
        }
        if kind == "KCSE" {
            check_grades(
                &self.overall_grades,
                grades,
                self.male.submitted,
                self.female.submitted,
            )?;
        } else if !self.overall_grades.is_empty() {
            return Err("CBC learning areas cannot have combined overall grades.".into());
        }
        let combinations:Vec<String>=sqlx::query_scalar("SELECT combination FROM school_subject_combinations WHERE school_id=? AND academic_year_id=? AND is_active=1").bind(school).bind(year).fetch_all(pool).await.map_err(|e|e.to_string())?;
        let recorded:Vec<String>=sqlx::query_scalar("SELECT DISTINCT r.subject_name FROM performance_candidate_subjects r JOIN performance_candidates c ON c.id=r.candidate_id JOIN performance_records p ON p.id=c.performance_record_id WHERE p.school_id=? AND p.academic_year_id=?").bind(school).bind(year).fetch_all(pool).await.map_err(|e|e.to_string())?;
        let legacy:Vec<String>=sqlx::query_scalar("SELECT DISTINCT r.subject FROM performance_subject_rows r JOIN performance_records p ON p.id=r.performance_record_id WHERE p.school_id=? AND p.academic_year_id=?").bind(school).bind(year).fetch_all(pool).await.map_err(|e|e.to_string())?;
        let mut available: HashSet<String> = combinations
            .iter()
            .flat_map(|s| s.split([',', ';', '+']).map(|n| n.trim().to_lowercase()))
            .collect();
        available.extend(
            recorded
                .iter()
                .chain(legacy.iter())
                .map(|s| s.to_lowercase()),
        );
        let mut codes = HashSet::new();
        let mut names = HashSet::new();
        for subject in &mut self.subjects {
            subject.subject_code = subject.subject_code.trim().to_uppercase();
            subject.subject_name = subject.subject_name.trim().to_string();
            if subject.subject_code.is_empty()
                || subject.subject_code.len() > 80
                || subject.subject_name.is_empty()
                || subject.subject_name.chars().count() > 150
                || !codes.insert(subject.subject_code.clone())
                || !names.insert(subject.subject_name.to_lowercase())
            {
                return Err("Select unique subjects with valid names and official codes.".into());
            }
            if kind == "KCSE" && !available.contains(&subject.subject_name.to_lowercase()) {
                return Err("Select subjects offered by this senior school.".into());
            }
            subject.male.validate()?;
            subject.female.validate()?;
            if subject.male.registered > self.male.registered
                || subject.female.registered > self.female.registered
                || subject.male.present > self.male.present
                || subject.female.present > self.female.present
            {
                return Err(
                    "Subject candidature and attendance cannot exceed school gender totals.".into(),
                );
            }
            check_grades(
                &subject.grades,
                grades,
                subject.male.submitted,
                subject.female.submitted,
            )?;
        }
        Ok(())
    }
}
