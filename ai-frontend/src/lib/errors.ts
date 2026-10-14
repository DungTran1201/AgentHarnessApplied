/**
 * Centralized error handler and English copy translation for API responses.
 * Maps backend error codes, HTTP status codes, and exception shapes to user-friendly English messages.
 */

const ERROR_CODE_MAP: Record<string, string> = {
  DAILY_QUOTA_EXCEEDED: 'Daily token quota has been exceeded. Please try again tomorrow.',
  LLM_STREAM_ERROR: 'An error occurred while streaming AI response. Please retry.',
  INVALID_GRAPH_STRUCTURE: 'The project workflow graph is invalid or has disconnected nodes.',
  QUOTA_EXCEEDED: 'Active project limit reached. Stop or deactivate another project first.',
  PROJECT_NOT_ACTIVE: 'This project is not currently active. Activate it to start chatting.',
  WORD_LIMIT_EXCEEDED: 'The message exceeds the word limit defined for this project.',
  MODEL_UNAVAILABLE: 'The selected AI model is currently unavailable or inactive.',
  PROMPT_UNAVAILABLE: 'The specified system prompt could not be found or loaded.',
  PROMPT_NAME_CONFLICT: 'A system prompt with this name already exists. Please choose another name.',
  PROMPT_NOT_FOUND: 'The requested system prompt was not found.',
  DB_INSERT_FAILED: 'Could not save record to database. Please try again.',
  SKILL_NAME_CONFLICT: 'A skill with this name already exists.',
  SKILL_VALIDATION_FAILED: 'Skill definition validation failed. Please check required fields.',
  CONCURRENCY_CONFLICT: 'This resource was updated by another session. Please refresh.',
};

export function formatErrorMessage(err: any, fallbackMessage: string = 'An unexpected error occurred'): string {
  if (!err) return fallbackMessage;

  // 1. If error object has error_code or code
  const code = err.error_code || err.code || (err.detail && typeof err.detail === 'object' && (err.detail.error_code || err.detail.code));
  if (code && ERROR_CODE_MAP[code]) {
    return ERROR_CODE_MAP[code];
  }

  // 2. Check detail message
  let msg = '';
  if (typeof err === 'string') {
    msg = err;
  } else if (err.detail) {
    if (typeof err.detail === 'string') msg = err.detail;
    else if (err.detail.message) msg = err.detail.message;
    else if (Array.isArray(err.detail.errors)) msg = err.detail.errors.join('; ');
  } else if (err.message) {
    msg = err.message;
  }

  // Don't leak raw internal python / sql errors or tracebacks
  if (msg.includes('Traceback') || msg.includes('Internal Server Error') || msg.includes('sqlite3') || msg.includes('OperationalError')) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Detailed backend error:', msg);
    }
    return fallbackMessage;
  }

  // If msg is already clean English or descriptive, return it (if reasonable length)
  if (msg && msg.length < 200 && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(msg)) {
    return msg;
  }

  return fallbackMessage;
}

export const getErrorMessage = formatErrorMessage;
