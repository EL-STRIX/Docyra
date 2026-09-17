import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly baseUrl = 'http://localhost:5000/api/v1/admin';

  constructor(private http: HttpClient) {}

  // Clinics
  public getClinics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/clinics`);
  }

  public createClinic(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/clinics`, data);
  }

  public updateClinicStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/clinics/${id}`, { isActive });
  }

  // Doctor Applications
  public getDoctorApplications(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/doctors/applications`);
  }

  public approveDoctor(id: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/doctors/${id}/approve`, {});
  }

  public rejectDoctor(id: string, reason: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/doctors/${id}/reject`, { reason });
  }

  // Specializations
  public getSpecializations(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/specializations`);
  }

  public createSpecialization(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/specializations`, data);
  }

  public updateSpecialization(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/specializations/${id}`, data);
  }

  // Patients
  public getPatients(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients`, { params });
  }

  // Audit Logs
  public getAuditLogs(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/audit-logs`, { params });
  }

  // Analytics & Reports
  public getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/analytics`);
  }

  // System Settings
  public getSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/settings`);
  }

  public updateSettings(data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/settings`, data);
  }
}
