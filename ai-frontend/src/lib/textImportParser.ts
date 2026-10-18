/**
 * Utility functions for local text file reading, binary detection, UTF-8 BOM handling,
 * and YAML frontmatter extraction across Skills, Rules, and System Prompts.
 */

export const ALLOWED_TEXT_EXTENSIONS = [
  '.md',
  '.markdown',
  '.txt',
  '.rst',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.csv',
] as const;

export const MAX_TEXT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ParsedItemMetadata {
  filename: string;
  extension: string;
  sizeBytes: number;
  name: string;
  description: string;
  content: string; // raw content
  body: string; // content without frontmatter
  hasFrontmatter: boolean;
  frontmatter: Record<string, any> | null;
  // Specific to Rules
  activation_mode?: 'always_on' | 'model_decision' | 'glob' | 'manual';
  glob_patterns?: string[];
  tags?: string[];
  priority?: number;
  // Specific to Skills
  license?: string;
  compatibility?: string;
  allowed_tools?: string;
  metadata?: Record<string, string>;
  validationErrors: string[];
}

/**
 * Checks whether an array buffer contains binary signatures (null bytes or excessive control chars).
 */
export function isBinaryBuffer(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;

  let nullCount = 0;
  let controlCount = 0;
  const sampleLength = Math.min(bytes.length, 4096);

  for (let i = 0; i < sampleLength; i++) {
    const b = bytes[i];
    if (b === 0) {
      nullCount++;
    } else if (b < 32 && b !== 9 && b !== 10 && b !== 13) {
      controlCount++;
    }
  }

  if (nullCount > 0) return true;
  if (sampleLength > 0 && controlCount / sampleLength > 0.3) return true;

  return false;
}

/**
 * Reads a local File safely: validates extension, size, binary content, and strips UTF-8 BOM.
 */
export async function readAndValidateTextFile(file: File): Promise<{
  filename: string;
  extension: string;
  sizeBytes: number;
  content: string;
}> {
  const filename = file.name || 'untitled.txt';
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';

  if (!ALLOWED_TEXT_EXTENSIONS.includes(ext as any)) {
    throw new Error(
      `Định dạng tệp "${ext || 'không có phần mở rộng'}" không được hỗ trợ. Các định dạng văn bản cho phép: ${ALLOWED_TEXT_EXTENSIONS.join(', ')}.`
    );
  }

  if (file.size > MAX_TEXT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Dung lượng tệp (${sizeMb} MB) vượt quá giới hạn tối đa 5 MB.`);
  }

  // Check sample buffer for binary
  const sampleSlice = file.slice(0, 4096);
  const sampleBuffer = await sampleSlice.arrayBuffer();
  if (isBinaryBuffer(new Uint8Array(sampleBuffer))) {
    throw new Error('Tệp có dấu hiệu chứa dữ liệu nhị phân hoặc không thể giải mã văn bản thuần túy.');
  }

  // Read full text
  let rawText = await file.text();

  // Strip leading UTF-8 BOM (0xFEFF) if present
  if (rawText.charCodeAt(0) === 0xfeff) {
    rawText = rawText.slice(1);
  }

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!normalized.trim()) {
    throw new Error('Nội dung tệp rỗng hoặc chỉ chứa khoảng trắng.');
  }

  return {
    filename,
    extension: ext,
    sizeBytes: file.size,
    content: normalized,
  };
}

/**
 * Lightweight YAML frontmatter parser for extracting metadata without external dependencies.
 */
export function splitFrontmatterAndBody(text: string): {
  frontmatter: Record<string, any> | null;
  body: string;
} {
  const lines = text.split('\n');
  if (lines.length < 3 || lines[0].trim() !== '---') {
    return { frontmatter: null, body: text };
  }

  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closeIndex = i;
      break;
    }
  }

  if (closeIndex === -1) {
    return { frontmatter: null, body: text };
  }

  const fmLines = lines.slice(1, closeIndex);
  const bodyLines = lines.slice(closeIndex + 1);
  const parsed: Record<string, any> = {};

  let currentKey = '';
  let inList = false;

  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check list item: "- '...'" or "- item"
    if (trimmed.startsWith('- ') && currentKey && inList) {
      let itemVal = trimmed.slice(2).trim();
      if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
        itemVal = itemVal.slice(1, -1);
      }
      parsed[currentKey].push(itemVal);
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const rawVal = line.slice(colonIndex + 1).trim();

      if (rawVal === '') {
        // Could be start of list or dict
        currentKey = key;
        inList = true;
        parsed[key] = [];
      } else {
        inList = false;
        currentKey = key;
        let val: any = rawVal;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        }
        parsed[key] = val;
      }
    }
  }

  return {
    frontmatter: Object.keys(parsed).length > 0 ? parsed : null,
    body: bodyLines.join('\n').trim(),
  };
}

/**
 * Converts a string to standard kebab-case format required by Agent Skills Specification (a-z, 0-9, -).
 */
export function toKebabCase(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
      .slice(0, 64) || 'custom-skill'
  );
}

/**
 * Extracts candidate name and metadata tailored to target library (skills, rules, prompts).
 */
export function extractItemMetadata(
  target: 'skills' | 'rules' | 'prompts',
  filename: string,
  content: string,
  sizeBytes: number
): ParsedItemMetadata {
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';
  const baseName = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename;

  const { frontmatter, body } = splitFrontmatterAndBody(content);
  const validationErrors: string[] = [];

  // Suggest title/name
  let suggestedName = '';
  if (frontmatter?.name || frontmatter?.title) {
    suggestedName = String(frontmatter.name || frontmatter.title).trim();
  } else {
    // Check first heading in body
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        suggestedName = trimmed.replace(/^#+\s*/, '').trim().slice(0, 100);
        break;
      }
    }
    if (!suggestedName) {
      suggestedName = baseName.replace(/[_-]+/g, ' ').trim();
    }
  }

  let finalName = suggestedName;
  let description = '';

  if (target === 'skills') {
    // Skill names must be kebab-case
    finalName = toKebabCase(suggestedName);
    const nameRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!nameRegex.test(finalName)) {
      validationErrors.push('Tên Skill chỉ được chứa chữ thường (a-z), số (0-9) và dấu gạch nối (-).');
    }
    if (frontmatter?.description) {
      description = String(frontmatter.description).trim().slice(0, 1024);
    } else {
      description = `Kỹ năng được nhập từ tệp ${filename}`;
    }
  } else if (target === 'rules') {
    finalName = suggestedName.slice(0, 100);
    if (!finalName) {
      validationErrors.push('Tên quy tắc không được để trống.');
    }
    if (frontmatter?.description) {
      description = String(frontmatter.description).trim().slice(0, 500);
    } else {
      description = `Quy tắc được nhập từ tệp ${filename}`;
    }
  } else {
    // System Prompts
    finalName = suggestedName.slice(0, 100);
    if (!finalName) {
      validationErrors.push('Tên System Prompt không được để trống.');
    }
    if (frontmatter?.description) {
      description = String(frontmatter.description).trim().slice(0, 500);
    } else {
      description = `Chỉ dẫn hệ thống được nhập từ tệp ${filename}`;
    }
  }

  // Extract rules-specific fields
  let activation_mode: 'always_on' | 'model_decision' | 'glob' | 'manual' = 'always_on';
  if (frontmatter?.activation_mode && ['always_on', 'model_decision', 'glob', 'manual'].includes(frontmatter.activation_mode)) {
    activation_mode = frontmatter.activation_mode;
  }
  let glob_patterns: string[] = [];
  if (Array.isArray(frontmatter?.glob_patterns)) {
    glob_patterns = frontmatter.glob_patterns.map(String);
  }
  let tags: string[] = ['imported'];
  if (Array.isArray(frontmatter?.tags)) {
    tags = frontmatter.tags.map(String);
  } else if (typeof frontmatter?.category === 'string') {
    tags = [frontmatter.category];
  }
  let priority = 50;
  if (typeof frontmatter?.priority === 'number' && frontmatter.priority >= 0 && frontmatter.priority <= 100) {
    priority = frontmatter.priority;
  }

  // Extract skills-specific fields
  const license = frontmatter?.license ? String(frontmatter.license) : undefined;
  const compatibility = frontmatter?.compatibility ? String(frontmatter.compatibility) : undefined;
  const allowed_tools = frontmatter?.['allowed-tools'] ? String(frontmatter['allowed-tools']) : undefined;
  const extraMetadata = typeof frontmatter?.metadata === 'object' && frontmatter.metadata !== null ? frontmatter.metadata : undefined;

  return {
    filename,
    extension: ext,
    sizeBytes,
    name: finalName,
    description,
    content,
    body,
    hasFrontmatter: frontmatter !== null,
    frontmatter,
    activation_mode,
    glob_patterns,
    tags,
    priority,
    license,
    compatibility,
    allowed_tools,
    metadata: extraMetadata,
    validationErrors,
  };
}
