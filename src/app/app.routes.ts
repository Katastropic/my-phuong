import { Routes } from '@angular/router';
import { SALON } from './salon.config';

export const routes: Routes = [
  { path: '', title: SALON.name, loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  {
    path: 'book',
    title: `Book an appointment · ${SALON.name}`,
    loadComponent: () => import('./pages/book/book').then((m) => m.Book),
  },
  {
    path: 'booking/:id',
    title: `Your booking · ${SALON.name}`,
    loadComponent: () => import('./pages/booking/booking').then((m) => m.BookingDetails),
  },
  {
    path: 'admin',
    title: `Bookings · ${SALON.name}`,
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
  },
  { path: '**', redirectTo: '' },
];
