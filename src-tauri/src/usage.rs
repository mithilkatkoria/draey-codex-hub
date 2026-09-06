use crate::model::*;
use serde_json::Value;
pub fn parse(value: &Value) -> Result<Snapshot, String> {
    let buckets: Vec<(String, &Value)> = match value.get("rateLimitsByLimitId").and_then(Value::as_object).filter(|m| !m.is_empty()) {
        Some(map) => map.iter().map(|(k,v)|(k.clone(),v)).collect(),
        None => value.get("rateLimits").filter(|v|v.is_object()).map(|v|vec![(v.get("limitId").and_then(Value::as_str).unwrap_or("codex").into(),v)]).unwrap_or_default(),
    };
    let mut windows=vec![];
    for (bucket,data) in buckets { let object=data.as_object().ok_or("Malformed allowance bucket.")?;
        for (key, window) in object { if !window.is_object() || !(window.get("usedPercent").is_some() || key=="primary" || key=="secondary") {continue;}
            let used=match window.get("usedPercent") {Some(Value::Null)|None=>None,Some(v)=>Some(v.as_f64().filter(|n|n.is_finite()&&*n>=0.0).ok_or("Malformed usage percentage.")?)};
            let duration=window.get("windowDurationMins").and_then(Value::as_i64).filter(|n|*n>0);
            let label=match duration {Some(10080)=>"Weekly".into(),Some(1440)=>"Daily".into(),Some(300)=>"Session".into(),Some(n) if n%60==0=>format!("{} hour",n/60),Some(n)=>format!("{n} minute"),None=>key.clone()};
            let resets=match window.get("resetsAt") {None|Some(Value::Null)=>None,Some(v)=>Some(v.as_i64().filter(|n|*n>0).ok_or("Malformed reset timestamp.")?)};
            windows.push(UsageWindow{id:format!("{bucket}:{key}"),label,bucket:data.get("limitName").and_then(Value::as_str).unwrap_or(&bucket).into(),used_percent:used,remaining_percent:used.map(|u|(100.0-u).clamp(0.0,100.0)),resets_at:resets,duration_mins:duration});
        }
    }
    if windows.is_empty() { return Err("Codex returned no usage windows for this account.".into()); }
    windows.sort_by_key(|w|(w.bucket.clone(),w.duration_mins.unwrap_or(i64::MAX)));
    Ok(Snapshot {windows,fetched_at:now(),source:"Codex app-server · account/rateLimits/read".into(),state:"live".into(),message:None,reset_credits:parse_reset_credits(value.get("rateLimitResetCredits"))})
}
// Reset credits are separate from workspace spending credits. Missing metadata must
// not become zero, and the server's count is authoritative even with capped rows.
fn parse_reset_credits(value: Option<&Value>) -> Option<ResetCredits> {
    let data = value?.as_object()?;
    let available_count = data.get("availableCount").and_then(Value::as_u64);
    let credits = data.get("credits").and_then(Value::as_array).map(|items| items.iter().filter_map(|v| {
        let status=v.get("status")?.as_str()?.to_string();
        let expires_at=v.get("expiresAt").and_then(Value::as_i64).filter(|n|*n>0);
        let title=v.get("title").and_then(Value::as_str).unwrap_or("Usage reset").to_string();
        Some(ResetCredit{status,expires_at,title})
    }).collect());
    Some(ResetCredits{available_count,credits})
}
#[cfg(test)] mod tests {
 use super::*;use serde_json::json;
 #[test] fn reset_credit_count_is_authoritative_and_null_is_unknown() {
   let value=json!({"rateLimits":{"primary":{"usedPercent":12}},"rateLimitResetCredits":{"availableCount":4,"credits":[{"status":"available","title":null,"expiresAt":1791092581}]}});
   let resets=parse(&value).unwrap().reset_credits.unwrap();assert_eq!(resets.available_count,Some(4));assert_eq!(resets.credits.unwrap().len(),1);
   let value=json!({"rateLimits":{"primary":{"usedPercent":12},"credits":{"balance":"20","hasCredits":true}}});assert!(parse(&value).unwrap().reset_credits.is_none());
   let unknown=parse_reset_credits(Some(&json!({"availableCount":null,"credits":null}))).unwrap();assert!(unknown.available_count.is_none());assert!(unknown.credits.is_none());
   let zero=parse_reset_credits(Some(&json!({"availableCount":0,"credits":[]}))).unwrap();assert_eq!(zero.available_count,Some(0));assert_eq!(zero.credits.unwrap().len(),0);
 }
 #[test] fn dynamic_pro_and_multiple_buckets() {let s=parse(&json!({"rateLimitsByLimitId":{"codex":{"secondary":{"usedPercent":23,"windowDurationMins":10080}},"spark":{"primary":{"usedPercent":100,"windowDurationMins":60}}}})).unwrap(); assert_eq!(s.windows.len(),2);assert_eq!(s.windows[0].label,"Weekly");assert_eq!(s.windows[0].remaining_percent,Some(77.));assert_eq!(s.windows[1].remaining_percent,Some(0.));}
 #[test] fn missing_is_not_zero() {let s=parse(&json!({"rateLimits":{"primary":{"usedPercent":null}}})).unwrap();assert_eq!(s.windows[0].remaining_percent,None);}
 #[test] fn malformed_rejected() {for v in [json!({}),json!({"rateLimits":{"primary":{"usedPercent":"80"}}}),json!({"rateLimits":{"primary":{"usedPercent":-1}}})] {assert!(parse(&v).is_err());}}
 #[test] fn used_over_100_clamped() {assert_eq!(parse(&json!({"rateLimits":{"primary":{"usedPercent":120}}})).unwrap().windows[0].remaining_percent,Some(0.));}
}
