import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private readonly baseUrl = 'http://localhost:5000/api/v1/doctors';
  private readonly aptUrl = 'http://localhost:5000/api/v1/appointments';

  constructor(private http: HttpClient) {}

  public getDoctorProfile(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  public updateAvailability(doctorId: string, weeklySchedule: any[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${doctorId}/availability`, { weeklySchedule });
  }

  public getSchedule(params?: any): Observable<any> {
    return this.http.get<any>(`${this.aptUrl}/doctor`, { params });
  }

  public updateAppointmentStatus(appointmentId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch<any>(`${this.aptUrl}/${appointmentId}/status`, { status, notes });
  }

  public triggerEmergencyUnavailable(doctorId: string, reason: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${doctorId}/emergency-unavailable`, { reason });
  }
}
