import { notification } from 'ant-design-vue';

const SERVER_ERROR = {
  "duplicate key value violates unique constraint \"my_user_active_phone_key\"": 'такой номер телефона существует',
  "duplicate key value violates unique constraint \"my_user_active_email_key\"": 'такой номер eamil существует',
  "no such phone": 'неверный номер телефона',
  "no such user": 'пользователь с таким номером не найден',
  "such login exists": 'такой логин уже существует',
  "role is invalid": 'у вас нет доступа в админ панель обратитесь к администратору',
  "password is null": 'необходимо добавить пароль в мобильном приложении в разделе Редактирование профиля',
  "email is invalid": 'необходимо добавить email в мобильном приложении в разделе Редактирование профиля',
  "password is invalid": "неверный пароль, вы можете поменять пароль в мобильном приложении в разделе Редактирование профиля"
}

export const notifyServerError = (serverMessage, duration) => {
  notification.error({
    message: 'Ошибка сервера',
    description: SERVER_ERROR[serverMessage] || serverMessage,
    duration: duration ? duration : 5
  });
}

export const notifyError = (msg, duration) => {
  notification.error({
    message: 'Ошибка',
    description: msg,
    duration: duration ? duration : 5
  });
}

export const notifyServerSuccess = (title, msg, duration) => {
  notification.success({
    message: title,
    description: msg,
    duration: duration ? duration : 5
  });
}