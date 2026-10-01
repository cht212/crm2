<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'

interface Permission {
  name: string
  read: boolean
  write: boolean
  create: boolean
}

interface Roles {
  name: string
  permissions: Permission[]
}

interface Props {
  rolePermissions?: Roles
  isDialogVisible: boolean
}
interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'update:rolePermissions', value: Roles): void
}

const props = withDefaults(defineProps<Props>(), {
  rolePermissions: () => ({
    name: '',
    permissions: [],
  }),
})

const emit = defineEmits<Emit>()

// 👉 Permission List
const permissions = ref<Permission[]>([
  {
    name: 'User Management',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Content Management',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Disputes Management',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Database Management',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Financial Management',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Reporting',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'API Control',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Repository Management',
    read: false,
    write: false,
    create: false,
  },
  {
    name: 'Payroll',
    read: false,
    write: false,
    create: false,
  },
])

const isSelectAll = ref(false)
const role = ref('')
const refPermissionForm = ref<VForm>()

const checkedCount = computed(() => {
  let counter = 0

  permissions.value.forEach(permission => {
    Object.entries(permission).forEach(([key, value]) => {
      if (key !== 'name' && value)
        counter++
    })
  })

  return counter
})

const isIndeterminate = computed(() => checkedCount.value > 0 && checkedCount.value < (permissions.value.length * 3))

// select all
watch(isSelectAll, val => {
  permissions.value = permissions.value.map(permission => ({
    ...permission,
    read: val,
    write: val,
    create: val,
  }))
})

// if Indeterminate is false, then set isSelectAll to false
watch(isIndeterminate, () => {
  if (!isIndeterminate.value)
    isSelectAll.value = false
})

// if all permissions are checked, then set isSelectAll to true
watch(permissions, () => {
  if (checkedCount.value === (permissions.value.length * 3))
    isSelectAll.value = true
}, { deep: true })

// if rolePermissions is not empty, then set permissions
watch(() => props, () => {
  if (props.rolePermissions && props.rolePermissions.permissions.length) {
    role.value = props.rolePermissions.name
    permissions.value = permissions.value.map(permission => {
      const rolePermission = props.rolePermissions?.permissions.find(item => item.name === permission.name)

      if (rolePermission) {
        return {
          ...permission,
          ...rolePermission,
        }
      }

      return permission
    })
  }
})

const onSubmit = () => {
  const rolePermissions = {
    name: role.value,
    permissions: permissions.value,
  }

  emit('update:rolePermissions', rolePermissions)
  emit('update:isDialogVisible', false)
  isSelectAll.value = false
  refPermissionForm.value?.reset()
}

const onReset = () => {
  emit('update:isDialogVisible', false)
  isSelectAll.value = false
  refPermissionForm.value?.reset()
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="props.isDialogVisible"
    @update:model-value="onReset"
  >
    <VCard class="pa-sm-11 pa-3">
      <!-- 👉 dialog close btn -->
      <DialogCloseBtn
        variant="text"
        size="default"
        @click="onReset"
      />

      <VCardText>
        <!-- 👉 Title -->
        <div class="text-center mb-10">
          <h4 class="text-h4 mb-2">
            {{ props.rolePermissions.name ? 'Editar' : 'Agregar' }} rol
          </h4>

          <p class="text-body-1">
            {{ props.rolePermissions.name ? 'Edit' : 'Add' }} Role
          </p>
        </div>

        <!-- 👉 Form -->
        <VForm ref="refPermissionForm">
          <!-- 👉 Role name -->
          <VTextField
            v-model="role"
            label="Nombre del rol"
            placeholder="Ingresa el nombre del rol"
          />

          <h5 class="text-h5 my-6">
            Permisos del rol
          </h5>

          <!-- 👉 Role Permissions -->

          <VTable class="permission-table text-no-wrap">
            <!-- 👉 Admin  -->
            <tr>
              <td class="text-h6">
                Acceso de administrador
              </td>
              <td colspan="3">
                <div class="d-flex justify-end">
                  <VCheckbox
                    v-model="isSelectAll"
                    v-model:indeterminate="isIndeterminate"
                    label="Seleccionar todo"
                  />
                </div>
              </td>
            </tr>

            <!-- 👉 Other permission loop -->
            <template
              v-for="permission in permissions"
              :key="permission.name"
            >
              <tr>
                <td class="text-h6">
                  {{ permission.name }}
                </td>
                <td style="inline-size: 5.75rem;">
                  <div class="d-flex justify-end">
                    <VCheckbox
                      v-model="permission.read"
                      label="Leer"
                    />
                  </div>
                </td>
                <td style="inline-size: 5.75rem;">
                  <div class="d-flex justify-end">
                    <VCheckbox
                      v-model="permission.write"
                      label="Escribir"
                    />
                  </div>
                </td>
                <td style="inline-size: 5.75rem;">
                  <div class="d-flex justify-end">
                    <VCheckbox
                      v-model="permission.create"
                      label="Crear"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </VTable>

          <!-- 👉 Actions button -->
          <div class="d-flex align-center justify-center gap-3 mt-6">
            <VBtn @click="onSubmit">
              Guardar
            </VBtn>

            <VBtn
              color="secondary"
              variant="outlined"
              @click="onReset"
            >
              Cancel
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss">
.permission-table {
  td {
    border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding-block: 0.625rem;

    .v-checkbox {
      min-inline-size: 4.75rem;
    }

    &:not(:first-child) {
      padding-inline: 0.75rem;
    }

    .v-label {
      white-space: nowrap;
    }
  }
}
</style>
