// src/app/app.routes.ts

import { Routes } from '@angular/router';

// 1. Importar los componentes de las páginas de gestión
import { ActivoPageComponent } from './activos/pages/activo-page/activo-page.component'; 
import { CategoriaPageComponent } from './activos/pages/categoria-page/categoria-page';

export const routes: Routes = [
    
    // 2. Ruta principal para la gestión de activos
    {
        path: 'activos',
        component: ActivoPageComponent 
    },
    
    // 3. Ruta para la gestión de categorías
    {
        path: 'categorias',
        component: CategoriaPageComponent // <-- Apunta al nuevo componente
    },
    
    // 4. Ruta de redirección: Si el usuario va a '/', redirigir a '/activos'
    {
        path: '',
        redirectTo: 'activos',
        pathMatch: 'full' // Necesario para la redirección exacta
    },

    // Opcional: Ruta 404 para URLs no encontradas
    // {
    //     path: '**',
    //     component: NotFoundComponent 
    // }
];