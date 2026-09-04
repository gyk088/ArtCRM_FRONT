<template>
  <div class="auth-page">
    <div class="auth-img">
      <div class="auth-img-overlay">
        <div class="auth-img-brand">
          <div class="brand-badge">
            <FormatPainterOutlined />
          </div>
          <span class="brand-word">ART CRM</span>
        </div>
        <p class="auth-img-tagline">Пространство для управления вашим творчеством</p>
      </div>
    </div>

    <div class="auth-login-form">
      <div class="auth-card">
        <div class="auth-card-logo">
          <div class="brand-badge">
            <FormatPainterOutlined />
          </div>
          <span class="brand-word">ART CRM</span>
        </div>

        <h2 class="auth-title">{{ titleByMode[mode] }}</h2>
        <p class="auth-subtitle">{{ subtitleByMode[mode] }}</p>

        <a-form layout="vertical" :model="form" @finish="onSubmit" class="auth-form">
          <template v-if="mode === 'login'">
            <!-- ЛОГИН -->
            <a-form-item
              label="Email"
              name="email"
              :rules="[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]"
            >
              <a-input v-model:value="form.email" placeholder="you@example.com" class="auth-input">
                <template #prefix><MailOutlined /></template>
              </a-input>
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
                class="auth-input"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>

            <a-button type="primary" html-type="submit" block :loading="loading" class="auth-submit-btn">
              Войти
            </a-button>

            <div class="auth-footer">
              <a @click="setMode('forgot')">Забыли пароль?</a>
              <span class="auth-footer-sep">·</span>
              <a @click="setMode('register')">Создать аккаунт</a>
            </div>
          </template>

          <template v-else-if="mode === 'register'">
            <!-- РЕГИСТРАЦИЯ -->
            <div class="field-row">
              <a-form-item label="Имя" name="name" class="field-half">
                <a-input v-model:value="form.name" placeholder="Иван" class="auth-input">
                  <template #prefix><UserOutlined /></template>
                </a-input>
              </a-form-item>

              <a-form-item label="Фамилия" name="surname" class="field-half">
                <a-input v-model:value="form.surname" placeholder="Иванов" class="auth-input" />
              </a-form-item>
            </div>

            <a-form-item
              label="Email"
              name="regEmail"
              :rules="[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]"
            >
              <a-input v-model:value="form.regEmail" placeholder="you@example.com" class="auth-input">
                <template #prefix><MailOutlined /></template>
              </a-input>
            </a-form-item>

            <a-form-item
              label="Пароль"
              name="regPassword"
              :rules="[
                { required: true, message: 'Введите пароль' },
                { min: 6, message: 'Минимум 6 символов' },
              ]"
            >
              <a-input-password
                v-model:value="form.regPassword"
                placeholder="Минимум 6 символов"
                class="auth-input"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>

            <a-form-item
              label="Повторите пароль"
              name="regPasswordConfirm"
              :rules="[
                { required: true, message: 'Повторите пароль' },
                { validator: validatePasswordConfirm },
              ]"
            >
              <a-input-password
                v-model:value="form.regPasswordConfirm"
                placeholder="Ещё раз пароль"
                class="auth-input"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>

            <a-button type="primary" html-type="submit" block :loading="loading" class="auth-submit-btn">
              Зарегистрироваться
            </a-button>

            <div class="auth-footer">
              <a @click="setMode('login')">Уже есть аккаунт? Войти</a>
            </div>
          </template>

          <template v-else-if="mode === 'forgot'">
            <!-- ВОССТАНОВЛЕНИЕ ПАРОЛЯ -->
            <a-form-item
              label="Email"
              name="resetEmail"
              :rules="[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]"
            >
              <a-input v-model:value="form.resetEmail" placeholder="you@example.com" class="auth-input">
                <template #prefix><MailOutlined /></template>
              </a-input>
            </a-form-item>

            <a-button type="primary" html-type="submit" block :loading="loading" class="auth-submit-btn">
              Отправить инструкцию
            </a-button>

            <div class="auth-footer">
              <a @click="setMode('login')">Вернуться к входу</a>
            </div>
          </template>

          <template v-else-if="mode === 'reset'">
            <!-- НОВЫЙ ПАРОЛЬ ПО ССЫЛКЕ ИЗ ПИСЬМА -->
            <a-form-item
              label="Новый пароль"
              name="newPassword"
              :rules="[
                { required: true, message: 'Введите новый пароль' },
                { min: 6, message: 'Минимум 6 символов' },
              ]"
            >
              <a-input-password
                v-model:value="form.newPassword"
                placeholder="Минимум 6 символов"
                class="auth-input"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>

            <a-form-item
              label="Повторите пароль"
              name="newPasswordConfirm"
              :rules="[
                { required: true, message: 'Повторите пароль' },
                { validator: validateNewPasswordConfirm },
              ]"
            >
              <a-input-password
                v-model:value="form.newPasswordConfirm"
                placeholder="Ещё раз пароль"
                class="auth-input"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>

            <a-button type="primary" html-type="submit" block :loading="loading" class="auth-submit-btn">
              Сохранить новый пароль
            </a-button>

            <div class="auth-footer">
              <a @click="setMode('login')">Вернуться к входу</a>
            </div>
          </template>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from '@/stores/auth'
import { MailOutlined, LockOutlined, UserOutlined, FormatPainterOutlined } from "@ant-design/icons-vue";

const route = useRoute();
const router = useRouter();
// 'login' | 'register' | 'forgot' | 'reset'
// Если в ссылке есть ?token=... (переход из письма) — сразу открываем форму нового пароля
const resetToken = typeof route.query.token === "string" ? route.query.token : null;
const mode = ref(resetToken ? "reset" : "login");
const loading = ref(false);
const authStore = useAuth();

const titleByMode = {
  login: "Вход в систему",
  register: "Создать аккаунт",
  forgot: "Восстановление пароля",
  reset: "Новый пароль",
};

const subtitleByMode = {
  login: "Рады видеть вас снова",
  register: "Пара минут — и рабочее пространство готово",
  forgot: "Укажите email — пришлём инструкцию для сброса пароля",
  reset: "Придумайте новый пароль для входа",
};

const form = reactive({
  email: "",
  password: "",
  name: "",
  surname: "",
  regEmail: "",
  regPassword: "",
  regPasswordConfirm: "",
  resetEmail: "",
  newPassword: "",
  newPasswordConfirm: "",
});

function setMode(next) {
  mode.value = next;
}

const validatePasswordConfirm = async (_rule, value) => {
  if (value && value !== form.regPassword) {
    return Promise.reject("Пароли не совпадают");
  }
  return Promise.resolve();
};

const validateNewPasswordConfirm = async (_rule, value) => {
  if (value && value !== form.newPassword) {
    return Promise.reject("Пароли не совпадают");
  }
  return Promise.resolve();
};

const onSubmit = async () => {
  loading.value = true;

  if (mode.value === "login") {
    const success = await authStore.login(form.email, form.password);
    if (success) {
      message.success("Добро пожаловать!");
      router.push("/home");
    } else {
      message.error("Неверный email или пароль");
    }
  } else if (mode.value === "register") {
    const success = await authStore.register({
      name: form.name,
      surname: form.surname,
      email: form.regEmail,
      password: form.regPassword,
    });
    if (success) {
      message.success("Аккаунт создан!");
      router.push("/home");
    }
  } else if (mode.value === "forgot") {
    const success = await authStore.requestPasswordReset(form.resetEmail);
    if (success) {
      message.success(`Если такой email зарегистрирован — на него отправлена ссылка для восстановления`);
      setMode("login");
    }
  } else if (mode.value === "reset") {
    const success = await authStore.resetPassword(resetToken, form.newPassword);
    if (success) {
      message.success("Пароль обновлён, теперь можно войти");
      router.replace({ path: "/auth" });
      setMode("login");
    }
  }

  loading.value = false;
};
</script>

<style scoped>

.auth-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --accent-tint: rgba(138, 109, 47, 0.1);
  --border: rgba(0, 0, 0, 0.1);

  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  background: #16140f;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* === Левая колонка — изображение === */
.auth-img {
  position: relative;
  width: 60%;
  height: 100vh;
  background: url("@/assets/img/auth2.webp") center center no-repeat;
  background-size: cover;
}

.auth-img-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 56px;
  background:
    linear-gradient(
      180deg,
      rgba(15, 14, 11, 0) 0%,
      rgba(15, 14, 11, 0.55) 55%,
      rgba(15, 14, 11, 0.95) 100%
    ),
    linear-gradient(
      100deg,
      rgba(15, 14, 11, 0.3) 0%,
      rgba(15, 14, 11, 0.45) 40%,
      rgba(15, 14, 11, 0.88) 85%,
      rgba(15, 14, 11, 0.95) 100%
    );
}

.auth-img-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.auth-img-tagline {
  max-width: 420px;
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  line-height: 1.6;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.brand-badge {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--accent);
  color: #fff;
}

.brand-word {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 24px;
  letter-spacing: 0.08em;
  color: #fff;
}

.auth-img-brand .brand-word {
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
}

.auth-img-brand .brand-badge {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

/* === Правая колонка — форма === */
.auth-login-form {
  width: 40%;
  display: flex;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  padding: 36px 32px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
}

.auth-card-logo {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.auth-card-logo .brand-word {
  color: var(--text-title);
}

.auth-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 6px;
}

.auth-subtitle {
  font-size: 13px;
  color: var(--text-faint);
  margin: 0 0 28px;
}

.auth-form :deep(.ant-form-item-label > label) {
  color: var(--text-muted);
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-row .field-half {
  flex: 1;
  min-width: 0;
}

.auth-input {
  border-color: var(--border);
  background: var(--bg-elevated);
}

.auth-input :deep(.anticon) {
  color: var(--text-faint);
}

.auth-input:hover,
.auth-input:focus-within {
  border-color: var(--accent);
}

.auth-submit-btn {
  margin-top: 4px;
  height: 40px;
  background: var(--accent);
  border-color: var(--accent);
  font-weight: 500;
}

.auth-submit-btn:hover {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.auth-footer {
  margin-top: 18px;
  text-align: center;
}

.auth-footer a {
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.auth-footer a:hover {
  color: var(--accent-strong);
}

.auth-footer-sep {
  margin: 0 6px;
  color: var(--text-faint);
}

/* === Адаптация для маленьких экранов === */
@media (max-width: 900px) {
  .auth-img {
    display: none;
  }

  .auth-login-form {
    width: 100%;
  }

  .auth-card-logo {
    display: flex;
  }
}
</style>
