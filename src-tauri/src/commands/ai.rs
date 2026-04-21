use crate::integrations::ai;

#[tauri::command]
pub async fn ai_ask_claude(
    api_key: String,
    prompt: String,
) -> Result<String, String> {
    ai::ask_claude(&api_key, &prompt)
        .await
        .map_err(|e| e.to_string())
}

/// Try to read the Anthropic API key from the local ai-sync secrets file.
/// Looks for `anthropic_api_key = "..."` in `~/.claude/ai-sync/.secrets.toml`.
/// Returns empty string if not found.
#[tauri::command]
pub async fn ai_read_local_api_key() -> Result<String, String> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return Ok(String::new()),
    };
    let path = home.join(".claude").join("ai-sync").join(".secrets.toml");
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Ok(String::new()),
    };

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("anthropic_api_key") {
            if let Some(eq_pos) = trimmed.find('=') {
                let value = trimmed[eq_pos + 1..].trim();
                let unquoted = value.trim_matches('"').trim_matches('\'');
                if !unquoted.is_empty() {
                    return Ok(unquoted.to_string());
                }
            }
        }
    }
    Ok(String::new())
}
