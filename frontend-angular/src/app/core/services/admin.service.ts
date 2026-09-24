import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Clinic } from '../models/clinic.model';
import { DoctorApplication } from '../models/doctor.model';
import { Specialization } from '../models/specialization.model';
import { User } from '../models/user.model';
import { AuditLogEntry } from '../models/audit-log.model';
import { AnalyticsSummary, SystemSettings } from '../models/analytics.model';
import { ApiResponse, PaginationParams } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiBaseUrl}/admin`;

  // Clinics Management
  getClinics(params?: PaginationParams): Observable<ApiResponse<Clinic[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      });
    }
    return this.http.get<ApiResponse<Clinic[]>>(`${environment.apiBaseUrl}/clinics`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  createClinic(clinicData: Partial<Clinic>): Observable<ApiResponse<Clinic>> {
    return this.http.post<ApiResponse<Clinic>>(`${environment.apiBaseUrl}/clinics`, clinicData, {
      withCredentials: true,
    });
  }

  updateClinic(id: string, clinicData: Partial<Clinic>): Observable<ApiResponse<Clinic>> {
    return this.http.put<ApiResponse<Clinic>>(`${environment.apiBaseUrl}/clinics/${id}`, clinicData, {
      withCredentials: true,
    });
  }

  updateClinicStatus(id: string, status: string): Observable<ApiResponse<Clinic>> {
    return this.http.patch<ApiResponse<Clinic>>(
      `${environment.apiBaseUrl}/clinics/${id}/status`,
      { status },
      { withCredentials: true }
    );
  }

  // Doctor Applications Management
  getDoctorApplications(params?: PaginationParams): Observable<ApiResponse<DoctorApplication[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      });
    }
    return this.http.get<ApiResponse<DoctorApplication[]>>(
      `${environment.apiBaseUrl}/doctors/applications`,
      { params: httpParams, withCredentials: true }
    );
  }

  reviewDoctorApplication(
    applicationId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Observable<ApiResponse<DoctorApplication>> {
    return this.http.post<ApiResponse<DoctorApplication>>(
      `${environment.apiBaseUrl}/doctors/applications/${applicationId}/review`,
      { status, rejectionReason },
      { withCredentials: true }
    );
  }

  // Specializations Management
  getSpecializations(): Observable<ApiResponse<Specialization[]>> {
    return this.http.get<ApiResponse<Specialization[]>>(`${environment.apiBaseUrl}/specializations`, {
      withCredentials: true,
    });
  }

  createSpecialization(specData: Partial<Specialization>): Observable<ApiResponse<Specialization>> {
    return this.http.post<ApiResponse<Specialization>>(
      `${environment.apiBaseUrl}/specializations`,
      specData,
      { withCredentials: true }
    );
  }

  updateSpecialization(id: string, specData: Partial<Specialization>): Observable<ApiResponse<Specialization>> {
    return this.http.put<ApiResponse<Specialization>>(
      `${environment.apiBaseUrl}/specializations/${id}`,
      specData,
      { withCredentials: true }
    );
  }

  deleteSpecialization(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${environment.apiBaseUrl}/specializations/${id}`,
      { withCredentials: true }
    );
  }

  // Patients Management
  getPatients(params?: PaginationParams): Observable<ApiResponse<User[]>> {
    let httpParams = new HttpParams().set('role', 'patient');
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      });
    }
    return this.http.get<ApiResponse<User[]>>(`${environment.apiBaseUrl}/users`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  updateUserStatus(userId: string, status: 'active' | 'suspended'): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${environment.apiBaseUrl}/users/${userId}/status`,
      { status },
      { withCredentials: true }
    );
  }

  // Audit Logs
  getAuditLogs(params?: PaginationParams): Observable<ApiResponse<AuditLogEntry[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      });
    }
    return this.http.get<ApiResponse<AuditLogEntry[]>>(`${this.API_URL}/audit-logs`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  // Analytics
  getAnalytics(params?: { startDate?: string; endDate?: string; clinicId?: string }): Observable<ApiResponse<AnalyticsSummary>> {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.clinicId) httpParams = httpParams.set('clinicId', params.clinicId);

    return this.http.get<ApiResponse<AnalyticsSummary>>(`${this.API_URL}/analytics`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  // System Settings
  getSystemSettings(): Observable<ApiResponse<SystemSettings>> {
    return this.http.get<ApiResponse<SystemSettings>>(`${this.API_URL}/settings`, {
      withCredentials: true,
    });
  }

  updateSystemSettings(settings: Partial<SystemSettings>): Observable<ApiResponse<SystemSettings>> {
    return this.http.put<ApiResponse<SystemSettings>>(`${this.API_URL}/settings`, settings, {
      withCredentials: true,
    });
  }
}
