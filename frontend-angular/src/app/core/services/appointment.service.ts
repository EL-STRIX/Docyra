import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Appointment, AppointmentStatus, AppointmentSlot } from '../models/appointment.model';
import { ApiResponse, PaginationParams } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiBaseUrl}/appointments`;

  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$: Observable<Appointment[]> = this.appointmentsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  getDoctorAppointments(doctorId: string, params?: PaginationParams): Observable<ApiResponse<Appointment[]>> {
    this.loadingSubject.next(true);
    let httpParams = new HttpParams().set('doctorId', doctorId);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      });
    }

    return this.http.get<ApiResponse<Appointment[]>>(this.API_URL, { params: httpParams, withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointmentsSubject.next(res.data);
        }
        this.loadingSubject.next(false);
      })
    );
  }

  getClinicAppointments(clinicId?: string, params?: PaginationParams): Observable<ApiResponse<Appointment[]>> {
    this.loadingSubject.next(true);
    let httpParams = new HttpParams();
    if (clinicId) httpParams = httpParams.set('clinicId', clinicId);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      });
    }

    return this.http.get<ApiResponse<Appointment[]>>(`${this.API_URL}/clinic`, { params: httpParams, withCredentials: true }).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointmentsSubject.next(res.data);
        }
        this.loadingSubject.next(false);
      })
    );
  }

  getAppointmentById(id: string): Observable<ApiResponse<Appointment>> {
    return this.http.get<ApiResponse<Appointment>>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(
      `${this.API_URL}/${id}/status`,
      { status, notes },
      { withCredentials: true }
    ).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const current = this.appointmentsSubject.value;
          this.appointmentsSubject.next(
            current.map((apt) => (apt._id === id ? res.data : apt))
          );
        }
      })
    );
  }

  cancelAppointment(id: string, reason: string): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(
      `${this.API_URL}/${id}/cancel`,
      { reason },
      { withCredentials: true }
    ).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const current = this.appointmentsSubject.value;
          this.appointmentsSubject.next(
            current.map((apt) => (apt._id === id ? res.data : apt))
          );
        }
      })
    );
  }

  getSlots(doctorId: string, startDate: string, endDate: string): Observable<ApiResponse<AppointmentSlot[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ApiResponse<AppointmentSlot[]>>(
      `${environment.apiBaseUrl}/doctors/${doctorId}/slots`,
      { params, withCredentials: true }
    );
  }
}
