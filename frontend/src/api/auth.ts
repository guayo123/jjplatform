import client from './client';
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  StudentRegisterRequest,
} from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    client.post<LoginResponse>('/auth/register', data).then((r) => r.data),

  studentRegister: (data: StudentRegisterRequest) =>
    client.post<void>('/auth/student-register', data).then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    client.post<void>('/auth/forgot-password', data).then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    client.post<void>('/auth/change-password', data).then((r) => r.data),
};
