import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

let echo: Echo<'pusher'> | null = null

export const getEcho = () => {
  if (echo)
    return echo

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
  const authEndpoint = apiBaseUrl.startsWith('/')
    ? '/broadcasting/auth'
    : `${apiBaseUrl.replace(/\/api\/?$/, '')}/broadcasting/auth`
  const key = import.meta.env.VITE_PUSHER_APP_KEY
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER

  if (!key || !cluster)
    throw new Error('Configura VITE_PUSHER_APP_KEY y VITE_PUSHER_APP_CLUSTER para habilitar las notificaciones en tiempo real.')

  window.Pusher = Pusher
  echo = new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    forceTLS: true,
    authEndpoint,
    auth: {
      headers: {
        Authorization: `Bearer ${useCookie('accessToken').value}`,
        Accept: 'application/json',
      },
    },
  })

  return echo
}
