import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FormlyModule } from '@ngx-formly/core';
import { FORMLY_CONFIG } from './shared/formly/formly.config';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(FormlyModule.forRoot(FORMLY_CONFIG)),
  ]
};
