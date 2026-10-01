<script setup lang="ts">
import type { ThemeSwitcherTheme } from '@layouts/types'

const themes: ThemeSwitcherTheme[] = [
  {
    name: 'system',
    title: 'Sistema',
    icon: 'ri-macbook-line',
  },
  {
    name: 'light',
    title: 'Claro',
    icon: 'ri-sun-line',
  },
  {
    name: 'dark',
    title: 'Oscuro',
    icon: 'ri-moon-clear-line',
  },
]
</script>

<template>
  <ThemeSwitcher :themes="themes" />
</template>
