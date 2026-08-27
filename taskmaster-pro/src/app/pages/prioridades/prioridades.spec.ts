import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Prioridades } from './prioridades';

describe('Prioridades', () => {
  let component: Prioridades;
  let fixture: ComponentFixture<Prioridades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prioridades],
    }).compileComponents();

    fixture = TestBed.createComponent(Prioridades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
