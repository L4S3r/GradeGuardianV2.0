// ── GRADEGUARDIAN API SERVICE ───────────────────────────────────────────────

export interface Professor {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  email: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  courseName: string;
  courseCode: string;
  grade: number;
  originalGrade?: number;
  originalLetterGrade?: string;
  letterGrade: string;
  recordedAt: string;
  hash: string;
  isVerified?: boolean;
  verificationError?: string | null;
}

export interface AuditLog {
  id?: number;
  action: string;
  status: string;
  checkedAt: string;
  details?: string;
}

export interface CourseStat {
  code: string;
  name: string;
  average: number;
  students: number;
  min?: number;
  max?: number;
  median?: number;
  passRate?: number;
}


export interface ProfessorStats {
  totalGrades: number;
  overallAverage: number;
  courseStats: CourseStat[];
  gradeDistribution: { [key: string]: number };
}

export interface CourseModel {
  course_code: string;
  course_name: string;
}

export class ApiService {
  private baseUrl: string = '';
  private token: string | null = null;

  constructor(baseUrl: string, token: string | null = null) {
    this.setBaseUrl(baseUrl);
    this.token = token;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = this.normalizeUrl(url);
  }

  private normalizeUrl(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  public async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
    };

    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    console.log(`[ApiService] calling ${endpoint}`, {
      method: options.method || 'GET',
      hasToken: !!this.token,
      headers: { ...headers, Authorization: this.token ? `Bearer ${this.token.substring(0, 10)}...` : 'none' }
    });

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = 'An error occurred';
      try {
        const parsed = JSON.parse(errorText);
        message = parsed.detail || message;
      } catch (_) {
        message = errorText || message;
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  public async login(email: string, password: string): Promise<{ professor: Professor; access_token: string; token?: string }> {
    return this.apiCall<{ professor: Professor; access_token: string; token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  public async register(payload: {
    name: string;
    employee_id: string;
    department: string;
    email: string;
    password: string;
    faculty_secret_key: string;
  }): Promise<{ professor: Professor; access_token: string; token?: string }> {
    return this.apiCall<{ professor: Professor; access_token: string; token?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ── Grades ────────────────────────────────────────────────────────────────
  public async fetchGrades(): Promise<any[]> {
    return this.apiCall<any[]>('/grades');
  }

  public async submitGrade(payload: {
    student_id: string;
    course_code: string;
    course_name: string;
    grade: number;
    letter_grade: string;
  }): Promise<any> {
    return this.apiCall<any>('/grades', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async submitBatchGrades(grades: Array<{
    student_id: string;
    course_code: string;
    course_name: string;
    grade: number;
    letter_grade: string;
  }>): Promise<any[]> {
    return this.apiCall<any[]>('/grades/batch', {
      method: 'POST',
      body: JSON.stringify({ grades })
    });
  }

  public async parsePdf(fileData: string): Promise<{ course_name: string | null; students: Array<{ student_id: string; student_name: string; grade: number }> }> {
    return this.apiCall<{ course_name: string | null; students: Array<{ student_id: string; student_name: string; grade: number }> }>('/grades/parse-pdf', {
      method: 'POST',
      body: JSON.stringify({ fileData })
    });
  }

  public async updateGrade(gradeId: string, grade: number, letterGrade: string): Promise<any> {
    return this.apiCall<any>(`/grades/${gradeId}`, {
      method: 'PUT',
      body: JSON.stringify({ grade, letter_grade: letterGrade })
    });
  }

  public async verifyBatch(gradeIds: string[]): Promise<any[]> {
    const data = await this.apiCall<any>('/verify/batch', {
      method: 'POST',
      body: JSON.stringify({ grade_ids: gradeIds })
    });
    return Array.isArray(data) ? data : (data?.results || []);
  }

  public async repairGrade(gradeId: string): Promise<any> {
    return this.apiCall<any>(`/repair/${gradeId}`, {
      method: 'POST'
    });
  }

  public async fetchGradeLogs(gradeId: string): Promise<{ logs: any[] }> {
    return this.apiCall<{ logs: any[] }>(`/grades/${gradeId}/logs`);
  }

  public async fetchGlobalAuditLogs(): Promise<any[]> {
    const data = await this.apiCall<any>('/audit-logs');
    return Array.isArray(data) ? data : (data?.logs || []);
  }

  // ── Statistics & Courses ──────────────────────────────────────────────────
  public async fetchStatsSummary(): Promise<any> {
    return this.apiCall<any>('/statistics/summary');
  }

  public async fetchCourses(): Promise<CourseModel[]> {
    return this.apiCall<CourseModel[]>('/courses');
  }
}
