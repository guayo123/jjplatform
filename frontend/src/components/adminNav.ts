import { UsersThree, Wallet, ChartBar, Trophy, ChalkboardTeacher, ClipboardText, CalendarBlank, Camera, Warning, Bell, Gear, LockKey, Wrench, House, type Icon } from '@phosphor-icons/react';
import GiIcon from './GiIcon';

export interface NavLink { to: string; label: string }

export const PRIMARY_LINKS: NavLink[] = [
  { to: '/admin/students',        label: 'Alumnos' },
  { to: '/admin/payments',        label: 'Pagos' },
  { to: '/admin/payments/report', label: 'Reporte' },
  { to: '/admin/tournaments',     label: 'Torneos' },
];

export const GESTION_LINKS: NavLink[] = [
  { to: '/admin/professors',    label: 'Profesores' },
  { to: '/admin/disciplines',   label: 'Disciplinas' },
  { to: '/admin/plans',         label: 'Planes' },
  { to: '/admin/schedules',     label: 'Horarios' },
  { to: '/admin/photos',        label: 'Fotos' },
  { to: '/admin/at-risk',       label: 'Alumnos en riesgo' },
  { to: '/admin/notifications', label: 'Notificaciones' },
  { to: '/admin/settings',      label: 'Configuración' },
];

export const ADMIN_ONLY_LINKS: NavLink[] = [
  { to: '/admin/users',       label: 'Usuarios' },
  { to: '/admin/maintenance', label: 'Mantenimiento' },
];

/** Icono de cada seccion del panel (barra inferior y hoja "Mas" en el movil). */
export const NAV_ICONS: Record<string, Icon> = {
  '/admin': House,
  '/admin/students': UsersThree,
  '/admin/payments': Wallet,
  '/admin/payments/report': ChartBar,
  '/admin/tournaments': Trophy,
  '/admin/professors': ChalkboardTeacher,
  '/admin/disciplines': GiIcon,
  '/admin/plans': ClipboardText,
  '/admin/schedules': CalendarBlank,
  '/admin/photos': Camera,
  '/admin/at-risk': Warning,
  '/admin/notifications': Bell,
  '/admin/settings': Gear,
  '/admin/users': LockKey,
  '/admin/maintenance': Wrench,
};
