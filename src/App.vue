<template lang="pug">
a-config-provider(:locale="locale")
  component(
    :is="layoutName"
  )
</template>

<script>
import { defineComponent, computed } from "vue";
import EmptyLayout from "@/layouts/Empty.vue";
import MainLayout from "@/layouts/Home.vue";
import { useRoute } from "vue-router";
import ruRU from "ant-design-vue/es/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import { ref } from "vue";
import { theme } from "ant-design-vue";
dayjs.locale("ru");

export default defineComponent({
  name: "App",

  components: {
    EmptyLayout,
    MainLayout,
  },

  setup() {
    const route = useRoute();
    const locale = ruRU;

    // computed
    const layoutName = computed(() => {
      switch (route.meta.layout) {
        case "main":
          return "main-layout";
        case "empty":
          return "empty-layout";
        default:
          return "empty-layout";
      }
    });
    return {
      layoutName,
      locale,
    };
  },
});
</script>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
