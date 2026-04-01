import { Component } from '@angular/core';
import { ProjectsFormComponent } from './projects-form.component';

@Component({
  selector: 'app-projects-create',
  standalone: true,
  imports: [ProjectsFormComponent],
  template: `<app-projects-form />`,
})
export class ProjectsCreateComponent {}
