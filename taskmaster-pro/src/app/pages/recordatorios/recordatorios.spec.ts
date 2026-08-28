import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Recordatorios } from './recordatorios';

describe('Recordatorios', () => {
  let component: Recordatorios;
  let fixture: ComponentFixture<Recordatorios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recordatorios],
    }).compileComponents();

    fixture = TestBed.createComponent(Recordatorios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
