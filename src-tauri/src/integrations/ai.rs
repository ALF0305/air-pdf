// Lightweight Claude API client — sends a single non-streaming prompt.
use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const MODEL: &str = "claude-opus-4-6";
const ANTHROPIC_VERSION: &str = "2023-06-01";

#[derive(Serialize)]
struct Message<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct Request<'a> {
    model: &'a str,
    max_tokens: u32,
    messages: Vec<Message<'a>>,
}

#[derive(Deserialize)]
struct TextBlock {
    #[serde(rename = "type")]
    kind: String,
    text: Option<String>,
}

#[derive(Deserialize)]
struct Response {
    content: Vec<TextBlock>,
}

/// Send a single prompt to Claude and return the concatenated text response.
pub async fn ask_claude(api_key: &str, prompt: &str) -> Result<String> {
    if api_key.trim().is_empty() {
        return Err(AppError::InvalidInput("API key vacía".into()));
    }
    let body = Request {
        model: MODEL,
        max_tokens: 4096,
        messages: vec![Message {
            role: "user",
            content: prompt,
        }],
    };
    let client = reqwest::Client::new();
    let resp = client
        .post(API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Io(format!("Claude request failed: {}", e)))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Io(format!("Claude API {}: {}", status, text)));
    }

    let parsed: Response = resp
        .json()
        .await
        .map_err(|e| AppError::Io(format!("Claude parse: {}", e)))?;

    let mut out = String::new();
    for block in parsed.content {
        if block.kind == "text" {
            if let Some(t) = block.text {
                out.push_str(&t);
            }
        }
    }
    Ok(out)
}
