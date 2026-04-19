use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize)]
pub enum AppError {
    #[error("PDF error: {0}")]
    Pdf(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Not implemented yet")]
    NotImplemented,
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
