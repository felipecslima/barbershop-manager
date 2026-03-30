import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormlyModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <formly-form [form]="form" [fields]="fields" [model]="model"></formly-form>

      <button
        type="submit"
        [disabled]="form.invalid || loading"
        class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {{ submitLabel }}
      </button>
    </form>
  `,
})
export class DynamicFormComponent {
  @Input() form: FormGroup = new FormGroup({});
  @Input() fields: FormlyFieldConfig[] = [];
  @Input() model: Record<string, unknown> = {};
  @Input() submitLabel = 'Submit';
  @Input() loading = false;
  @Output() submitted = new EventEmitter<void>();

  submit(): void {
    if (this.form.valid) {
      this.submitted.emit();
    }
  }
}
