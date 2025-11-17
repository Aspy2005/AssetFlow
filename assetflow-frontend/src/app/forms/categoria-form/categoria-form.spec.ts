import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriaForm } from './categoria-form';

describe('CategoriaForm', () => {
  let component: CategoriaForm;
  let fixture: ComponentFixture<CategoriaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoriaForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
