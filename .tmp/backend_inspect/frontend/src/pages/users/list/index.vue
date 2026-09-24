<script setup lang="ts">
definePage({ meta: { action: 'read', subject: 'User' } })

import { userService } from '@/services/userService'
import type { ManagedUser } from '@/types/userManagement'
import UserForm from '@/components/users/UserForm.vue'

const users = ref<ManagedUser[]>([])
const loading = ref(false)
const search = ref('')
const userDrawer = ref(false)
const selectedUserId = ref<string | undefined>()
const formKey = ref(0)

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await userService.list({ q: search.value || undefined, per_page: 100 })
    users.value = response.users.data
  } finally {
    loading.value = false
  }
}

watch(search, () => loadUsers())
onMounted(loadUsers)

const openCreateDrawer = () => {
  selectedUserId.value = undefined
  formKey.value++
  userDrawer.value = true
}

const openEditDrawer = (user: ManagedUser) => {
  selectedUserId.value = user.id
  formKey.value++
  userDrawer.value = true
}

const handleUserSaved = async () => {
  userDrawer.value = false
  await loadUsers()
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">Usuarios</h4>
        <p class="text-body-1 mb-0">Administra usuarios y asígnalos a una empresa.</p>
      </div>
      <VBtn color="primary" @click="openCreateDrawer">
        <VIcon start icon="ri-user-add-line" /> Nuevo usuario
      </VBtn>
    </div>

    <VCard>
      <VCardText>
        <VTextField v-model="search" label="Buscar usuario" prepend-inner-icon="ri-search-line" clearable />
      </VCardText>
      <VDivider />
      <VDataTable :headers="[
        { title: 'Nombre', key: 'name' },
        { title: 'Correo', key: 'email' },
        { title: 'Empresa', key: 'customer.company_name' },
        { title: 'Rol', key: 'roles' },
        { title: 'Estado', key: 'is_active' },
        { title: 'Acciones', key: 'actions', sortable: false },
      ]" :items="users" :loading="loading" item-value="id" loading-text="Cargando usuarios..." no-data-text="No se encontraron usuarios" class="elevation-0">
        <template #item.customer.company_name="{ item }">{{ item.customer?.company_name || '-' }}</template>
        <template #item.roles="{ item }">
          <VChip v-for="role in item.roles ?? []" :key="role.id" size="small" color="primary" variant="tonal">
            {{ role.name }}
          </VChip>
        </template>
        <template #item.is_active="{ item }">
          <VChip :color="item.is_active ? 'success' : 'secondary'" size="small">
            {{ item.is_active ? 'Activo' : 'Inactivo' }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <IconBtn size="small" @click="openEditDrawer(item)">
            <VIcon icon="ri-edit-line" />
            <VTooltip activator="parent">Editar usuario</VTooltip>
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <UserForm
      :key="formKey"
      :is-drawer-open="userDrawer"
      :user-id="selectedUserId"
      :title="selectedUserId ? 'Editar usuario' : 'Nuevo usuario'"
      @update:is-drawer-open="userDrawer = $event"
      @saved="handleUserSaved"
      @cancel="userDrawer = false"
    />
  </div>
</template>
