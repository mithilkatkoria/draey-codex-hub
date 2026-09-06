use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::PathBuf};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String, pub name: String, pub plan: String, pub accent: String,
    pub home: PathBuf, pub desktop_data: PathBuf, pub managed: bool,
    pub availability: String, pub created_at: String, pub last_used_at: Option<String>,
    #[serde(default)] pub connection: String,
    #[serde(default)] pub identity_key: Option<String>,
    #[serde(default)] pub account_email: Option<String>,
    #[serde(default)] pub actual_plan: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project { pub id: String, pub name: String, pub path: PathBuf, pub preferred_profile_id: Option<String>, pub pinned: bool, pub last_opened_at: Option<String> }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub desktop_exe: Option<PathBuf>, pub cli_exe: Option<PathBuf>, pub profile_root: Option<PathBuf>,
    pub auto_refresh: bool, pub refresh_seconds: u64, pub refresh_on_focus: bool, pub show_stale: bool,
    pub reduced_motion: bool, pub density: String, pub minimize_to_tray: bool, pub startup: bool, pub hide_after_launch: bool,
}
impl Default for Settings { fn default() -> Self { Self { desktop_exe: None, cli_exe: None, profile_root: None, auto_refresh: true, refresh_seconds: 60, refresh_on_focus: true, show_stale: true, reduced_motion: false, density: "comfortable".into(), minimize_to_tray: true, startup: false, hide_after_launch: false } } }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageWindow { pub id: String, pub label: String, pub bucket: String, pub used_percent: Option<f64>, pub remaining_percent: Option<f64>, pub resets_at: Option<i64>, pub duration_mins: Option<i64> }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot { pub windows: Vec<UsageWindow>, pub fetched_at: String, pub source: String, pub state: String, pub message: Option<String>, #[serde(default)] pub reset_credits: Option<ResetCredits> }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetCredits { pub available_count: Option<u64>, pub credits: Option<Vec<ResetCredit>> }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetCredit { pub status: String, pub expires_at: Option<i64>, pub title: String }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Store { pub version: u32, pub profiles: Vec<Profile>, pub projects: Vec<Project>, pub settings: Settings, pub usage_cache: HashMap<String, Snapshot> }
impl Default for Store { fn default() -> Self { Self { version: 1, profiles: vec![], projects: vec![], settings: Settings::default(), usage_cache: HashMap::new() } } }
pub fn now() -> String { chrono::Utc::now().to_rfc3339() }
pub fn name(s: &str) -> Result<String, String> { let s=s.trim(); if s.is_empty() || s.chars().count()>80 || s.chars().any(char::is_control) { Err("Use a name between 1 and 80 characters.".into()) } else { Ok(s.into()) } }
pub fn directory(p: &std::path::Path) -> Result<PathBuf, String> { if !p.is_absolute() || !p.is_dir() { return Err("Choose an existing absolute folder path.".into()) } p.canonicalize().map_err(|_| "Cannot access this folder.".into()) }
