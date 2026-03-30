import client from './client';
import type { AppUser, CreateUserRequest } from '../types';

export const usersApi = {
  list: () => client.get<AppUser[]>('/users').then((r) => r.data),
  create: (data: CreateUserRequest) =>
    client.post<AppUser>('/users', data).then((r) => r.data),
  delete: (id: number) => client.delete(`/users/${id}`),
};
