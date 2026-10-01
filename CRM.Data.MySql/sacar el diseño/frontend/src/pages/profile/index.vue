<script setup lang="ts">
import type { CustomerContact } from '@/types/customer'
import type { UserData } from '@/types/user'

const userData = useCookie<UserData | null>('userData')
const customer = computed(() => userData.value?.customer ?? null)
const primaryContact = computed<CustomerContact | null>(() =>
  customer.value?.contacts?.find(contact => contact.is_primary) ?? customer.value?.contacts?.[0] ?? null,
)

const displayValue = (value: string | number | null | undefined) => value || 'No registrado'
</script>

<template>
  <div>
    <div class="mb-6">
      <h4 class="text-h4 mb-1">
        Mi perfil
      </h4>
      <p class="text-body-1 text-medium-emphasis mb-0">
        Consulta la información de tu cuenta y de tu empresa.
      </p>
    </div>

    <VRow>
      <VCol cols="12" md="4">
        <VCard>
          <VCardText class="text-center pa-6">
            <VAvatar
              size="96"
              color="primary"
              variant="tonal"
              class="mb-4"
            >
              <VIcon
                icon="ri-user-3-line"
                size="44"
              />
            </VAvatar>
            <h5 class="text-h5 mb-1">
              {{ displayValue(userData?.name) }}
            </h5>
            <p class="text-body-2 text-medium-emphasis mb-5">
              {{ userData?.roles?.[0] || 'Cliente' }}
            </p>

            <VDivider class="mb-5" />

            <div class="profile-detail">
              <VIcon
                icon="ri-mail-line"
                size="20"
              />
              <span>{{ displayValue(userData?.email) }}</span>
            </div>
            <div class="profile-detail">
              <VIcon
                icon="ri-phone-line"
                size="20"
              />
              <span>{{ displayValue(userData?.phone) }}</span>
            </div>
            <div class="profile-detail">
              <VIcon
                icon="ri-shield-check-line"
                size="20"
              />
              <span>{{ userData?.is_active ? 'Cuenta activa' : 'Cuenta inactiva' }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="8">
        <VCard class="mb-6">
          <VCardItem>
            <VCardTitle>
              Información de la empresa
            </VCardTitle>
            <VCardSubtitle>
              Datos registrados para tus cotizaciones y publicaciones.
            </VCardSubtitle>
          </VCardItem>
          <VCardText>
            <VRow>
              <VCol cols="12" sm="6">
                <div class="detail-label">Razón social</div>
                <div class="detail-value">{{ displayValue(customer?.company_name) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Nombre comercial</div>
                <div class="detail-value">{{ displayValue(customer?.trade_name) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">RUC</div>
                <div class="detail-value">{{ displayValue(customer?.tax_number) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Correo de empresa</div>
                <div class="detail-value">{{ displayValue(customer?.email) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Teléfono</div>
                <div class="detail-value">{{ displayValue(customer?.phone) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Ubicación</div>
                <div class="detail-value">
                  {{ [customer?.district, customer?.province, customer?.department].filter(Boolean).join(', ') || 'No registrado' }}
                </div>
              </VCol>
              <VCol cols="12">
                <div class="detail-label">Dirección</div>
                <div class="detail-value">{{ displayValue(customer?.address) }}</div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <VCard>
          <VCardItem>
            <VCardTitle>
              Contacto principal
            </VCardTitle>
            <VCardSubtitle>
              Persona de contacto asociada a tu empresa.
            </VCardSubtitle>
          </VCardItem>
          <VCardText v-if="primaryContact">
            <VRow>
              <VCol cols="12" sm="6">
                <div class="detail-label">Nombre</div>
                <div class="detail-value">{{ displayValue(primaryContact.name) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Cargo</div>
                <div class="detail-value">{{ displayValue(primaryContact.position) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Correo</div>
                <div class="detail-value">{{ displayValue(primaryContact.email) }}</div>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="detail-label">Teléfono</div>
                <div class="detail-value">{{ displayValue(primaryContact.phone) }}</div>
              </VCol>
            </VRow>
          </VCardText>
          <VCardText
            v-else
            class="text-body-2 text-medium-emphasis"
          >
            No hay un contacto principal registrado.
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.profile-detail {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-block-start: 1rem;
  text-align: start;
}

.detail-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8125rem;
  margin-block-end: 0.25rem;
}

.detail-value {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-weight: 500;
}
</style>
