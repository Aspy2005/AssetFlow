// Importamos la clase ActivoService desde la ruta correcta
import { ActivoService } from "./activo";
import { TestBed } from '@angular/core/testing';

// Usamos el nombre correcto de la clase: ActivoService
describe('ActivoService', () => { 
  // La variable del servicio debe ser tipada con ActivoService
  let service: ActivoService; 

  beforeEach(() => {
    TestBed.configureTestingModule({
      // Aquí también deberías importar HttpClientTestingModule si ActivoService usa HttpClient
      // imports: [HttpClientTestingModule] 
    });
    // Inyectamos el servicio
    service = TestBed.inject(ActivoService); 
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});