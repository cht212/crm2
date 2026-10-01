<script setup lang="ts">
import { ability } from '@/plugins/casl/ability'
import type { UserData } from '@/types/user'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

const router = useRouter()
const isLoggingOut = ref(false)

const userData = useCookie<UserData | null>('userData')

const logout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true

  try {
    await $api('/auth/logout', { method: 'POST' })
  }
  catch (error) {
    console.error('Logout failed:', error)
  }
  finally {
    useCookie('accessToken').value = null
    userData.value = null
    useCookie('userAbilityRules').value = null
    ability.update([])

    await router.replace({ name: 'login' })
  }
}

const userProfileList = [
  { type: 'divider' },
  {
    type: 'navItem',
    icon: 'ri-user-line',
    title: 'Perfil',
    to: { name: 'profile' },
  },
]
</script>

<template>
  <VBadge
    v-if="userData"
    dot
    bordered
    location="bottom right"
    offset-x="2"
    offset-y="2"
    color="success"
    class="user-profile-badge"
  >
    <VAvatar
      class="cursor-pointer"
      size="38"
      color="primary"
      variant="tonal"
    >
      <VIcon icon="ri-user-line" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="15px"
      >
        <VList>
          <VListItem class="px-4">
            <div class="d-flex gap-x-2 align-center">
              <VAvatar color="primary" variant="tonal">
                <VIcon icon="ri-user-line" />
              </VAvatar>

              <div>
                <div class="text-body-2 font-weight-medium text-high-emphasis">
                  {{ userData.name }}
                </div>
                <div class="text-capitalize text-caption text-disabled">
                  {{ userData.roles?.[0] || 'Cliente' }}
                </div>
              </div>
            </div>
          </VListItem>

          <PerfectScrollbar :options="{ wheelPropagation: false }">
            <template
              v-for="item in userProfileList"
              :key="item.title"
            >
              <VListItem
                v-if="item.type === 'navItem'"
                class="px-4"
                :to="item.to"
              >
                <template #prepend>
                  <VIcon
                    :icon="item.icon"
                    size="22"
                  />
                </template>

                <VListItemTitle>{{ item.title }}</VListItemTitle>
              </VListItem>

              <VDivider
                v-else
                class="my-1"
              />
            </template>

            <VListItem class="px-4">
              <VBtn
                block
                color="error"
                size="small"
                append-icon="ri-logout-box-r-line"
                :disabled="isLoggingOut"
                :loading="isLoggingOut"
                @click="logout"
              >
                Cerrar Sesion
              </VBtn>
            </VListItem>
          </PerfectScrollbar>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>

<style lang="scss">
.user-profile-badge {
  &.v-badge--bordered.v-badge--dot .v-badge__badge::after {
    color: rgb(var(--v-theme-background));
  }
}
</style>
