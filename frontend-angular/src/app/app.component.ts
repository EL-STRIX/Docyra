import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    timestamp: string;
    version: string;
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Docyra Portal';
  apiStatus: string = 'Checking...';
  apiVersion: string = '—';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<HealthResponse>('http://localhost:5000/api/v1/health').subscribe({
      next: (res) => {
        if (res.success) {
          this.apiStatus = res.data.status === 'healthy' ? 'Online (v' + res.data.version + ')' : 'Standby';
          this.apiVersion = res.data.version;
        }
      },
      error: () => {
        this.apiStatus = 'Disconnected';
      }
    });
  }
}
