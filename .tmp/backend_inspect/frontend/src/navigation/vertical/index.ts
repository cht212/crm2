import customerNavigation from './customer'
import managementNavigation from './management'

export default [
  {
    title: 'Inicio',
    to: { name: 'root' },
    icon: { icon: 'ri-home-smile-2-line' },
  },
  { heading: 'Solicitudes' },
  {
    title: 'Cotizaciones',
    to: { name: 'quotations-list' },
    icon: { icon: 'ri-bill-line' },
    action: 'read',
    subject: 'QuoteRequest',
  },
  ...managementNavigation,
  ...customerNavigation,
]
