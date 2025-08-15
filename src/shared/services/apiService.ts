/**
 * Desktop API Service - 모바일 앱 api.ts 기반
 * 데스크톱용 백엔드 API 통신 모듈
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { authService } from './authService';

// 환경별 API URL 설정 (데스크톱용)
const getApiBaseUrl = () => {
  // 데스크톱에서는 항상 프로덕션 서버 사용
  return 'https://memobee-ai-production.up.railway.app';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 Desktop API_BASE_URL:', API_BASE_URL);

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30초
  headers: {
    'Content-Type': 'application/json',
  },
});

// 첨부파일 업로드 전용 클라이언트
const uploadClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5분 타임아웃
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Request Interceptor - JWT 토큰 자동 첨부
apiClient.interceptors.request.use(
  async config => {
    try {
      console.log('🌐 Desktop API 요청 URL:', (config.baseURL || '') + (config.url || ''));
      console.log('🌐 Method:', config.method && config.method.toUpperCase());

      if (!config.headers.Authorization) {
        console.log('🔑 Desktop ID 토큰 가져오기 시도...');
        const idToken = await authService.getIdToken();
        if (idToken) {
          config.headers.Authorization = `Bearer ${idToken}`;
          console.log('✅ Desktop Authorization 헤더 추가됨');
        } else {
          console.warn('⚠️ 현재 사용자 없음 - 토큰 첨부 불가');
        }
      }
    } catch (error) {
      console.error('❌ Desktop Firebase ID Token 가져오기 실패:', error);
      console.warn('⚠️ 토큰 없이 API 요청을 계속 진행합니다');
    }

    return config;
  },
  error => {
    console.error('🚨 Desktop Request Error:', error);
    return Promise.reject(error);
  },
);

// Response Interceptor - 에러 처리
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ Desktop API 성공: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    console.error(
      `❌ Desktop API Error: ${error.config && error.config.method && error.config.method.toUpperCase()} ${error.config && error.config.url
      } - ${error.response && error.response.status}`,
    );

    if (error.response && error.response.status === 401) {
      console.warn('Desktop Unauthorized access - token may be expired');
    }

    return Promise.reject(error);
  },
);

// 업로드 클라이언트 인터셉터 설정
uploadClient.interceptors.request.use(
  async config => {
    try {
      if (!config.headers.Authorization) {
        const idToken = await authService.getIdToken();
        if (idToken) {
          config.headers.Authorization = `Bearer ${idToken}`;
        }
      }
    } catch (error) {
      console.error('❌ Desktop Upload Client - Firebase ID Token 가져오기 실패:', error);
    }

    return config;
  },
  error => {
    console.error('🚨 Desktop Upload Request Error:', error);
    return Promise.reject(error);
  },
);

uploadClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ Desktop Upload 성공: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    console.error(
      `❌ Desktop Upload Error: ${error.config && error.config.method && error.config.method.toUpperCase()} ${error.config && error.config.url
      } - ${error.response && error.response.status}`,
    );
    return Promise.reject(error);
  },
);

// TypeScript 인터페이스 정의 (모바일과 호환)
export interface Attachment {
  id: number;
  filename: string;
  r2_key?: string;
  filetype: string;
  filesize: number;
  created_at: string;
  memo_id: number;
  attachment_type: string;
  owner_id: string;
  public_url?: string;
  link_metadata?: any;
  content_hash?: string;
}

export interface AiEntity {
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'PRODUCT' | 'EVENT' | 'DATETIME' | 'OTHER';
  name: string;
}

// 피드백 관련 인터페이스
export interface FeedbackResponse {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  is_anonymous: boolean;
  admin_response?: string;
  created_at: string;
  updated_at?: string;
  responded_at?: string;
}

export interface FeedbackListResponse {
  feedbacks: FeedbackResponse[];
  total: number;
  limit: number;
  skip: number;
}

export interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_favorited?: boolean;
  favorited_at?: string | null;
  is_security_memo?: boolean;
  security_level?: number;
  is_ai_generated?: boolean;
  attachments?: Attachment[];
  content_json?: any;
  content_version?: string;
  ai_analysis_result?: {
    ai_title?: string;
    ai_category: string;
    ai_tags: string[];
    ai_topics: string[];
    ai_entities: AiEntity[];
    ai_sentiment_keywords: string[];
    ai_sentiment_score: number;
  } | null;
  ai_analysis_version?: number;
  ai_analysis_timestamp?: string;
  ai_category?: string;
  ai_tags?: string[];
  ai_topics?: string[];
  ai_entities?: AiEntity[];
  ai_sentiment_keywords?: string[];
  ai_sentiment_score?: number;
  ai_title?: string;
}

export interface CreateMemoRequest {
  title: string;
  content: string;
  content_json?: any;
  content_version?: string;
}

export interface UpdateMemoRequest {
  title?: string;
  content?: string;
  content_json?: any;
  content_version?: string;
}

export interface AIQuestionRequest {
  question: string;
}

export interface AIQuestionResponse {
  type: 'search_result' | 'generated_memo' | 'no_memos_found_suggest_ai';
  intent: 'SEARCH' | 'GENERATE';
  memos?: {
    id: number;
    title: string;
    content: string;
    created_at: string;
    labels: string[];
  }[];
  total_count?: number;
  new_memo?: {
    id?: number;
    title: string;
    content: string;
    summary: string;
    key_points: string[];
    source_analysis: string;
  };
  source_memos_count?: number;
  original_question?: string;
  action_description?: string;
  detected_language?: string;
  query_analysis: {
    intent: string;
    filters: {
      keywords: string[];
      date_range?: string;
      memo_type?: string;
    };
    action_description: string;
  };
}

// 일정 관련 타입 정의
export interface Schedule {
  id: number;
  title: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  all_day_date?: string; // 종일 일정용 날짜 (YYYY-MM-DD)
  location?: string;
  participants?: string[];
  category: string;
  status: string;
  is_all_day: boolean;
  memo_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateScheduleRequest {
  title: string;
  description?: string;
  start_datetime?: string | null;
  end_datetime?: string | null;
  all_day_date?: string | null;
  location?: string;
  participants?: string[];
  category?: string;
  is_all_day?: boolean;
}

export interface UpdateScheduleRequest {
  title?: string;
  description?: string;
  start_datetime?: string | null;
  end_datetime?: string | null;
  all_day_date?: string | null;
  location?: string;
  participants?: string[];
  category?: string;
  status?: string;
  is_all_day?: boolean;
}

// 할일 관련 타입 정의
export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: string; // 'high', 'medium', 'low'
  category: string; // 'work', 'personal', 'study', 'shopping', 'health'
  tags?: string[];
  estimated_duration?: number;
  status: string; // 'pending', 'in_progress', 'completed'
  is_completed: boolean;
  memo_id?: number;
  created_at: string;
  updated_at?: string;
}

// 파일 관리 관련 타입 정의
export interface AttachmentFileInfo {
  id: number;
  filename: string;
  filetype: string;
  filesize: number;
  created_at: string;
  memo_id: number;
  memo_title: string;
  memo_created_at: string;
  public_url?: string;
}

export interface FileManagementResponse {
  images: AttachmentFileInfo[];
  files: AttachmentFileInfo[];
  total_images: number;
  total_files: number;
  total_size: number;
}

export interface FileStats {
  total_count: number;
  image_count: number;
  file_count: number;
  total_size: number;
  total_size_mb: number;
  filetype_stats: {
    [key: string]: {
      count: number;
      size: number;
    };
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  category?: string;
  tags?: string[];
  estimated_duration?: number;
  status?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  category?: string;
  tags?: string[];
  estimated_duration?: number;
  status?: string;
  is_completed?: boolean;
}

// 휴지통 관련 타입 정의
export interface TrashItem {
  id: number;
  item_type: 'memo' | 'schedule' | 'task' | 'file';
  item_id: number;
  title: string;
  content?: string;
  deleted_at: string;
  expiration_at: string;
  original_data?: any; // 원본 데이터
  created_at?: string;
}

export interface TrashStats {
  total: number;
  memos: number;
  schedules: number;
  tasks: number;
  files: number;
  expiring_soon: number; // 24시간 내 만료
}

// 공유 관련 타입 정의
export interface SharedNote {
  id: number;
  content: string;
  created_at: string;
  is_shared: boolean;
  share_token: string | null;
  view_count?: number;
  title?: string;
  ai_title?: string;
}

export interface ShareToggleResponse {
  success: boolean;
  share_token?: string;
  share_url?: string;
  message: string;
}

// 연결 테스트 함수
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Desktop 백엔드 연결 테스트...');
    const response = await apiClient.get('/health');
    console.log('✅ Desktop 백엔드 연결 성공:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Desktop 백엔드 연결 실패:', error);
    return false;
  }
};

// API 객체 (모바일과 동일한 구조)
export const api = {
  // 헬스 체크
  async healthCheck(): Promise<any> {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // 인증 관련 API
  auth: {
    // Firebase 토큰 검증
    async verifyFirebaseToken(idToken: string): Promise<any> {
      console.log('🌐 Desktop Firebase 토큰 검증 API 요청...');
      const response = await apiClient.post('/api/auth/firebase/verify', {
        id_token: idToken,
      });
      return response.data;
    },

    // 사용자 정보 조회
    async getCurrentUser(): Promise<any> {
      const response = await apiClient.get('/auth/user');
      return response.data;
    },
  },

  // 메모 관련 API  
  memo: {
    // 메모 목록 조회
    async getList(
      searchQuery?: string,
      page: number = 1,
      limit: number = 20,
      category?: string,
    ): Promise<Memo[]> {
      let url = '/api/notes/';
      const params = new URLSearchParams();

      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (searchQuery && searchQuery.trim()) {
        params.append('search_query', searchQuery.trim());
      }

      if (category && category !== 'all') {
        params.append('category', category);
      }

      url += `?${params.toString()}`;
      const response = await apiClient.get(url);
      return response.data;
    },

    // 카테고리 통계 조회
    async getCategoryStats(): Promise<{
      category_stats: { [key: string]: number };
      total_count: number;
    }> {
      const response = await apiClient.get('/api/notes/category-stats');
      return response.data;
    },

    // 메모 상세 조회
    async getById(id: number): Promise<Memo> {
      const response = await apiClient.get(`/api/notes/${id}`);
      return response.data;
    },

    // 메모 생성
    async create(data: CreateMemoRequest): Promise<Memo> {
      const response = await apiClient.post('/api/notes/', data);
      return response.data;
    },

    // 메모 수정
    async update(id: number, data: UpdateMemoRequest): Promise<Memo> {
      const response = await apiClient.put(`/api/notes/${id}`, data);
      return response.data;
    },

    // 메모 삭제
    async delete(id: number): Promise<void> {
      await apiClient.delete(`/api/notes/${id}`);
    },

    // 메모 즐겨찾기 토글
    async toggleFavorite(id: number, isFavorited: boolean): Promise<Memo> {
      const response = await apiClient.patch(
        `/api/notes/${id}/favorite?is_favorited=${isFavorited}`,
      );
      return response.data;
    },

    // AI 질문 처리
    async askAIQuestion(question: string): Promise<AIQuestionResponse> {
      try {
        console.log('🤖 Desktop AI 질문 API 요청', { question_length: question.length });

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          throw new Error('로그인이 필요합니다.');
        }

        const userUid = currentUser.uid;
        console.log('👤 현재 사용자 UID:', userUid.substring(0, 8) + '...');

        const idToken = await authService.getIdToken();
        if (!idToken) {
          throw new Error('Firebase ID 토큰을 가져올 수 없습니다.');
        }

        // Firebase UID를 데이터베이스 사용자 ID로 변환
        const userResponse = await apiClient.post('/api/auth/firebase/verify', {
          id_token: idToken,
        });
        const userId = userResponse.data.id;
        console.log('👤 Desktop 데이터베이스 사용자 ID:', userId);

        const response = await apiClient.post(
          `/api/ai/question?user_id=${userId}`,
          { question: question },
        );

        console.log('✅ Desktop AI 질문 API 응답 성공');
        return response.data;
      } catch (error) {
        console.error('❌ Desktop AI 질문 API 실패:', error);
        throw error;
      }
    },

    // AI 지식 기반 메모 생성
    async generateWithAIKnowledge(request: {
      original_question: string;
      action_description: string;
      detected_language: string;
    }): Promise<any> {
      try {
        console.log('🧠 Desktop AI 지식 기반 메모 생성 API 요청', {
          question_length: request.original_question.length,
          language: request.detected_language,
        });

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          throw new Error('로그인이 필요합니다.');
        }

        const idToken = await authService.getIdToken();
        const response = await apiClient.post(
          '/api/ai/generate-with-knowledge',
          request,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        console.log('✅ Desktop AI 지식 기반 메모 생성 성공');
        return response.data;
      } catch (error: any) {
        console.error('❌ Desktop AI 지식 기반 메모 생성 실패:', error);
        throw error;
      }
    },

    // 기존 메모 기반 AI 메모 생성
    async generateWithExistingMemos(request: {
      original_question: string;
      action_description: string;
      detected_language: string;
      source_memos_count: number;
    }): Promise<any> {
      try {
        console.log('📝 Desktop 기존 메모 기반 AI 메모 생성 API 요청');

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          throw new Error('로그인이 필요합니다.');
        }

        const idToken = await authService.getIdToken();
        const response = await apiClient.post(
          '/api/ai/generate-with-existing-memos',
          request,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        console.log('✅ Desktop 기존 메모 기반 AI 메모 생성 성공');
        return response.data;
      } catch (error: any) {
        console.error('❌ Desktop 기존 메모 기반 AI 메모 생성 실패:', error);
        throw error;
      }
    },

    // 메모 내보내기
    async exportMemos(format: 'json' | 'csv' | 'txt'): Promise<any> {
      const response = await apiClient.get(`/api/notes/export`, {
        params: { format }
      });
      return response.data;
    },



    // 첨부파일 업로드
    async uploadAttachment(formData: FormData): Promise<Attachment> {
      const response = await uploadClient.post('/api/notes/attachments', formData);
      return response.data;
    },

    // 첨부파일 삭제
    async deleteAttachment(attachmentId: number): Promise<void> {
      await apiClient.delete(`/api/notes/attachments/${attachmentId}`);
    },
  },

  // 사용자 관련 API
  user: {
    // 사용자 프로필 조회
    async getProfile(): Promise<any> {
      const response = await apiClient.get('/api/auth/firebase/profile');
      return response.data;
    },

    // 사용자 설정 업데이트
    async updateSettings(settings: any): Promise<any> {
      const response = await apiClient.put('/user/settings', settings);
      return response.data;
    },

    // 보안 상태 조회
    async getSecurityStatus(): Promise<any> {
      const response = await apiClient.get('/security/status');
      return response.data;
    },

    // 보안 정보 목록 조회
    async getSecurityInfos(authToken: string): Promise<any[]> {
      try {
        if (!authToken) {
          throw new Error('보안 토큰이 필요합니다.');
        }

        const response = await apiClient.get('/security/info', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          params: {
            limit: 100,
            page: 1,
            app_language: 'ko', // 데스크톱은 기본 한국어
          },
        });
        return response.data;
      } catch (error) {
        console.error('Desktop 보안 정보 목록 조회 실패:', error);
        throw error;
      }
    },

    // 보안 인증
    async authenticateSecurityPassword(password: string): Promise<{
      success: boolean;
      message?: string;
      token?: string;
    }> {
      try {
        const response = await apiClient.post('/security/auth', { password });

        if (response.data.success) {
          return {
            success: true,
            token: response.data.token,
            message: response.data.message,
          };
        } else {
          return {
            success: false,
            message: response.data.message || '보안 인증에 실패했습니다.',
          };
        }
      } catch (error: any) {
        return {
          success: false,
          message: (error.response && error.response.data && error.response.data.detail) || '보안 인증에 실패했습니다.',
        };
      }
    },

    // 데이터 사용량 조회
    async getStorageUsage(): Promise<any> {
      const response = await apiClient.get('/analytics/storage-usage');
      return response.data.data;
    },

    // 데이터 백업 다운로드
    async downloadDataBackup(): Promise<any> {
      const response = await apiClient.get('/api/notes/export/all');
      return response.data;
    },
  },

  // 일정 관련 API
  schedules: {
    // 일정 목록 조회
    async getList(
      skip: number = 0,
      limit: number = 100,
      category?: string,
      status?: string,
      start_date?: string,
      end_date?: string
    ): Promise<Schedule[]> {
      let url = '/schedules/';
      const params = new URLSearchParams();

      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      if (category) {
        params.append('category', category);
      }
      if (status) {
        params.append('status', status);
      }
      if (start_date) {
        params.append('start_date', start_date);
      }
      if (end_date) {
        params.append('end_date', end_date);
      }

      url += `?${params.toString()}`;
      const response = await apiClient.get(url);
      return response.data;
    },

    // 일정 상세 조회
    async getById(id: number): Promise<Schedule> {
      const response = await apiClient.get(`/schedules/${id}`);
      return response.data;
    },

    // 일정 생성
    async create(data: CreateScheduleRequest): Promise<Schedule> {
      const response = await apiClient.post('/schedules/', data);
      return response.data;
    },

    // 일정 수정
    async update(id: number, data: UpdateScheduleRequest): Promise<Schedule> {
      const response = await apiClient.put(`/schedules/${id}`, data);
      return response.data;
    },

    // 일정 삭제
    async delete(id: number): Promise<void> {
      await apiClient.delete(`/schedules/${id}`);
    },

    // 오늘의 일정 조회
    async getTodaySchedules(date?: string): Promise<Schedule[]> {
      let url = '/schedules/today-schedules';
      if (date) {
        url += `?date=${date}`;
      }
      const response = await apiClient.get(url);
      return response.data;
    },
  },

  // 할일 관련 API
  tasks: {
    // 할일 목록 조회
    async getList(
      skip: number = 0,
      limit: number = 100,
      category?: string,
      priority?: string,
      status?: string,
      show_completed: boolean = false
    ): Promise<Task[]> {
      let url = '/tasks/';
      const params = new URLSearchParams();

      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      if (category) {
        params.append('category', category);
      }
      if (priority) {
        params.append('priority', priority);
      }
      if (status) {
        params.append('status', status);
      }
      params.append('show_completed', show_completed.toString());

      url += `?${params.toString()}`;
      const response = await apiClient.get(url);
      return response.data;
    },

    // 할일 상세 조회
    async getById(id: number): Promise<Task> {
      const response = await apiClient.get(`/tasks/${id}`);
      return response.data;
    },

    // 할일 생성
    async create(data: CreateTaskRequest): Promise<Task> {
      const response = await apiClient.post('/tasks/', data);
      return response.data;
    },

    // 할일 수정
    async update(id: number, data: UpdateTaskRequest): Promise<Task> {
      const response = await apiClient.put(`/tasks/${id}`, data);
      return response.data;
    },

    // 할일 삭제
    async delete(id: number): Promise<void> {
      await apiClient.delete(`/tasks/${id}`);
    },

    // 할일 완료 처리
    async complete(id: number): Promise<Task> {
      const response = await apiClient.patch(`/tasks/${id}/complete`);
      return response.data;
    },

    // 할일 미완료 처리
    async uncomplete(id: number): Promise<Task> {
      const response = await apiClient.patch(`/tasks/${id}/uncomplete`);
      return response.data;
    },

    // 오늘 할일 조회
    async getTodayTasks(): Promise<Task[]> {
      const response = await apiClient.get('/tasks/today');
      return response.data;
    },
  },

  // 분석 API (모바일과 호환)
  analytics: {
    // 개요 통계
    async getOverview(): Promise<{ data: any }> {
      const response = await apiClient.get('/analytics/overview');
      return response.data;
    },

    // 카테고리 분석
    async getCategories(): Promise<{ data: any }> {
      const response = await apiClient.get('/analytics/categories');
      return response.data;
    },

    // 태그 분석
    async getTags(limit: number = 10): Promise<{ data: any }> {
      const response = await apiClient.get(`/analytics/tags?limit=${limit}`);
      return response.data;
    },

    // 감정 분석
    async getSentiment(): Promise<{ data: any }> {
      const response = await apiClient.get('/analytics/sentiment');
      return response.data;
    },

    // 트렌드 분석
    async getTrends(period: 'day' | 'week' | 'month' = 'week'): Promise<{ data: any }> {
      const response = await apiClient.get(`/analytics/trends?period=${period}`);
      return response.data;
    },

    // 활동 분석
    async getActivity(): Promise<{ data: any }> {
      const response = await apiClient.get('/analytics/activity');
      return response.data;
    },

    // 대시보드 통계
    async getDashboardStats(): Promise<any> {
      const response = await apiClient.get('/analytics/dashboard');
      return response.data;
    },

    // 사용량 통계
    async getUsageStats(period: 'day' | 'week' | 'month' = 'week'): Promise<any> {
      const response = await apiClient.get('/analytics/usage', {
        params: { period }
      });
      return response.data;
    },
  },

  // 피드백 API
  feedback: {
    // 피드백 제출
    async submit(data: {
      title: string;
      description: string;
      category: string;
      priority: string;
      is_anonymous?: boolean;
      page_url?: string;
    }): Promise<FeedbackResponse> {
      const response = await apiClient.post('/api/feedback', {
        ...data,
        page_url: data.page_url || 'desktop_app'
      });
      return response.data;
    },

    // 내 피드백 목록 조회
    async getMyFeedbacks(
      skip: number = 0,
      limit: number = 20,
      status?: string,
      category?: string
    ): Promise<FeedbackListResponse> {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString()
      });
      
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      
      const response = await apiClient.get(`/api/feedback/my?${params}`);
      return response.data;
    },

    // 특정 피드백 조회
    async getById(feedbackId: number): Promise<FeedbackResponse> {
      const response = await apiClient.get(`/api/feedback/${feedbackId}`);
      return response.data;
    },
  },

  // AI 질문 히스토리 API
  async getAIQuestionHistory(
    limit: number = 50,
    offset: number = 0,
    questionType?: string,
  ): Promise<{
    history: Array<{
      id: number;
      question: string;
      question_type: string;
      result_count?: number;
      generated_memo_id?: number;
      search_result_memo_ids?: number[];
      intent?: string;
      created_at: string;
      response_data: any;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const token = await authService.getIdToken();
      if (!token) {
        throw new Error('Firebase 토큰이 없습니다');
      }

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (questionType) {
        params.append('question_type', questionType);
      }

      const response = await apiClient.get(`/api/ai/question-history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Desktop AI 질문 히스토리 조회 실패:', error);
      throw error;
    }
  },

  // AI 질문 히스토리 개별 삭제
  async deleteAIQuestionHistory(historyId: number): Promise<{ message: string; deleted_id: number }> {
    try {
      const token = await authService.getIdToken();
      if (!token) {
        throw new Error('Firebase 토큰이 없습니다');
      }

      const response = await apiClient.delete(`/api/ai/question-history/${historyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Desktop AI 질문 히스토리 삭제 실패:', error);
      throw error;
    }
  },

  // AI 질문 히스토리 전체 삭제
  async clearAIQuestionHistory(): Promise<{ message: string; deleted_count: number }> {
    try {
      const token = await authService.getIdToken();
      if (!token) {
        throw new Error('Firebase 토큰이 없습니다');
      }

      const response = await apiClient.delete('/api/ai/question-history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Desktop AI 질문 히스토리 전체 삭제 실패:', error);
      throw error;
    }
  },

  // 휴지통 관련 API
  trash: {
    // 휴지통 항목 목록 조회
    async getList(
      item_type?: 'memo' | 'schedule' | 'task' | 'file',
      skip: number = 0,
      limit: number = 100
    ): Promise<TrashItem[]> {
      console.log('🗑️ 휴지통 목록 조회 API 요청...');

      try {
        // 현재는 메모만 지원되므로 메모 휴지통 API 사용
        const response = await apiClient.get('/api/notes/trash');

        // 백엔드 Memo 형식을 TrashItem 형식으로 변환
        const memos = response.data;
        const trashItems: TrashItem[] = memos.map((memo: any) => ({
          id: memo.id,
          item_type: 'memo' as const,
          item_id: memo.id,
          title: memo.title || '제목 없음',
          content: memo.content || memo.content_text,
          deleted_at: memo.deleted_at,
          expiration_at: memo.deleted_at ?
            new Date(new Date(memo.deleted_at).getTime() + 24 * 60 * 60 * 1000).toISOString() :
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: memo.created_at
        }));

        // item_type 필터링
        if (item_type && item_type !== 'memo') {
          return []; // 현재는 메모만 지원
        }

        return trashItems;
      } catch (error: any) {
        // 백엔드 API가 아직 구현되지 않은 경우 목 데이터 반환
        if (error.response?.status === 404) {
          console.log('⚠️ 휴지통 API가 아직 구현되지 않음 - 목 데이터 사용');
          return this.getMockTrashItems(item_type);
        }
        throw error;
      }
    },

    // 휴지통 통계 조회
    async getStats(): Promise<TrashStats> {
      console.log('📊 휴지통 통계 조회 API 요청...');

      try {
        // 실제 휴지통 데이터를 가져와서 통계 계산
        const trashItems = await this.getList();
        const now = new Date();
        const expiringCount = trashItems.filter(item => {
          const expirationDate = new Date(item.expiration_at);
          const timeDiff = expirationDate.getTime() - now.getTime();
          return timeDiff <= 6 * 60 * 60 * 1000; // 6시간 이내
        }).length;

        return {
          total: trashItems.length,
          memos: trashItems.filter(item => item.item_type === 'memo').length,
          schedules: trashItems.filter(item => item.item_type === 'schedule').length,
          tasks: trashItems.filter(item => item.item_type === 'task').length,
          files: trashItems.filter(item => item.item_type === 'file').length,
          expiring_soon: expiringCount
        };
      } catch (error: any) {
        // 백엔드 API가 아직 구현되지 않은 경우 목 데이터 반환
        console.log('⚠️ 휴지통 통계 계산 중 오류 발생 - 목 데이터 사용');
        return {
          total: 0,
          memos: 0,
          schedules: 0,
          tasks: 0,
          files: 0,
          expiring_soon: 0
        };
      }
    },

    // 목 데이터 생성
    getMockTrashItems(item_type?: string): TrashItem[] {
      const now = new Date();
      const mockItems: TrashItem[] = [
        {
          id: 1,
          item_type: 'memo',
          item_id: 101,
          title: '삭제된 메모 1',
          content: '이것은 삭제된 메모의 내용입니다...',
          deleted_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3시간 전
          expiration_at: new Date(now.getTime() + 21 * 60 * 60 * 1000).toISOString(), // 21시간 후
        },
        {
          id: 2,
          item_type: 'schedule',
          item_id: 201,
          title: '취소된 회의',
          content: '프로젝트 회의 - 오후 2시',
          deleted_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12시간 전
          expiration_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12시간 후
        },
        {
          id: 3,
          item_type: 'task',
          item_id: 301,
          title: '완료된 할일',
          content: '문서 검토 작업',
          deleted_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
          expiration_at: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(), // 22시간 후
        },
        {
          id: 4,
          item_type: 'file',
          item_id: 401,
          title: 'document.pdf',
          content: '파일 첨부',
          deleted_at: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(), // 20시간 전
          expiration_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4시간 후 - 긴급
        },
        {
          id: 5,
          item_type: 'memo',
          item_id: 102,
          title: '오래된 메모',
          content: '곧 만료될 메모입니다.',
          deleted_at: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(), // 23시간 전
          expiration_at: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(), // 1시간 후 - 매우 긴급
        }
      ];

      // 타입 필터링
      if (item_type) {
        return mockItems.filter(item => item.item_type === item_type);
      }

      return mockItems;
    },

    // 항목 복원
    async restore(trashItemId: number): Promise<any> {
      console.log('♻️ 항목 복원 API 요청:', trashItemId);
      try {
        // 실제 백엔드 복원 API 사용 (메모 전용)
        const response = await apiClient.put(`/api/notes/${trashItemId}/restore`);
        return response.data;
      } catch (error: any) {
        console.error('복원 API 에러:', error);
        throw error;
      }
    },

    // 개별 항목 영구 삭제
    async permanentDelete(trashItemId: number): Promise<any> {
      console.log('🔥 개별 항목 영구 삭제 API 요청:', trashItemId);
      try {
        // 실제 백엔드 영구삭제 API 사용 (메모 전용)
        const response = await apiClient.delete(`/api/notes/${trashItemId}?permanent=true`);
        return { success: true, message: '항목이 영구 삭제되었습니다.' };
      } catch (error: any) {
        console.error('영구 삭제 API 에러:', error);
        throw error;
      }
    },

    // 휴지통 비우기 (전체 삭제)
    async emptyTrash(): Promise<{ deleted_count: number }> {
      console.log('🗑️ 휴지통 전체 비우기 API 요청...');
      try {
        // 실제 백엔드 휴지통 비우기 API 사용
        const trashItems = await this.getList(); // 현재 항목 수 확인
        const itemCount = trashItems.length;

        await apiClient.delete('/api/notes/trash/empty');
        return { deleted_count: itemCount };
      } catch (error: any) {
        console.error('휴지통 비우기 API 에러:', error);
        throw error;
      }
    },

    // 만료된 항목 자동 정리
    async cleanup(): Promise<{ cleaned_count: number }> {
      console.log('🧹 만료된 항목 자동 정리 API 요청...');
      try {
        // 실제 백엔드 자동 정리 API 사용
        const response = await apiClient.post('/api/notes/trash/cleanup');
        return response.data;
      } catch (error: any) {
        console.error('자동 정리 API 에러:', error);
        throw error;
      }
    },

    // 특정 타입의 항목을 휴지통으로 이동
    async moveToTrash(item_type: 'memo' | 'schedule' | 'task', item_id: number): Promise<any> {
      console.log(`🗑️ ${item_type} ${item_id}를 휴지통으로 이동 API 요청...`);
      try {
        if (item_type === 'memo') {
          // 메모를 휴지통으로 이동 (soft delete)
          await apiClient.delete(`/api/notes/${item_id}?permanent=false`);
          return { success: true, message: '메모가 휴지통으로 이동되었습니다.' };
        } else {
          console.log(`⚠️ ${item_type} 타입의 휴지통 이동은 아직 지원되지 않음`);
          return { success: false, message: '아직 지원되지 않는 항목 타입입니다.' };
        }
      } catch (error: any) {
        console.error('휴지통 이동 API 에러:', error);
        throw error;
      }
    },
  },

  // 파일 관리 API
  files: {
    // 파일 목록 조회
    async getAttachments(sortBy: string = 'created_at', sortOrder: string = 'desc'): Promise<FileManagementResponse> {
      const response = await apiClient.get('/api/files/attachments', {
        params: { sort_by: sortBy, sort_order: sortOrder }
      });
      return response.data;
    },

    // 파일 통계 조회
    async getStats(): Promise<FileStats> {
      const response = await apiClient.get('/api/files/attachments/stats');
      return response.data;
    },

    // 파일 삭제
    async deleteAttachment(attachmentId: number): Promise<{ message: string; attachment_id: number }> {
      const response = await apiClient.delete(`/api/files/attachments/${attachmentId}`);
      return response.data;
    },
  },

  // 공유 관련 API
  shared: {
    // 공유된 메모 목록 조회
    async getSharedNotes(): Promise<SharedNote[]> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const response = await apiClient.get('/api/users/shares', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error('Desktop 공유 메모 목록 조회 실패:', error);
        throw error;
      }
    },

    // 메모 공유 토글
    async toggleShare(noteId: number, isShared: boolean): Promise<ShareToggleResponse> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const response = await apiClient.patch(
          `/api/notes/${noteId}/share?is_shared=${isShared}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error('Desktop 메모 공유 토글 실패:', error);
        throw error;
      }
    },

    // 공유 메모 조회 (토큰으로)
    async getSharedNote(token: string): Promise<any> {
      try {
        const response = await apiClient.get(`/api/shared/${token}`);
        return response.data;
      } catch (error) {
        console.error('Desktop 공유 메모 조회 실패:', error);
        throw error;
      }
    },
  },

  // 링크 관련 API
  links: {
    // 링크 목록 조회
    async getList(search?: string): Promise<any> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await apiClient.get(`/api/links/${searchParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error('Desktop 링크 목록 조회 실패:', error);
        throw error;
      }
    },

    // 링크 상세 조회
    async getById(linkId: number): Promise<any> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const response = await apiClient.get(`/api/links/${linkId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error('Desktop 링크 상세 조회 실패:', error);
        throw error;
      }
    },

    // 링크 통계 조회
    async getStats(): Promise<any> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const response = await apiClient.get('/api/links/stats/count', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error('Desktop 링크 통계 조회 실패:', error);
        throw error;
      }
    },

    // 링크 일괄 삭제
    async deleteMultiple(linkIds: number[]): Promise<any> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const response = await apiClient.post('/api/links/delete-multiple', 
          { link_ids: linkIds },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error('Desktop 링크 일괄 삭제 실패:', error);
        throw error;
      }
    },

    // 링크 삭제
    async delete(linkId: number): Promise<any> {
      try {
        const token = await authService.getIdToken();
        if (!token) {
          throw new Error('Firebase 토큰이 없습니다');
        }

        const response = await apiClient.delete(`/api/links/${linkId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error('Desktop 링크 삭제 실패:', error);
        throw error;
      }
    },
  },
};

// 네트워크 상태 확인
export const checkNetworkStatus = async (): Promise<{
  isConnected: boolean;
  latency?: number;
}> => {
  try {
    const startTime = Date.now();
    const response = await apiClient.get('/health', { timeout: 5000 });
    const latency = Date.now() - startTime;

    return {
      isConnected: response.status === 200,
      latency: latency,
    };
  } catch (error) {
    console.error('Desktop Network status check failed:', error);
    return {
      isConnected: false,
    };
  }
};

export default api;