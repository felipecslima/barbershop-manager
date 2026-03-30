import { Component } from '@angular/core';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-formly-field-input',
  standalone: true,
  imports: [ReactiveFormsModule, FormlyModule],
  template: `
    <div>
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ props.label }}
        @if (props.required) {
          <span class="text-error-500">*</span>
        }
      </label>
      <input
        [type]="props.type || 'text'"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [placeholder]="props.placeholder || ''"
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      @if (showError) {
        <p class="mt-1 text-xs text-error-500">{{ errorMessage }}</p>
      }
    </div>
  `,
})
export class FormlyFieldInputTypeComponent extends FieldType {}
