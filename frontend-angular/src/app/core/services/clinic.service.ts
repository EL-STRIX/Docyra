import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly baseUrl = 'http://localhost:5000/api/v1/clinic-admin';

  constructor(private http: HttpClient) {}

  public getClinicDoctors(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/doctors`);
  }

  public addClinicDoctor(doctorData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/doctors`, doctorData);
  }

  public getClinicAppointments(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/appointments`, { params });
  }

  public getClinicDetails(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/profile`);
  }

  public updateClinicDetails(data: any): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/profile`, data);
  }
}
