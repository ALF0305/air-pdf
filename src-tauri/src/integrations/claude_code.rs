// Detect Claude Code / Claude API key / Ollama running
use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum ClaudeMode {
    Pro { version: String },
    CloudOnly,
    LocalOnly,
    None,
}

pub fn detect_mode() -> ClaudeMode {
    if let Ok(output) = Command::new("claude").arg("--version").output() {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return ClaudeMode::Pro { version };
        }
    }
    if std::env::var("ANTHROPIC_API_KEY").is_ok() {
        return ClaudeMode::CloudOnly;
    }
    if ollama_running() {
        return ClaudeMode::LocalOnly;
    }
    ClaudeMode::None
}

fn ollama_running() -> bool {
    use std::net::TcpStream;
    use std::time::Duration;
    if let Ok(addr) = "127.0.0.1:11434".parse() {
        TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok()
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_mode_returns_valid_variant() {
        let mode = detect_mode();
        match mode {
            ClaudeMode::Pro { .. }
            | ClaudeMode::CloudOnly
            | ClaudeMode::LocalOnly
            | ClaudeMode::None => {}
        }
    }
}
