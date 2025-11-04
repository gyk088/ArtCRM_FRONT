<template>
  <div class="auth-page">
    <div class="auth-img"></div>
    <div class="auth-login-form">
      <a-card
        class="auth-card"
        :title="isForgot ? 'Восстановление пароля' : 'Вход в систему'"
      >
        <a-form layout="vertical" @finish="onSubmit">
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

            <a-button type="primary" html-type="submit" block>Войти</a-button>

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

            <a-button type="primary" html-type="submit" block
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

const router = useRouter();
const isForgot = ref(false);

const form = reactive({
  email: "",
  password: "",
  resetEmail: "",
});

const onSubmit = () => {
  if (!isForgot.value) {
    // --- ЛОГИН ---
    if (form.email === "test@example.com" && form.password === "1234") {
      message.success("Добро пожаловать!");
      router.push("/");
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
  background: url("@/assets/img/auth.webp") center center no-repeat;
  background-size: cover;
  width: 70%;
  height: 100vh;
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
