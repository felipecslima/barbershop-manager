import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectsFormComponent } from './projects-form.component';

@Component({
  selector: 'app-projects-edit',
  standalone: true,
  imports: [ProjectsFormComponent],
  template: `<app-projects-form [projectId]="projectId" />`,
})
export class ProjectsEditComponent {
  private readonly route = inject(ActivatedRoute);
  readonly projectId = this.route.snapshot.paramMap.get('id');
}
