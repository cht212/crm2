<script setup lang="ts">
const shortcuts = [
  {
    icon: 'ri-calendar-line',
    title: 'Calendario',
    subtitle: 'Citas',
    to: { name: 'apps-calendar' },
  },
  {
    icon: 'ri-file-list-3-line',
    title: 'Facturación',
    subtitle: 'Gestionar cuentas',
    to: { name: 'apps-invoice-list' },
  },
  {
    icon: 'ri-user-line',
    title: 'Usuarios',
    subtitle: 'Gestionar usuarios',
    to: { name: 'apps-user-list' },
  },
  {
    icon: 'ri-computer-line',
    title: 'Gestión de roles',
    subtitle: 'Permisos',
    to: { name: 'apps-roles' },
  },
  {
    icon: 'ri-pie-chart-2-line',
    title: 'Panel',
    subtitle: 'Panel de usuario',
    to: { name: 'dashboards-analytics' },
  },
  {
    icon: 'ri-settings-4-line',
    title: 'Configuración',
    subtitle: 'Configuración de la cuenta',
    to: { name: 'pages-account-settings-tab', params: { tab: 'account' } },
  },

]
</script>

<template>
  <Shortcuts :shortcuts="shortcuts" />
</template>
