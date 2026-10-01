<script setup lang="ts">
import { ref } from 'vue'
import type { PromotionEmbedForm } from '@/types/promotion'

defineProps<{
  embeds: PromotionEmbedForm[]
}>()

const embedLoading = ref(true)

const getEmbedUrl = (platform: PromotionEmbedForm['platform'], value: string) => {
  try {
    const url = new URL(value)

    if (platform === 'youtube') {
      const videoId = url.searchParams.get('v') || url.pathname.match(/(?:embed|shorts)\/([^/?]+)/)?.[1]

      return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&vq=hd720`
        : null
    }

    const postId = url.pathname.match(/(?:video|photo)\/(\d+)/)?.[1]
    if (platform === 'tiktok') {
      return postId
        ? `https://www.tiktok.com/player/v1/${postId}?controls=1&description=1&music_info=1&autoplay=1`
        : null
    }

    if (platform === 'instagram')
      return `https://www.instagram.com${url.pathname.replace(/\/$/, '')}/embed`

    if (platform === 'facebook')
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(value)}&show_text=false&autoplay=true`
  }
  catch {
    return null
  }

  return null
}

const embedTitle = (platform: string) => {
  const labels: Record<string, string> = {
    tiktok: 'TikTok',
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
  }

  return labels[platform] || 'contenido externo'
}

const embedIcon = (platform: string) => {
  const icons: Record<string, string> = {
    tiktok: 'ri-tiktok-line',
    facebook: 'ri-facebook-circle-line',
    instagram: 'ri-instagram-line',
    youtube: 'ri-youtube-line',
  }

  return icons[platform] || 'ri-links-line'
}

const getTikTokPostId = (value: string) => {
  try {
    return new URL(value).pathname.match(/(?:video|photo)\/(\d+)/)?.[1] ?? null
  }
  catch {
    return null
  }
}
</script>

<template>
  <VCard class="embed-sidebar">
    <VCardText>
      <h2 class="text-h6 mb-4">
        Contenido relacionado
      </h2>

      <VCard
        v-for="(embed, index) in embeds"
        :key="embed.id ?? `${embed.url}-${index}`"
        variant="outlined"
        class="mb-4 overflow-hidden"
      >
        <div
          v-if="embed.platform === 'tiktok' && getTikTokPostId(embed.url)"
          class="tiktok-stage"
        >
          <div
            v-if="embedLoading"
            class="embed-loading"
          >
            <div class="embed-loading-content">
              <VAvatar
                :color="embed.platform === 'tiktok' ? 'secondary' : 'primary'"
                variant="tonal"
                size="48"
                class="mb-3"
              >
                <VIcon
                  :icon="embedIcon(embed.platform)"
                  size="26"
                />
              </VAvatar>
              <span class="text-subtitle-2">Cargando {{ embedTitle(embed.platform) }}...</span>
              <span class="text-body-2 text-medium-emphasis">Preparando contenido</span>
            </div>
          </div>
          <iframe
            :src="getEmbedUrl(embed.platform, embed.url) || undefined"
            :title="`Contenido de ${embedTitle(embed.platform)}`"
            class="social-embed tiktok-embed"
            :class="{ 'is-loading': embedLoading }"
            scrolling="no"
            frameborder="0"
            allow="fullscreen"
            allowfullscreen
            @load="embedLoading = false"
          />
        </div>
        <div
          v-else-if="getEmbedUrl(embed.platform, embed.url)"
          class="embed-stage"
          :class="`${embed.platform}-stage`"
        >
          <div
            v-if="embedLoading"
            class="embed-loading"
          >
            <div class="embed-loading-content">
              <VAvatar
                :color="embed.platform === 'tiktok' ? 'secondary' : 'primary'"
                variant="tonal"
                size="48"
                class="mb-3"
              >
                <VIcon
                  :icon="embedIcon(embed.platform)"
                  size="26"
                />
              </VAvatar>
              <span class="text-subtitle-2">Cargando {{ embedTitle(embed.platform) }}...</span>
              <span class="text-body-2 text-medium-emphasis">Preparando contenido</span>
            </div>
          </div>
          <iframe
            :src="getEmbedUrl(embed.platform, embed.url) || undefined"
            :title="`Contenido de ${embedTitle(embed.platform)}`"
            class="social-embed"
            :class="[
              `${embed.platform}-embed`,
              { 'is-loading': embedLoading },
            ]"
            scrolling="no"
            frameborder="0"
            allowtransparency="true"
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowfullscreen
            @load="embedLoading = false"
          />
        </div>
      </VCard>
    </VCardText>
  </VCard>
</template>

<style scoped>
.embed-sidebar {
  position: sticky;
  inset-block-start: 1.5rem;

}

.social-embed {
  display: block;
  inline-size: 100%;
  block-size: 575px;
  border: 0;
  opacity: 1;
  transition: opacity 0.25s ease;
}

.social-embed.is-loading {
  opacity: 0;
}

.instagram-embed {
  block-size: 700px;
}

.facebook-embed {
  block-size: 600px;
}

.youtube-embed {
  block-size: 650px;
}

.tiktok-embed {
  max-inline-size: 100%;
  block-size: 600px;
  margin-block: 0;
  margin-inline: auto;
}

.tiktok-stage {
  position: relative;
  min-block-size: 600px;
}

.embed-stage {
  position: relative;
}

.instagram-stage {
  min-block-size: 700px;
}

.facebook-stage {
  min-block-size: 575px;
}

.youtube-stage {
  min-block-size: 400px;
}

.embed-loading {
  position: absolute;
  z-index: 1;
  inline-size: 100%;
  inset: 0;
  border-radius: 0;
}

.embed-loading-content {
  position: absolute;
  inset: 50% auto auto 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  inline-size: max-content;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  transform: translate(-50%, -50%);
}

@media (max-width: 959px) {
  .embed-sidebar {
    position: static;
  }
}
</style>
