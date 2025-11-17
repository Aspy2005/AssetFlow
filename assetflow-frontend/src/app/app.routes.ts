
import { Routes } from '@angular/router';

import { ActivoPageComponent } from './activos/pages/activo-page/activo-page.component'; 
import { CategoriaPageComponent } from './activos/pages/categoria-page/categoria-page';

export const routes: Routes = [
    
    {
        path: 'activos',
        component: ActivoPageComponent 
    },
    
    {
        path: 'categorias',
        component: CategoriaPageComponent 
    },
    
    {
        path: '',
        redirectTo: 'activos',
        pathMatch: 'full' 
    },


];