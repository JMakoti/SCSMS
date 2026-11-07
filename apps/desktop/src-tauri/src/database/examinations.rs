use super::auth::AccountSession;
use super::candidature::BulkSummary;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::collections::HashSet;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExaminationAccess {
    can_read: bool,
    can_write: bool,
    can_view_candidates: bool,
}

async fn access(
    pool: &SqlitePool,
    user_id: &str,
    school_id: &str,
) -> Result<ExaminationAccess, String> {
    let row = sqlx::query("SELECT r.permissions_json,u.subcounty_id AS user_area,w.sub_county_id AS school_area FROM users u JOIN roles r ON r.id=u.role_id JOIN schools s ON s.id=? JOIN wards w ON w.id=s.ward_id WHERE u.id=? AND u.status='active'")
        .bind(school_id).bind(user_id).fetch_optional(pool).await.map_err(|e| e.to_string())?
        .ok_or("School or account was not found.")?;
    let permissions: Vec<String> =
        serde_json::from_str(&row.get::<String, _>("permissions_json")).unwrap_or_default();
    let user_area: Option<String> = row.get("user_area");
    let school_area: String = row.get("school_area");
    let same_area = user_area.as_ref().is_some_and(|area| area == &school_area);
    let allows = |name: &str| {
        permissions.iter().any(|p| {
            p == "*"
                || p == &format!("performance:school:{school_id}:{name}")
                || (same_area && p == &format!("performance:{name}"))
        })
    };
    let can_write = allows("write");
    let can_view_candidates = allows("candidates") || can_write;
    Ok(ExaminationAccess {
        can_read: allows("read") || can_view_candidates || can_write,
        can_write,
        can_view_candidates,
    })
}

#[tauri::command]
pub async fn examination_access(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
    school_id: String,
) -> Result<ExaminationAccess, String> {
    access(pool.inner(), &session.user_id()?, &school_id).await
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExaminationInput {
    school_id: String,
    academic_year_id: String,
    degree_threshold: String,
    candidate: Option<CandidateInput>,
    candidature: Option<BulkSummary>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CandidateInput {
    examination_number: String,
    candidate_name: String,
    gender: String,
    status: String,
    overall_grade: Option<String>,
    overall_score: Option<f64>,
    subjects: Vec<SubjectInput>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubjectInput {
    subject_code: String,
    subject_name: String,
    status: String,
    grade: Option<String>,
    score: Option<f64>,
}
pub(super) const KCSE: &[&str] = &[
    "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E",
];
fn score_valid(score: Option<f64>) -> bool {
    score.map_or(true, |value| {
        value.is_finite() && (0.0..=100.0).contains(&value)
    })
}
fn valid_result(status: &str, grade: &Option<String>, score: Option<f64>, grades: &[&str]) -> bool {
    if !["missing", "submitted", "absent", "withheld"].contains(&status) || !score_valid(score) {
        return false;
    }
    if status == "submitted" {
        grade
            .as_ref()
            .is_some_and(|value| grades.contains(&value.as_str()))
    } else {
        grade.is_none() && score.is_none()
    }
}

#[tauri::command]
pub async fn save_school_examination(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
    mut input: ExaminationInput,
) -> Result<(), String> {
    let permission = access(pool.inner(), &session.user_id()?, &input.school_id).await?;
    if !permission.can_write {
        return Err("You do not have permission to save this school's examination results.".into());
    }
    let school = sqlx::query("SELECT level,gender_type FROM schools WHERE id=?")
        .bind(&input.school_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    let level: String = school.get("level");
    let kind = match level.as_str() {
        "senior" => "KCSE",
        "junior" => "KJSEA",
        "primary" => "KPSEA",
        _ => return Err("School examination level is unavailable.".into()),
    };
    let grades: &[&str] = match kind {
        "KCSE" => KCSE,
        "KJSEA" => &["EE1", "EE2", "ME1", "ME2", "AE1", "AE2", "BE1", "BE2"],
        _ => &["EE", "ME", "AE", "BE"],
    };
    if !KCSE.contains(&input.degree_threshold.as_str()) {
        return Err("Invalid degree threshold.".into());
    }
    let examination_year: Option<String> =
        sqlx::query_scalar("SELECT name FROM academic_years WHERE id=?")
            .bind(&input.academic_year_id)
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    let examination_year = examination_year.ok_or("Academic year not found.")?;
    if input.candidature.is_some() && input.candidate.is_some() {
        return Err("Save bulk candidature separately from individual results.".into());
    }
    if let Some(summary) = input.candidature.as_mut() {
        let gender: Option<String> = school.get("gender_type");
        summary
            .validate(
                pool.inner(),
                &input.school_id,
                &input.academic_year_id,
                kind,
                gender.as_deref(),
                grades,
            )
            .await?;
    }
    if let Some(candidate) = &input.candidate {
        let gender: Option<String> = school.get("gender_type");
        if candidate.examination_number.trim().is_empty()
            || candidate.examination_number.len() > 80
            || candidate.candidate_name.trim().is_empty()
            || candidate.candidate_name.len() > 800
            || !["male", "female", "unknown"].contains(&candidate.gender.as_str())
            || candidate.subjects.len() > 50
        {
            return Err("Enter valid candidate registration details.".into());
        }
        if (gender.as_deref() == Some("boys") && candidate.gender == "female")
            || (gender.as_deref() == Some("girls") && candidate.gender == "male")
        {
            return Err("Candidate gender does not match the school category.".into());
        }
        if kind == "KCSE" {
            if !valid_result(
                &candidate.status,
                &candidate.overall_grade,
                candidate.overall_score,
                KCSE,
            ) {
                return Err("Enter the official KCSE mean grade for submitted results; absent or missing results must be empty.".into());
            }
        } else if !["missing", "submitted", "absent", "withheld"]
            .contains(&candidate.status.as_str())
            || candidate.overall_grade.is_some()
            || candidate.overall_score.is_some()
        {
            return Err("This assessment does not use an overall mean grade or score.".into());
        }
        if kind != "KCSE"
            && candidate.status == "submitted"
            && !candidate
                .subjects
                .iter()
                .any(|subject| subject.status == "submitted")
        {
            return Err("Enter at least one official learning-area result.".into());
        }
        if ["absent", "withheld"].contains(&candidate.status.as_str())
            && candidate
                .subjects
                .iter()
                .any(|subject| subject.status == "submitted")
        {
            return Err(
                "Absent or withheld candidates cannot have submitted subject results.".into(),
            );
        }
        let combinations: Vec<String> = sqlx::query_scalar("SELECT combination FROM school_subject_combinations WHERE school_id=? AND academic_year_id=? AND is_active=1").bind(&input.school_id).bind(&input.academic_year_id).fetch_all(pool.inner()).await.map_err(|e|e.to_string())?;
        let recorded: Vec<String> = sqlx::query_scalar("SELECT DISTINCT r.subject_name FROM performance_candidate_subjects r JOIN performance_candidates c ON c.id=r.candidate_id JOIN performance_records p ON p.id=c.performance_record_id WHERE p.school_id=? AND p.academic_year_id=?").bind(&input.school_id).bind(&input.academic_year_id).fetch_all(pool.inner()).await.map_err(|e|e.to_string())?;
        let previous_subjects: Vec<String> = sqlx::query_scalar("SELECT DISTINCT r.subject FROM performance_subject_rows r JOIN performance_records p ON p.id=r.performance_record_id WHERE p.school_id=? AND p.academic_year_id=?").bind(&input.school_id).bind(&input.academic_year_id).fetch_all(pool.inner()).await.map_err(|e|e.to_string())?;
        let mappings = sqlx::query("SELECT DISTINCT r.subject_code,r.subject_name FROM performance_candidate_subjects r JOIN performance_candidates c ON c.id=r.candidate_id JOIN performance_records p ON p.id=c.performance_record_id WHERE p.school_id=? AND p.academic_year_id=? AND p.examination_type=?").bind(&input.school_id).bind(&input.academic_year_id).bind(kind).fetch_all(pool.inner()).await.map_err(|e|e.to_string())?;
        let mut available: HashSet<String> = combinations
            .iter()
            .flat_map(|value| {
                value
                    .split([',', ';', '+'])
                    .map(|name| name.trim().to_lowercase())
            })
            .collect();
        available.extend(recorded.iter().map(|name| name.to_lowercase()));
        available.extend(previous_subjects.iter().map(|name| name.to_lowercase()));
        let mut codes = HashSet::new();
        for subject in &candidate.subjects {
            if mappings.iter().any(|row| {
                row.get::<String, _>("subject_code")
                    .eq_ignore_ascii_case(subject.subject_code.trim())
                    && !row
                        .get::<String, _>("subject_name")
                        .eq_ignore_ascii_case(subject.subject_name.trim())
            }) {
                return Err("This subject code is already assigned to a different subject in this examination.".into());
            }
            if subject.subject_code.trim().is_empty()
                || subject.subject_code.len() > 80
                || subject.subject_name.trim().is_empty()
                || subject.subject_name.len() > 600
                || !codes.insert(subject.subject_code.to_lowercase())
                || !valid_result(&subject.status, &subject.grade, subject.score, grades)
            {
                return Err("Enter valid, non-duplicate subject results using the examination's official grades.".into());
            }
            if kind == "KCSE" && !available.contains(&subject.subject_name.to_lowercase()) {
                return Err(
                    "Select subjects offered by this senior school for the selected year.".into(),
                );
            }
        }
    }
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    let typed_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type=?").bind(&input.school_id).bind(&input.academic_year_id).bind(kind).fetch_one(&mut *tx).await.map_err(|e|e.to_string())?;
    if typed_count == 0 {
        let legacy = sqlx::query("SELECT id,notes,candidates,average_score,assessment_name FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type IS NULL AND assessment_type='national' AND term_id IS NULL AND UPPER(assessment_name)=? LIMIT 2").bind(&input.school_id).bind(&input.academic_year_id).bind(kind).fetch_all(&mut *tx).await.map_err(|e|e.to_string())?;
        if legacy.len() == 1 {
            let old = &legacy[0];
            let notes = serde_json::json!({"originalNotes":old.get::<Option<String>,_>("notes"),"scsmsLegacyExaminationSummary":{"candidates":old.get::<i64,_>("candidates"),"average_score":old.get::<Option<f64>,_>("average_score"),"assessment_name":old.get::<String,_>("assessment_name")}}).to_string();
            sqlx::query("UPDATE performance_records SET examination_type=?,degree_threshold=?,notes=? WHERE id=? AND examination_type IS NULL").bind(kind).bind(&input.degree_threshold).bind(notes).bind(old.get::<String,_>("id")).execute(&mut *tx).await.map_err(|e|e.to_string())?;
        }
    }
    sqlx::query("INSERT INTO performance_records(id,school_id,academic_year_id,assessment_name,assessment_type,examination_type,degree_threshold,grade_band) VALUES (?,?,?,?,'national',?,?,?) ON CONFLICT(school_id,academic_year_id,examination_type) DO UPDATE SET degree_threshold=excluded.degree_threshold")
        .bind(uuid::Uuid::new_v4().to_string()).bind(&input.school_id).bind(&input.academic_year_id).bind(kind).bind(kind).bind(&input.degree_threshold).bind(match kind {"KCSE"=>"Form 4","KJSEA"=>"Grade 9",_=>"Grade 6"}).execute(&mut *tx).await.map_err(|e|e.to_string())?;
    let record_id: String = sqlx::query_scalar("SELECT id FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type=?").bind(&input.school_id).bind(&input.academic_year_id).bind(kind).fetch_one(&mut *tx).await.map_err(|e|e.to_string())?;
    if let Some(summary) = &input.candidature {
        sqlx::query("INSERT INTO performance_candidature_summaries(id,performance_record_id,summary_json,updated_at) VALUES (?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(performance_record_id) DO UPDATE SET summary_json=excluded.summary_json,updated_at=excluded.updated_at")
            .bind(uuid::Uuid::new_v4().to_string()).bind(&record_id).bind(serde_json::to_string(summary).map_err(|e|e.to_string())?).execute(&mut *tx).await.map_err(|e|e.to_string())?;
    }
    if let Some(candidate) = input.candidate {
        sqlx::query("INSERT INTO performance_candidates(id,performance_record_id,examination_number,candidate_name,gender,cohort,status,overall_grade,overall_score,updated_at) VALUES (?,?,?,?,?,?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(performance_record_id,examination_number) DO UPDATE SET candidate_name=excluded.candidate_name,gender=excluded.gender,cohort=excluded.cohort,status=excluded.status,overall_grade=excluded.overall_grade,overall_score=excluded.overall_score,updated_at=excluded.updated_at")
            .bind(uuid::Uuid::new_v4().to_string()).bind(&record_id).bind(candidate.examination_number.trim().to_uppercase()).bind(&candidate.candidate_name).bind(&candidate.gender).bind(&examination_year).bind(&candidate.status).bind(&candidate.overall_grade).bind(candidate.overall_score).execute(&mut *tx).await.map_err(|e|e.to_string())?;
        let candidate_id: String = sqlx::query_scalar("SELECT id FROM performance_candidates WHERE performance_record_id=? AND examination_number=?").bind(&record_id).bind(candidate.examination_number.trim().to_uppercase()).fetch_one(&mut *tx).await.map_err(|e|e.to_string())?;
        sqlx::query("DELETE FROM performance_candidate_subjects WHERE candidate_id=?")
            .bind(&candidate_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        for subject in candidate.subjects {
            sqlx::query("INSERT INTO performance_candidate_subjects(id,candidate_id,subject_code,subject_name,status,grade,score) VALUES (?,?,?,?,?,?,?)").bind(uuid::Uuid::new_v4().to_string()).bind(&candidate_id).bind(subject.subject_code.trim().to_uppercase()).bind(subject.subject_name.trim()).bind(subject.status).bind(subject.grade).bind(subject.score).execute(&mut *tx).await.map_err(|e|e.to_string())?;
        }
    }
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM performance_candidates WHERE performance_record_id=?",
    )
    .bind(&record_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    let mean: Option<f64> = if kind == "KCSE" {
        sqlx::query_scalar("SELECT AVG(overall_score) FROM performance_candidates WHERE performance_record_id=? AND status='submitted'").bind(&record_id).fetch_one(&mut *tx).await.map_err(|e|e.to_string())?
    } else {
        None
    };
    let threshold = KCSE.len()
        - KCSE
            .iter()
            .position(|grade| *grade == input.degree_threshold)
            .unwrap_or(5);
    let pass_rate: Option<f64> = if kind == "KCSE" {
        let cases = KCSE
            .iter()
            .enumerate()
            .map(|(index, grade)| format!("WHEN '{grade}' THEN {}", KCSE.len() - index))
            .collect::<Vec<_>>()
            .join(" ");
        sqlx::query_scalar(&format!("SELECT 100.0*SUM(CASE WHEN (CASE overall_grade {cases} ELSE NULL END)>={threshold} THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) FROM performance_candidates WHERE performance_record_id=? AND status='submitted'")).bind(&record_id).fetch_one(&mut *tx).await.map_err(|e|e.to_string())?
    } else {
        None
    };
    sqlx::query(
        "UPDATE performance_records SET candidates=?,average_score=?,pass_rate=? WHERE id=?",
    )
    .bind(total)
    .bind(mean)
    .bind(pass_rate)
    .bind(&record_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    let bulk: Option<String> = sqlx::query_scalar(
        "SELECT summary_json FROM performance_candidature_summaries WHERE performance_record_id=?",
    )
    .bind(&record_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    if let Some(json) = bulk {
        let summary: BulkSummary = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        let submitted = summary.male.submitted + summary.female.submitted;
        let qualified: u32 = summary
            .overall_grades
            .iter()
            .filter(|row| {
                KCSE.iter()
                    .position(|grade| *grade == row.grade)
                    .is_some_and(|index| KCSE.len() - index >= threshold)
            })
            .map(|row| row.male + row.female)
            .sum();
        let rate = if kind == "KCSE" && submitted > 0 {
            Some(100.0 * qualified as f64 / submitted as f64)
        } else {
            None
        };
        sqlx::query(
            "UPDATE performance_records SET candidates=?,average_score=NULL,pass_rate=? WHERE id=?",
        )
        .bind(summary.male.registered + summary.female.registered)
        .bind(rate)
        .bind(&record_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())
}
