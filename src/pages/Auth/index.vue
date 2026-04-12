<template>
  <div class="auth-page">
    <div class="auth-img"></div>   
    <div class="auth-login-form">
      <a-card
        class="auth-card"
        :title="isForgot ? 'Восстановление пароля' : 'Вход в систему'"
      >
        <a-form layout="vertical" :model="form" @finish="onSubmit">
          <template v-if="!isForgot">
            <!-- ЛОГИН -->
            <a-form-item
              label="Email"
              name="email"
              :rules="[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]"
            >
              <a-input v-model:value="form.email" placeholder="you@example.com" />
            </a-form-item>

            <!-- ПАРОЛЬ -->
            <a-form-item
              label="Пароль"
              name="password"
              :rules="[{ required: true, message: 'Введите пароль' }]"
            >
              <a-input-password
                v-model:value="form.password"
                placeholder="Введите пароль"
              />
            </a-form-item>

            <a-button type="primary" html-type="submit" block :loading="loading">Войти</a-button>

            <div class="auth-footer">
              <a @click="isForgot = true">Забыли пароль?</a>
            </div>
          </template>

          <template v-else>
            <!-- ВОССТАНОВЛЕНИЕ ПАРОЛЯ -->
            <a-form-item
              label="Email"
              name="resetEmail"
              :rules="[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]"
            >
              <a-input v-model:value="form.resetEmail" placeholder="you@example.com" />
            </a-form-item>

            <a-button type="primary" html-type="submit" block :loading="loading"
              >Отправить инструкцию</a-button
            >

            <div class="auth-footer">
              <a @click="isForgot = false">Вернуться к входу</a>
            </div>
          </template>
        </a-form>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import { useAuth } from '@/stores/auth'

const router = useRouter();
const isForgot = ref(false);
const loading = ref(false); 
const authStore = useAuth();

const form = reactive({
  email: "",
  password: "",
  resetEmail: "",
});

const onSubmit = async () => {
  loading.value = true; // Включаем индикатор загрузки
  if (!isForgot.value) {
    // --- ЛОГИН ---     
    const success = await authStore.login(form.email, form.password); // Вызов метода логина из стора
    if (success) {
      message.success("Добро пожаловать!");
      router.push("/home");
    } else {
      message.error("Неверный email или пароль");
    }
  } else {
    // --- ВОССТАНОВЛЕНИЕ ---
    if (form.resetEmail) {
      message.success(`Инструкция отправлена на ${form.resetEmail}`);
      isForgot.value = false;
    }
  }
  loading.value = false; 
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  width: 100vw;
  align-items: center;
  background: #1e1e1e; /* фон Art Studio */
}

.auth-img {
  background: url("@/assets/img/auth2.webp") center center no-repeat;
  background-size: cover;
  width: 70%;
  height: 100vh;
}

.auth-img::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    rgba(30, 30, 30, 0.1) 0%,
    rgba(30, 30, 30, 0.3) 30%,
    rgba(30, 30, 30, 0.8) 60%,
    rgba(30, 30, 30, 1) 100%
  );
}

.auth-login-form {
  width: 30%;
  display: flex;
  justify-content: center;
}

.auth-card {
  width: 350px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(224, 122, 95, 0.2);
  position: relative;
}

/* Эффект свечения по краям */
.auth-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, 
    rgba(224, 122, 95, 0.2), 
    rgba(244, 162, 97, 0.1), 
    rgba(224, 122, 95, 0.2)
  );
  border-radius: 12px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.auth-card:hover::after {
  opacity: 1;
}

.auth-footer {
  margin-top: 16px;
  text-align: center;
}

.auth-footer a {
  color: #e07a5f;
  cursor: pointer;
  transition: 0.3s;
}

.auth-footer a:hover {
  color: #c9644d;
}
</style>
