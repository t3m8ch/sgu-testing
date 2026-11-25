// The live NVS form reports the same error for all five input classes.
const rejectedLogin = /^Неверный логин или пароль\.?$/i;

export const negativeAuthCases = [
  {
    id: 'TA-02',
    title: 'неверный пароль',
    email: 'valid',
    password: 'wrong',
    error: rejectedLogin,
  },
  {
    id: 'TA-03',
    title: 'неизвестный email',
    email: 'unknown',
    password: 'wrong',
    error: rejectedLogin,
  },
  {
    id: 'TA-04',
    title: 'пустой email',
    email: 'empty',
    password: 'valid',
    error: rejectedLogin,
  },
  {
    id: 'TA-05',
    title: 'пустой пароль',
    email: 'valid',
    password: 'empty',
    error: rejectedLogin,
  },
  {
    id: 'TA-06',
    title: 'неверный формат email',
    email: 'malformed',
    password: 'wrong',
    error: rejectedLogin,
  },
] as const;
