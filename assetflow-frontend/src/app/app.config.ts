// src/app/app.config.ts

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router'; // Importar el proveedor de rutas
import { provideHttpClient } from '@angular/common/http'; // Importar el proveedor HTTP
import { routes } from './app.routes'; // Importar las rutas que acabamos de definir

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Proveer el módulo de enrutamiento con nuestras rutas
    provideRouter(routes), 
    
    // 2. Proveer el cliente HTTP (esencial para el ActivoService)
    provideHttpClient() 
  ]
};