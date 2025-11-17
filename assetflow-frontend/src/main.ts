import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app'; // <-- CORREGIDO

import 'zone.js';


bootstrapApplication(AppComponent, appConfig) // Asegúrate de usar AppComponent aquí también
  .catch((err) => console.error(err));