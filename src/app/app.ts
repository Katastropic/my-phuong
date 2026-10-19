import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Time12Pipe } from './format.pipes';
import { SALON } from './salon.config';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Time12Pipe],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly salon = SALON;
  protected readonly year = new Date().getFullYear();
  protected readonly menuOpen = signal(false);
  protected readonly hours = WEEKDAYS.map((name, i) => ({ name, hours: SALON.hours[(i + 1) % 7] }));
}
