<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import type { VForm } from 'vuetify/components/VForm'
import { customerService } from '@/services/customerService'
import { userService } from '@/services/userService'
import type { Customer } from '@/types/customer'
import type { UserData } from '@/types/user'
import type { ManagedUserForm } from '@/types/userManagement'

const props = withDefaults(defineProps<{
  title: string
  isDrawerOpen: boolean
  userId?: string
}>(), { userId: undefined })
const emit = defineEmits<{
  saved: []
  cancel: []
  'update:isDrawerOpen': [value: boolean]
}>()
const customers = ref<Customer[]>([])
const availableCustomers = computed(() => {
  const currentCustomerId = form.value.customer_id

  return customers.value.filter(customer =>
    customer.users_count === 0 || customer.id === currentCustomerId,
  )
})
const loading = ref(Boolean(props.userId))
const saving = ref(false)
const error = ref('')
const validationErrors = ref<Record<string, string[]>>({})
const isFormValid = ref(false)
const refForm = ref<VForm>()
const userData = useCookie<UserData | null>('userData')
const roleItems = computed(() => [
  { title: 'Cliente', value: 'customer' },
  { title: 'Comercial', value: 'commercial' },
  ...(userData.value?.roles?.includes('admin')
    ? [{ title: 'Administrador', value: 'admin' }]
    : []),
])
const requiredRule = (value: unknown) =>
  Boolean(value) || 'Este campo es obligatorio.'
const emailRule = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Ingresa un correo válido.'
const passwordConfirmationRule = (value: string) =>
  value === form.value.password || 'Las contraseñas no coinciden.'
const form = ref<ManagedUserForm>({
  name: '',
  email: '',
  phone: '',
  customer_id: null,
  role: 'customer',
  is_active: true,
  password: '',
  password_confirmation: '',
})

const resetForm = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    customer_id: null,
    role: 'customer',
    is_active: true,
    password: '',
    password_confirmation: '',
  }
  error.value = ''
  validationErrors.value = {}
  refForm.value?.resetValidation()
}

const load = async () => {
  loading.value = true
  resetForm()
  const customersRequest = customerService.getCustomers()
  const userRequest = props.userId ? userService.get(props.userId) : null
  const [customersResponse, userResponse] = await Promise.all([
    customersRequest,
    userRequest,
  ])

  customers.value = customersResponse.customers
  if (userResponse) {
    const user = userResponse.user
    form.value = {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      customer_id: user.customer_id,
      role: user.roles?.[0]?.name ?? 'customer',
      is_active: user.is_active,
      password: '',
      password_confirmation: '',
    }
  }
  loading.value = false
}

const closeDrawer = () => {
  emit('update:isDrawerOpen', false)
  emit('cancel')
  nextTick(() => refForm.value?.resetValidation())
}

const save = async () => {
  const validation = await refForm.value?.validate()
  if (!validation?.valid)
    return

  saving.value = true
  error.value = ''
  validationErrors.value = {}
  try {
    if (props.userId)
      await userService.update(props.userId, form.value)
    else
      await userService.create(form.value)
    emit('saved')
    emit('update:isDrawerOpen', false)
  } catch (caught) {
    const responseErrors = (caught as { data?: { errors?: Record<string, string[]> } })?.data?.errors

    if (responseErrors) {
      validationErrors.value = responseErrors
    } else {
      error.value = 'No se pudo guardar el usuario. Verifica los datos.'
    }
    console.error(caught)
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.isDrawerOpen, props.userId] as const,
  ([isOpen]) => {
    if (isOpen)
      load()
  },
  { immediate: true },
)

watch(
  () => form.value.role,
  role => {
    if (role !== 'customer')
      form.value.customer_id = null
  },
)
</script>

<template>
  <VNavigationDrawer
    temporary
    location="end"
    width="500"
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="value => value ? undefined : closeDrawer()"
  >
    <AppDrawerHeaderSection
      :title="props.title"
      @cancel="closeDrawer"
    />
    <VDivider />

    <PerfectScrollbar
      :options="{ wheelPropagation: false }"
      class="h-100"
    >
      <VCard flat>
        <VCardText>
          <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
            {{ error }}
          </VAlert>
          <VProgressLinear v-if="loading" indeterminate class="mb-4" />

          <VForm
            v-else
            ref="refForm"
            v-model="isFormValid"
            @submit.prevent="save"
          >
            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="form.name"
                  label="Nombre completo"
                  :rules="[requiredRule]"
                  :error-messages="validationErrors.name"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="form.email"
                  label="Correo electrónico"
                  type="email"
                  :rules="[requiredRule, emailRule]"
                  :error-messages="validationErrors.email"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="form.phone"
                  label="Teléfono"
                  :error-messages="validationErrors.phone"
                />
              </VCol>
              <VCol cols="12">
                <VSelect
                  v-model="form.customer_id"
                  :items="availableCustomers"
                  item-title="company_name"
                  item-value="id"
                  label="Empresa"
                  :disabled="form.role !== 'customer'"
                  :rules="form.role === 'customer' ? [requiredRule] : []"
                  :error-messages="validationErrors.customer_id"
                />
              </VCol>
              <VCol cols="12">
                <VSelect
                  v-model="form.role"
                  :items="roleItems"
                  label="Rol"
                  :rules="[requiredRule]"
                  :error-messages="validationErrors.role"
                />
              </VCol>
              <VCol cols="12">
                <VSwitch v-model="form.is_active" label="Usuario activo" />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="form.password"
                  label="Contraseña"
                  type="password"
                  :rules="props.userId ? [] : [requiredRule]"
                  :error-messages="validationErrors.password"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="form.password_confirmation"
                  label="Confirmar contraseña"
                  type="password"
                  :rules="form.password ? [requiredRule, passwordConfirmationRule] : []"
                  :error-messages="validationErrors.password_confirmation"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>

    <template #append>
      <VDivider />
      <div class="pa-5 d-flex flex-row-reverse gap-3">
        <VBtn
          color="success-darken-1"
          :loading="saving"
          :disabled="loading"
          @click="save"
        >
          Guardar
        </VBtn>
        <VBtn variant="outlined" color="error" @click="closeDrawer">
          Cancelar
        </VBtn>
      </div>
    </template>
  </VNavigationDrawer>
</template>
