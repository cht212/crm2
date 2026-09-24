import type { AppAbilityRule } from '@/plugins/casl/ability'
import { ability } from '@/plugins/casl/ability'
import { permissionsToAbilityRules } from '@/plugins/casl/permissions'

interface LoginForm {
  email: string
  password: string
  remember: boolean
}

interface LoginResponse {
  accessToken: string
  userData: {
    permissions: string[]
    [key: string]: unknown
  }
}

const INVALID_CREDENTIALS_ERROR = 'Las credenciales no son correctas.'

export function useLogin() {
  const form = ref<LoginForm>({
    email: '',
    password: '',
    remember: false,
  })
  const errors = ref<Record<string, string[]>>({})
  const isLoading = ref(false)
  const genericError = ref('')
  const isPasswordVisible = ref(false)
  const router = useRouter()

  const clearFieldError = (field: keyof LoginForm) => {
    delete errors.value[field]
  }

  watch(() => form.value.email, () => clearFieldError('email'))
  watch(() => form.value.password, () => clearFieldError('password'))

  const login = async (redirectTo: string) => {
    if (isLoading.value)
      return

    errors.value = {}
    genericError.value = ''
    isLoading.value = true

    try {
      const response = await $api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: {
          email: form.value.email,
          password: form.value.password,
          remember_me: form.value.remember,
        },
        onResponseError({ response }) {
          errors.value = {}
          genericError.value = response.status === 422
            ? INVALID_CREDENTIALS_ERROR
            : 'Ocurrió un error al iniciar sesión. Intenta nuevamente.'
        },
      })

      const userAbilityRules = permissionsToAbilityRules(response.userData.permissions)

      ability.update(userAbilityRules)
      useCookie<AppAbilityRule[]>('userAbilityRules').value = userAbilityRules
      useCookie<LoginResponse['userData']>('userData').value = response.userData
      useCookie('accessToken').value = response.accessToken

      await nextTick()
      await router.replace(redirectTo)
    }
    catch (error) {
      if (!genericError.value && Object.keys(errors.value).length === 0)
        genericError.value = 'Ocurrió un error al iniciar sesión. Intenta nuevamente.'

      console.error('Login failed:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    form,
    errors,
    isLoading,
    genericError,
    isPasswordVisible,
    login,
  }
}
