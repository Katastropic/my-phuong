import { CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DurationPipe } from '../../format.pipes';
import { SALON, servicesByCategory } from '../../salon.config';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CurrencyPipe, DurationPipe],
  templateUrl: './home.html',
})
export class Home {
  protected readonly salon = SALON;
  protected readonly categories = servicesByCategory();
  protected readonly highlights = [
    { title: 'Personal service', text: 'Every visit starts with a chat about what you want — no rushing.' },
    { title: 'Quality products', text: 'Professional colour and care products that are kind to your hair.' },
    { title: 'Easy booking', text: 'Pick a time that suits you online in under a minute.' },
  ];
}
