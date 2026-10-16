/**
 * Unified Attachment & Asset Service for AI-Chan
 * Handles client-side file upload, capabilities discovery, retrieval and deletion
 * Anti-IDOR, safe binary streams, and progress reporting
 */

export interface AttachmentItem {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  category: 'image' | 'document' | 'code' | 'archive' | 'audio' | 'video' | 'other';
  status: 'UPLOADING' | 'READY' | 'ATTACHED' | 'FAILED' | 'DELETED';
  checksum_sha256?: string;
  extracted_text?: string;
  extracted_text_preview?: string;
  image_width?: number;
  image_height?: number;
  conversation_id?: string;
  message_id?: string;
  project_id?: string;
  skill_id?: string;
  prompt_id?: string;
  download_url?: string;
  view_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ModelCapabilityItem {
  model_id: string;
  provider: string;
  supports_images: boolean;
  supports_pdf_native: boolean;
  supports_text_documents: boolean;
  max_file_size_mb: number;
}

export interface AttachmentCapabilitiesResponse {
  default_provider: string;
  max_file_size_mb: number;
  max_files_per_request: number;
  allowed_categories: string[];
  supported_mime_types: string[];
  models: ModelCapabilityItem[];
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

function getAuthHeaders(isMultipart = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ai_chan_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export class AttachmentService {
  /**
   * Tải lên tệp đính kèm cục bộ (Local Storage) lên hệ thống lưu trữ an toàn
   */
  static async uploadAttachment(
    file: File,
    contextType?: 'chat' | 'project_chat' | 'skill' | 'system_prompt',
    contextId?: string,
    onProgress?: (percent: number) => void
  ): Promise<AttachmentItem> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/attachments/upload`, true);
      xhr.withCredentials = true;

      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('ai_chan_token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            reject(new Error('Phản hồi từ máy chủ không hợp lệ.'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            const msg = err.detail?.message || err.detail || err.message || 'Lỗi khi tải tệp lên.';
            reject(new Error(msg));
          } catch {
            reject(new Error(`Tải tệp thất bại: HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Mất kết nối tới máy chủ khi tải tệp lên.'));
      };

      const formData = new FormData();
      formData.append('file', file);
      if (contextType) {
        formData.append('context_type', contextType);
      }
      if (contextId) {
        formData.append('context_id', contextId);
      }

      xhr.send(formData);
    });
  }

  /**
   * Truy vấn khả năng xử lý modality và giới hạn kích thước của các mô hình
   */
  static async getCapabilities(): Promise<AttachmentCapabilitiesResponse> {
    const res = await fetch(`${BASE_URL}/attachments/capabilities`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Không thể lấy thông tin capabilities.');
    }

    return res.json();
  }

  /**
   * Lấy danh sách tệp đính kèm theo bộ lọc ngữ cảnh
   */
  static async getAttachments(params?: {
    conversation_id?: string;
    project_id?: string;
    skill_id?: string;
    prompt_id?: string;
  }): Promise<AttachmentItem[]> {
    const query = new URLSearchParams();
    if (params?.conversation_id) query.append('conversation_id', params.conversation_id);
    if (params?.project_id) query.append('project_id', params.project_id);
    if (params?.skill_id) query.append('skill_id', params.skill_id);
    if (params?.prompt_id) query.append('prompt_id', params.prompt_id);

    const res = await fetch(`${BASE_URL}/attachments/?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Không thể tải danh sách tệp.');
    }

    const data = await res.json();
    return data.items || [];
  }

  /**
   * Lấy thông tin chi tiết một tệp
   */
  static async getAttachment(id: string): Promise<AttachmentItem> {
    const res = await fetch(`${BASE_URL}/attachments/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Tệp không tồn tại.');
    }

    return res.json();
  }

  /**
   * Xóa vĩnh viễn tệp đính kèm (Anti-IDOR)
   */
  static async deleteAttachment(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/attachments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Không thể xóa tệp.');
    }
  }

  /**
   * URL tải tệp về máy
   */
  static getDownloadUrl(id: string): string {
    return `${BASE_URL}/attachments/${id}/download`;
  }

  /**
   * URL xem trực tiếp tệp an toàn
   */
  static getViewUrl(id: string): string {
    return `${BASE_URL}/attachments/${id}/view`;
  }
}
