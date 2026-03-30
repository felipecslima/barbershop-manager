import { ConfigOption } from '@ngx-formly/core';
import { FormlyFieldInputTypeComponent } from './formly-field-input.type';
import { FormlyFieldTextareaTypeComponent } from './formly-field-textarea.type';

export const FORMLY_CONFIG: ConfigOption = {
  validationMessages: [
    { name: 'required', message: 'This field is required' },
    { name: 'email', message: 'Please enter a valid email' },
    { name: 'minLength', message: 'Value is too short' },
  ],
  types: [
    { name: 'input', component: FormlyFieldInputTypeComponent },
    { name: 'textarea', component: FormlyFieldTextareaTypeComponent },
  ],
};
