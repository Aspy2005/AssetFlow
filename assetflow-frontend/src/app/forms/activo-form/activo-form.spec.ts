import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivoForm } from './activo-form';

describe('ActivoForm', () => {
  let component: ActivoForm;
  let fixture: ComponentFixture<ActivoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivoForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivoForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
