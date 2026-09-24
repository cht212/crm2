<script setup lang="ts">
interface UserData {
  id: number | undefined
  fullName: string
  company: string
  role: string
  username: string
  country: string | null
  contact: string | undefined
  email: string | undefined
  currentPlan: string
  status: string | undefined
  avatar: string
  taskDone: number | null
  projectDone: number | null
  taxId: string
  language: string[]
}

interface Props {
  userData?: UserData
  isDialogVisible: boolean
}

interface Emit {
  (e: 'submit', value: UserData): void
  (e: 'update:isDialogVisible', val: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  userData: () => ({
    avatar: '',
    company: '',
    contact: '',
    country: null,
    currentPlan: '',
    email: '',
    fullName: '',
    id: 0,
    role: '',
    status: '',
    username: '',
    language: [],
    projectDone: 0,
    taskDone: 0,
    taxId: '',
  }),
})

const emit = defineEmits<Emit>()

const userData = ref<UserData>(structuredClone(toRaw(props.userData)))

watch(() => props, () => {
  userData.value = structuredClone(toRaw(props.userData))
})

const onFormSubmit = () => {
  emit('update:isDialogVisible', false)
  emit('submit', userData.value)
}

const onFormReset = () => {
  userData.value = structuredClone(toRaw(props.userData))

  emit('update:isDialogVisible', false)
}

const dialogVisibleUpdate = (val: boolean) => {
  emit('update:isDialogVisible', val)
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900 "
    :model-value="props.isDialogVisible"
    @update:model-value="dialogVisibleUpdate"
  >
    <VCard class="pa-sm-11 pa-3">
      <!-- 👉 dialog close btn -->
      <DialogCloseBtn
        variant="text"
        size="default"
        @click="onFormReset"
      />

      <VCardText class="pt-5">
        <div class="text-center pb-6">
          <h4 class="text-h4 mb-2">
            Edit User Information
          </h4>
          <div class="text-body-1">
            Updating user details will receive a privacy audit.
          </div>
        </div>

        <!-- 👉 Form -->
        <VForm
          class="mt-4"
          @submit.prevent="onFormSubmit"
        >
          <VRow>
            <!-- 👉 First Name -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="userData.fullName.split(' ')[0]"
                label="Nombres"
                placeholder="John"
              />
            </VCol>

            <!-- 👉 Last Name -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="userData.fullName.split(' ')[1]"
                label="Apellidos"
                placeholder="doe"
              />
            </VCol>

            <!-- 👉 User Name  -->

            <VCol cols="12">
              <VTextField
                v-model="userData.username"
                label="Username"
                placeholder="John Doe"
              />
            </VCol>

            <!-- 👉 Billing Email -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="userData.email"
                label="Correo de facturación"
                placeholder="johndoe@email.com"
              />
            </VCol>

            <!-- 👉 Status -->
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="userData.status"
                :items="['Active', 'Inactive', 'Pending']"
                label="Estado"
                placeholder="Status"
              />
            </VCol>

            <!-- 👉 Tax Id -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="userData.taxId"
                label="Tax Id"
                placeholder="Tax-3456789"
              />
            </VCol>

            <!-- 👉 Contact -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="userData.contact"
                label="Contact"
                placeholder="+1 9876543210"
              />
            </VCol>

            <!-- 👉 Language -->
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="userData.language"
                :items="['English', 'Spanish', 'French']"
                label="Language"
                placeholder="English"
                chips
                closable-chips
                multiple
              />
            </VCol>

            <!-- 👉 Country -->
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="userData.country"
                :items="['United States', 'United Kingdom', 'France']"
                label="Country"
                placeholder="United States"
              />
            </VCol>

            <!-- 👉 Switch -->
            <VCol cols="12">
              <VSwitch
                density="compact"
                label="Use as a billing address?"
              />
            </VCol>

            <!-- 👉 Submit and Cancel -->
            <VCol
              cols="12"
              class="d-flex flex-wrap justify-center gap-4"
            >
              <VBtn type="submit">
                Submit
              </VBtn>

              <VBtn
                color="secondary"
                variant="outlined"
                @click="onFormReset"
              >
                Cancel
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
