import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

let echo: Echo<'reverb'> | null = null

export const getEcho = () => {
  if (echo)
    return echo

  window.Pusher = Pusher
  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${window.location.origin}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${useCookie('accessToken').value}`,
      },
    },
  })

  return echo
}
