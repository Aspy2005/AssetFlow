// src/app/app.component.ts

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // <-- Importar RouterOutlet

@Component({
  selector: 'app-root',
  standalone: true,
  // 1. Importar RouterOutlet para que sepa dónde cargar el componente ActivoPageComponent
  imports: [RouterOutlet], 
  template: `
        <router-outlet></router-outlet> 
  `,
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'assetflow-frontend';
}