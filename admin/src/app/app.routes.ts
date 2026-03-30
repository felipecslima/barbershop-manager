import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { authGuard } from './core/guards/auth.guard';
import { ProjectsListComponent } from './features/projects/projects-list.component';
import { ProjectsCreateComponent } from './features/projects/projects-create.component';
import { ProjectsEditComponent } from './features/projects/projects-edit.component';
import { OrganizationsComponent } from './features/organizations/organizations.component';
import { UsersComponent } from './features/users/users.component';
import { RolesComponent } from './features/roles/roles.component';

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
        title: 'Dashboard | Barbershop Manager',
      },
      {
        path: 'organizations',
        component: OrganizationsComponent,
        canActivate: [authGuard],
        title: 'Organizations | Barbershop Manager',
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [authGuard],
        title: 'Users | Barbershop Manager',
      },
      {
        path: 'roles',
        component: RolesComponent,
        canActivate: [authGuard],
        title: 'Roles & Permissions | Barbershop Manager',
      },
      {
        path: 'projects',
        component: ProjectsListComponent,
        canActivate: [authGuard],
                title: 'Projects | Barbershop Manager',
      },
      {
        path: 'projects/new',
        component: ProjectsCreateComponent,
        canActivate: [authGuard],
                title: 'Create Project | Barbershop Manager',
      },
      {
        path: 'projects/:id/edit',
        component: ProjectsEditComponent,
        canActivate: [authGuard],
                title: 'Edit Project | Barbershop Manager',
      },
    ],
  },
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Sign In | Barbershop Manager',
  },
  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Sign Up | Barbershop Manager',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not Found | Barbershop Manager',
  },
];
