<template>
  <div class="reference-page">
    <div class="page-header">
      <h2 class="page-title">Справочник</h2>
      <p class="page-subtitle">Художники, серии, медиа, локации и статусы — общие списки для ваших работ</p>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="reference-tabs">
      <a-tab-pane v-if="!isArtist" key="artists" tab="Художники">
        <ReferenceEntityPanel
          :store="artistStore"
          list-field="listArtists"
          load-action="getListArtists"
          create-action="createArtist"
          update-action="updateArtist"
          delete-action="deleteArtist"
          singular-label="художника"
        />
      </a-tab-pane>

      <a-tab-pane key="serias" tab="Серии">
        <ReferenceEntityPanel
          :store="seriaStore"
          list-field="listSerias"
          load-action="getListSerias"
          create-action="createSeria"
          update-action="updateSeria"
          delete-action="deleteSeria"
          singular-label="серию"
        />
      </a-tab-pane>

      <a-tab-pane key="media" tab="Медиа">
        <ReferenceEntityPanel
          :store="mediaStore"
          list-field="listMedia"
          load-action="getListMedia"
          create-action="createMedia"
          update-action="updateMedia"
          delete-action="deleteMedia"
          singular-label="медиа"
        />
      </a-tab-pane>

      <a-tab-pane key="locations" tab="Локации">
        <ReferenceEntityPanel
          :store="locationsStore"
          list-field="listLocations"
          load-action="getListLocations"
          create-action="createLocation"
          update-action="updateLocation"
          delete-action="deleteLocation"
          singular-label="локацию"
        />
      </a-tab-pane>

      <a-tab-pane key="statuses" tab="Статусы">
        <ReferenceEntityPanel
          :store="statusesStore"
          list-field="listStatuses"
          load-action="getListStatuses"
          create-action="createStatus"
          update-action="updateStatus"
          delete-action="deleteStatus"
          singular-label="статус"
          has-color
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ReferenceEntityPanel from '@/components/ReferenceEntityPanel.vue'
import { useArtist } from '@/stores/artist.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useLocations } from '@/stores/locations.js'
import { useStatuses } from '@/stores/statuses.js'
import { getUser } from '@/services/auth.js'
import { ROLES } from '@/services/const'

const artistStore = useArtist()
const seriaStore = useSerias()
const mediaStore = useMedia()
const locationsStore = useLocations()
const statusesStore = useStatuses()

const isArtist = computed(() => getUser()?.role === ROLES.ARTIST)

const activeTab = ref(isArtist.value ? 'serias' : 'artists')
</script>

<style scoped>

.reference-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.1);

  min-height: 100%;
  padding: 20px 24px 40px;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.reference-page :deep(.ant-btn-primary) {
  background: var(--accent);
  border-color: var(--accent);
}

.reference-page :deep(.ant-btn-primary:not(:disabled):hover) {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.reference-page :deep(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--accent-strong);
}

.reference-page :deep(.ant-tabs-ink-bar) {
  background: var(--accent);
}

.reference-page :deep(.ant-table) {
  background: var(--bg-elevated);
}

.reference-page :deep(.ant-table-thead > tr > th) {
  background: var(--card-bg);
  color: var(--accent);
  font-weight: 600;
}
</style>
