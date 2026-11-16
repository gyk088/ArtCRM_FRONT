<template>
  <div class="backup-page">
    <div class="page-header">
      <div class="page-header-top">
        <MobileMenuButton />
        <h2 class="page-title">Бекап</h2>
      </div>
      <p class="page-subtitle">Скачайте копию своих данных и файлов к себе на компьютер</p>
    </div>

    <div class="backup-container">
      <BackupPanel />

      <section class="backup-info">
        <div class="section-heading">Как это работает</div>
        <ul>
          <li><b>Данные</b> скачиваются сразу: таблица Excel (по листу на работы, художников, контакты, продажи, ссылки, выставки, задачи, заметки, справочники) и полная копия всех записей data.json.</li>
          <li><b>Файлы</b> — архив всех загруженных картинок и файлов. Он собирается на сервере, это может занять несколько минут; когда архив будет готов, придёт уведомление. Скачать его можно в течение 24 часов.</li>
          <li>Рекомендуем делать бекап регулярно, например раз в месяц, и хранить копии в надёжном месте.</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import BackupPanel from '@/components/BackupPanel.vue'
</script>

<style scoped>
.backup-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
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

.page-header-top {
  display: flex;
  align-items: center;
  gap: 10px;
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

.backup-container {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-container :deep(.backup-card) {
  background: var(--bg-elevated);
}

.backup-info {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 13px;
  line-height: 1.55;
}

.backup-info ul {
  margin: 0;
  padding-left: 18px;
}

.backup-info li + li {
  margin-top: 6px;
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

@media (max-width: 560px) {
  .backup-page {
    padding: 16px 16px 32px;
  }
}
</style>
