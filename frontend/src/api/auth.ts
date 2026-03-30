import client from './client';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    client.post<LoginResponse>('/auth/register', data).then((r) => r.data),
};
