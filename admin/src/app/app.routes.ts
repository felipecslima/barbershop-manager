import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { ProjectsListComponent } from './features/projects/projects-list.component';
import { ProjectsCreateComponent } from './features/projects/projects-create.component';
import { ProjectsEditComponent } from './features/projects/projects-edit.component';
import { OrganizationsComponent } from './features/organizations/organizations.component';
import { UsersComponent } from './features/users/users.component';
import { RolesComponent } from './features/roles/roles.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        canActivate: [authGuard],
        title: 'Dashboard | Boilerplate Manager',
      },
      {
        path: 'organizations',
        component: OrganizationsComponent,
        canActivate: [authGuard],
        title: 'Organizations | Boilerplate Manager',
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [authGuard],
        title: 'Users | Boilerplate Manager',
      },
      {
        path: 'roles',
        component: RolesComponent,
        canActivate: [authGuard],
        title: 'Roles & Permissions | Boilerplate Manager',
      },
      {
        path: 'projects',
        component: ProjectsListComponent,
        canActivate: [authGuard],
        title: 'Projects | Boilerplate Manager',
      },
      {
        path: 'projects/new',
        component: ProjectsCreateComponent,
        canActivate: [authGuard],
        title: 'Create Project | Boilerplate Manager',
      },
      {
        path: 'projects/:id/edit',
        component: ProjectsEditComponent,
        canActivate: [authGuard],
        title: 'Edit Project | Boilerplate Manager',
      },
    ],
  },
  // Novas rotas de auth (com publicGuard — redireciona para / se já autenticado)
  {
    path: 'auth/login',
    component: LoginComponent,
    canActivate: [publicGuard],
    title: 'Login | Boilerplate Manager',
  },
  {
    path: 'auth/forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [publicGuard],
    title: 'Recuperar Senha | Boilerplate Manager',
  },
  {
    path: 'auth/reset-password',
    component: ResetPasswordComponent,
    title: 'Redefinir Senha | Boilerplate Manager',
  },
  // Rotas legadas — mantidas para backward compatibility
  {
    path: 'signin',
    component: SignInComponent,
    canActivate: [publicGuard],
    title: 'Sign In | Boilerplate Manager',
  },
  {
    path: 'signup',
    component: SignUpComponent,
    canActivate: [publicGuard],
    title: 'Sign Up | Boilerplate Manager',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not Found | Boilerplate Manager',
  },
];
