import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Clinic } from '../models/clinic.model';
import { Doctor } from '../models/doctor.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class ClinicService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiBaseUrl}/clinics`;

  private currentClinicSubject = new BehaviorSubject<Clinic | null>(null);
  public currentClinic$: Observable<Clinic | null> = this.currentClinicSubject.asObservable();

  private clinicDoctorsSubject = new BehaviorSubject<Doctor[]>([]);
  public clinicDoctors$: Observable<Doctor[]> = this.clinicDoctorsSubject.asObservable();

  getClinicProfile(clinicId: string): Observable<ApiResponse<Clinic>> {
    return this.http.get<ApiResponse<Clinic>>(`${this.API_URL}/${clinicId}`, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.currentClinicSubject.next(res.data);
        }
      })
    );
  }

  getMyClinicProfile(): Observable<ApiResponse<Clinic>> {
    return this.http.get<ApiResponse<Clinic>>(`${this.API_URL}/me`, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.currentClinicSubject.next(res.data);
        }
      })
    );
  }

  updateClinicProfile(clinicId: string, clinicData: Partial<Clinic>): Observable<ApiResponse<Clinic>> {
    return this.http.put<ApiResponse<Clinic>>(`${this.API_URL}/${clinicId}`, clinicData, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.currentClinicSubject.next(res.data);
        }
      })
    );
  }

  getClinicDoctors(clinicId: string): Observable<ApiResponse<Doctor[]>> {
    return this.http.get<ApiResponse<Doctor[]>>(`${this.API_URL}/${clinicId}/doctors`, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.clinicDoctorsSubject.next(res.data);
        }
      })
    );
  }

  createDoctor(clinicId: string, doctorPayload: any): Observable<ApiResponse<Doctor>> {
    return this.http.post<ApiResponse<Doctor>>(`${this.API_URL}/${clinicId}/doctors`, doctorPayload, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.clinicDoctorsSubject.next([...this.clinicDoctorsSubject.value, res.data]);
        }
      })
    );
  }

  updateDoctorStatus(doctorId: string, status: 'active' | 'suspended'): Observable<ApiResponse<Doctor>> {
    return this.http.patch<ApiResponse<Doctor>>(`${environment.apiBaseUrl}/doctors/${doctorId}/status`, { status }, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const updated = this.clinicDoctorsSubject.value.map((d) => (d._id === doctorId ? res.data : d));
          this.clinicDoctorsSubject.next(updated);
        }
      })
    );
  }
}
