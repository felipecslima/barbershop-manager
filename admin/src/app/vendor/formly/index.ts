import { CommonModule } from '@angular/common';
import { Component, Directive, Input, NgModule } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export interface FormlyFieldProps {
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export interface FormlyFieldConfig {
  key?: string;
  type?: string;
  props?: FormlyFieldProps;
  validators?: {
    validation?: string[];
  };
}

export interface ConfigOption {
  validationMessages?: Array<{ name: string; message: string }>;
  types?: Array<{ name: string; component: unknown }>;
}

@Directive({
  selector: '[formlyAttributes]',
  standalone: true,
})
export class FormlyAttributesDirective {
  @Input() formlyAttributes: unknown;
}

@Directive()
export abstract class FieldType {
  @Input() formControl: FormControl = new FormControl('');
  @Input() field: FormlyFieldConfig = {};
  get props(): FormlyFieldProps {
    return this.field.props ?? {};
  }

  get showError(): boolean {
    return this.formControl.invalid && this.formControl.touched;
  }

  get errorMessage(): string {
    if (this.formControl.hasError('required')) return 'This field is required';
    if (this.formControl.hasError('email')) return 'Please enter a valid email';
    return 'Invalid value';
  }
}

@Component({
  selector: 'formly-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      @for (field of fields; track field.key || $index) {
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ field.props?.label }}
            @if (field.props?.required) { <span class="text-error-500">*</span> }
          </label>

          @if (field.type === 'textarea') {
            <textarea
              [formControl]="getControl(field)"
              [attr.placeholder]="field.props?.placeholder || ''"
              [rows]="field.props?.rows || 4"
              class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800"
            ></textarea>
          } @else {
            <input
              [type]="field.props?.type || 'text'"
              [formControl]="getControl(field)"
              [attr.placeholder]="field.props?.placeholder || ''"
              class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800"
            />
          }

          @if (getControl(field).invalid && getControl(field).touched) {
            <p class="mt-1 text-xs text-error-500">{{ getError(getControl(field)) }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class FormlyFormComponent {
  @Input() form: FormGroup = new FormGroup({});
  @Input() fields: FormlyFieldConfig[] = [];
  @Input() model: Record<string, unknown> = {};

  ngOnChanges(): void {
    this.setupControls();
  }

  getControl(field: FormlyFieldConfig): FormControl {
    return this.form.get(field.key as string) as FormControl;
  }

  getError(control: AbstractControl): string {
    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Please enter a valid email';
    return 'Invalid value';
  }

  private setupControls(): void {
    for (const field of this.fields) {
      const key = field.key as string;
      if (!key || this.form.contains(key)) continue;

      const validators = [];
      if (field.props?.required) validators.push(Validators.required);
      if (field.validators?.validation?.includes('email')) validators.push(Validators.email);

      const control = new FormControl(this.model[key] ?? '', validators);
      control.valueChanges.subscribe((value) => {
        this.model[key] = value;
      });
      this.form.addControl(key, control);
    }
  }
}

@NgModule({
  imports: [FormlyFormComponent, FormlyAttributesDirective],
  exports: [FormlyFormComponent, FormlyAttributesDirective],
})
export class FormlyModule {
  static forRoot(_config?: ConfigOption): typeof FormlyModule {
    return FormlyModule;
  }
}
