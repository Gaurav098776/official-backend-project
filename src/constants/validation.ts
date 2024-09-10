export const regEmail = (email) => {
  try {
    const reg = new RegExp(
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    );
    return email.match(reg) ? true : false;
  } catch (error) {
    return false;
  }
};

export const regPhone = (phone) => {
  try {
    const reg = new RegExp(/^\d{10}$/);
    return phone.toString().match(reg) ? true : false;
  } catch (error) {
    return false;
  }
};
export const regUUID = (uuid) => {
  try {
    const reg = new RegExp(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    return uuid.match(reg) ? true : false;
  } catch (error) {
    return false;
  }
};
export const regPassword = (password) => {
  try {
    const reg = new RegExp(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/i,
    );
    return password.match(reg) ? true : false;
  } catch (error) {
    return false;
  }
};

//#region  aadhaar check reg
const _d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const _p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export const regAadhaar = (data: string) => {
  let c = 0;
  for (var k = data.length - 1, i = 0; k >= 0; k--, i++) {
    const digit = data.charCodeAt(k) - 48;

    if (digit < 0 || digit > 9) {
      c = -1;
      break;
    }
    c = _d[c][_p[i % 8][digit]];
  }
  return c === 0;
};
//#endregion

export const regPanCard = (data) => {
  try {
    const reg = new RegExp(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/);
    return data.match(reg) ? true : false;
  } catch (error) {
    return false;
  }
};

export const validateTimeWithCurrent = (date, passTime) => {
  try {
    const currDate = new Date();
    const dueDate = new Date(date);
    let status = false;
    if (currDate.toDateString() == dueDate.toDateString()) {
      let [hours, time] = passTime.split(':');
      const dueTime = new Date().setHours(hours, time);
      const currHours = currDate.getHours();
      const currMinute = currDate.getMinutes();
      const currTime = new Date().setHours(currHours, currMinute);
      if (currTime <= dueTime) return (status = true);
      return status;
    }
    return status;
  } catch (error) {
    return false;
  }
};

export const regCertificateNo = (number) => {
  try {
    const reg = new RegExp(/^[A-Z]{2}-[A-Z]{2}[0-9]{14}[A-Z]{1}$/);
    return number.match(reg) ? true : false;
  } catch (error) {
    return false;
  }
};
