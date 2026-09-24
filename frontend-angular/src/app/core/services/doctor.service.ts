import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Doctor, DaySchedule } from '../models/doctor.model';
import { ApiResponse } from '../models/api-response.model';
import { Appointment } from '../models/appointment.model';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiBaseUrl}/doctors`;

  private currentDoctorSubject = new BehaviorSubject<Doctor | null>(null);
  public currentDoctor$: Observable<Doctor | null> = this.currentDoctorSubject.asObservable();

  getDoctorProfile(doctorId: string): Observable<ApiResponse<Doctor>> {
    return this.http.get<ApiResponse<Doctor>>(`${this.API_URL}/${doctorId}`, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.currentDoctorSubject.next(res.data);
        }
      })
    );
  }

  getMyDoctorProfile(): Observable<ApiResponse<Doctor>> {
    return this.http.get<ApiResponse<Doctor>>(`${this.API_URL}/me`, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.currentDoctorSubject.next(res.data);
        }
      })
    );
  }

  updateDoctorProfile(doctorId: string, profileData: Partial<Doctor>): Observable<ApiResponse<Doctor>> {
    return this.http.put<ApiResponse<Doctor>>(`${this.API_URL}/${doctorId}`, profileData, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.currentDoctorSubject.next(res.data);
        }
      })
    );
  }

  getDoctorAvailability(doctorId: string): Observable<ApiResponse<{ weeklySchedule: DaySchedule[]; slotDurationMinutes: number }>> {
    return this.http.get<ApiResponse<{ weeklySchedule: DaySchedule[]; slotDurationMinutes: number }>>(
      `${this.API_URL}/${doctorId}/availability`,
      { withCredentials: true }
    );
  }

  updateDoctorAvailability(doctorId: string, weeklySchedule: DaySchedule[], slotDurationMinutes?: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/${doctorId}/availability`,
      { weeklySchedule, slotDurationMinutes },
      { withCredentials: true }
    );
  }

  setEmergencyUnavailable(doctorId: string, date: string, reason?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/${doctorId}/emergency-unavailable`,
      { date, reason },
      { withCredentials: true }
    );
  }

  getPatientHistory(doctorId: string, patientId: string): Observable<ApiResponse<{ patient: any; appointments: Appointment[] }>> {
    return this.http.get<ApiResponse<{ patient: any; appointments: Appointment[] }>>(
      `${this.API_URL}/${doctorId}/patients/${patientId}/history`,
      { withCredentials: true }
    );
  }
}
