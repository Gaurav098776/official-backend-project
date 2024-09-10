// Imports
import * as moment from 'moment';
import { Injectable } from '@nestjs/common';
import { shortMonth } from 'src/constants/objects';
import { kGlobalTrail } from 'src/constants/strings';
import { TypeService } from './type.service';
import { isArray, isString } from 'class-validator';

type FormatTypes = 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY';
const numberRegExp = new RegExp('^[0-9]');
const months: string[] = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sept',
  'oct',
  'nov',
  'dec',
];
@Injectable()
export class DateService {
  constructor(private readonly typeService: TypeService) {}
  getGlobalDate(experimentDate: Date) {
    try {
      const currentDate = new Date(experimentDate);
      currentDate.setMinutes(currentDate.getMinutes() + 330);
      const currentStatic =
        currentDate.toJSON().substring(0, 10) + 'T10:00:00.000Z';

      return new Date(currentStatic);
    } catch (error) {
      return experimentDate;
    }
  }

  utcDateRange(minDate: Date, maxDate?: Date) {
    if (!maxDate) maxDate = minDate;
    const date1 = typeof minDate == 'string' ? new Date(minDate) : minDate;
    date1.setDate(date1.getDate() - 1);
    date1.setHours(23);
    date1.setMinutes(60);
    date1.setSeconds(0);

    const date2 = typeof minDate == 'string' ? new Date(maxDate) : maxDate;
    date2.setHours(23);
    date2.setMinutes(60);
    date2.setSeconds(0);

    return {
      minRange: date1,
      maxRange: date2,
    };
  }

  unixDateRange(minDate: Date, maxDate: Date) {
    const date1 = typeof minDate == 'string' ? new Date(minDate) : minDate;
    date1.setDate(date1.getDate() - 1);
    date1.setHours(23);
    date1.setMinutes(60);
    date1.setSeconds(0);

    const date2 = typeof minDate == 'string' ? new Date(maxDate) : maxDate;
    date2.setHours(23);
    date2.setMinutes(60);
    date2.setSeconds(0);

    return {
      minRange: Math.floor(date1.getTime() / 1000),
      maxRange: Math.floor(date2.getTime() / 1000),
    };
  }

  dateToReadableFormat(targetDate: Date, format: FormatTypes = 'DD-MM-YYYY') {
    if (typeof targetDate == 'string') targetDate = new Date(targetDate);
    const jsonStr = targetDate.toJSON();

    const hours = targetDate.getHours();
    const minutes = targetDate.getMinutes();
    const dd = jsonStr.substr(8, 2);
    const mm = jsonStr.substr(4, 4);
    const yyyy = jsonStr.substr(0, 4);
    let readableStr =
      format == 'MM-DD-YYYY'
        ? mm + dd + yyyy
        : format == 'YYYY-MM-DD'
        ? yyyy + mm + dd
        : dd + mm + yyyy;
    if (format == 'DD/MM/YYYY') readableStr = readableStr.replace(/-/g, '/');

    const finalizedData = {
      meridiem: hours >= 12 ? 'PM' : 'AM',
      hours: `${
        hours <= 9
          ? '0' + hours
          : hours > 12
          ? hours - 12 <= 9
            ? '0' + (hours - 12)
            : hours - 12
          : hours
      }`,
      minutes: `${minutes <= 9 ? '0' + minutes : minutes}`,
      readableStr,
    };
    return finalizedData;
  }

  // 2024-02-22T10:00:00.000Z -> 03:30 PM to 4:30 PM (1 Hour Range)
  readableTimeWithRange(date: Date) {
    const result = this.dateToReadableFormat(date);
    var meridiem1 = result.meridiem;
    if (result.hours >= '11' && result.meridiem == 'AM') meridiem1 = 'PM';
    if (result.hours >= '11' && result.meridiem == 'PM') meridiem1 = 'AM';
    const nextHour = (+result.hours + 1).toString().padStart(2, '0');
    const hourRange = `${result.hours}:${result.minutes} ${result.meridiem} to ${nextHour}:${result.minutes} ${meridiem1}`;
    return hourRange;
  }

  readableStrToDate(dateStr: string, format: FormatTypes = 'DD-MM-YYYY') {
    if (format === 'DD-MM-YYYY') {
      const spans = dateStr.split('-');
      return this.getGlobalDate(
        new Date(`${spans[2]}-${spans[1]}-${spans[0]}`),
      );
    }
  }

  unixToReadableFormat(time: number) {
    const timeInMs = time * 1000;
    const targetDate = new Date(timeInMs);
    return this.dateToReadableFormat(targetDate);
  }

  // Returns first and last date of month
  getMonthRange(targetDate: Date) {
    if (typeof targetDate == 'string') targetDate = new Date(targetDate);
    let lastDate;

    const dates = [28, 29, 30, 31, 32];

    let tempDate = new Date(targetDate);
    for (let index = 0; index < dates.length; index++) {
      try {
        const date = dates[index];
        targetDate.setDate(date);

        if (targetDate.getMonth() != tempDate.getMonth()) {
          lastDate = new Date(tempDate);
          break;
        }

        tempDate = new Date(targetDate);
      } catch (error) {}
    }

    const firstDate = new Date(lastDate);
    firstDate.setDate(1);
    return { firstDate, lastDate };
  }

  anyToDateStr(target: any) {
    if (typeof target != 'string') return target;

    // DD/MM/YYYY
    const pattern01 = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    const pattern02 = /(\d{2}) (\w{3}) (\d{4})/;
    if (pattern01.test(target)) {
      const spans = target.split('/');

      return `${spans[2]}-${spans[1]}-${spans[0]}${kGlobalTrail}`;
    } else if (pattern02.test(target)) {
      const [, day, monthAbbr, year] = pattern02.exec(target);
      const monthNumeric = (
        '0' +
        (shortMonth.indexOf(monthAbbr.toUpperCase()) + 1)
      ).slice(-2);
      const formattedDateString = `${year}-${monthNumeric}-${day}${kGlobalTrail}`;
      return formattedDateString;
    }
  }

  anyToDate(date: any): Date {
    try {
      if (isString(date)) {
        // FORMAT DD/MM/YYYY || DD-MM-YYYY
        if (date.length === 10) {
          if (
            date.includes('/') ||
            date.includes('-') ||
            date.includes(' ') ||
            date.includes('.')
          ) {
            const formats: string[] = date.includes('/')
              ? date.split('/')
              : date.includes('-')
              ? date.split('-')
              : date.includes('.')
              ? date.split('.')
              : date.split(' ');
            if (formats.length === 3) {
              const momentDate = this.getStringToMomentDate(
                formats[0],
                formats[1],
                formats[2],
              );
              const actualDate = this.momentToDate(momentDate);
              return actualDate;
            }
          }
        }
        // DD-MMM-YY
        else if (date.length === 9) {
          if (date.includes('-')) {
            const formats: string[] = date.split('-');
            if (formats.length === 3) {
              const dateFormat = formats[0];
              const monthFormat = formats[1];
              const yearFormat = formats[2];
              const momentDate = moment(
                dateFormat + '-' + monthFormat + '-' + yearFormat,
                'DD-MMM-YYYY',
              );
              const actualDate = this.momentToDate(momentDate);
              return actualDate;
            }
          }
        }
        //FORMAT DD MMM YYYY || DD-MM-YYYY
        else if (date.length === 11) {
          if (date.includes(' ') || date.includes('-')) {
            const formats: string[] = date.includes(' ')
              ? date.split(' ')
              : date.split('-');
            if (formats.length === 3) {
              const momentDate = this.getStringToMomentDate(
                formats[0],
                formats[1],
                formats[2],
              );
              const actualDate = this.momentToDate(momentDate);
              return actualDate;
            }
          } else {
            const momentDate = this.getStringToMomentDate(
              date.substring(0, 2),
              date.substring(3, 6),
              date.substring(7, 11),
            );
            const actualDate = this.momentToDate(momentDate);
            return actualDate;
          }
        } else if (date.length === 17 && date.includes('th')) {
          const targetString = date.replace(/th/g, '').replace(/,/g, '');
          const trimmedString: string[] = targetString.split(' ');
          if (trimmedString.length === 3) {
            const dateFormat = trimmedString[0];
            const monthFormat = trimmedString[1].substring(0, 3);
            const yearFormat = trimmedString[2];
            const momentDate = moment(
              dateFormat + '-' + monthFormat + '-' + yearFormat,
              'DD-MMM-YYYY',
            );
            const actualDate = this.momentToDate(momentDate);
            return actualDate;
          } else return null;
        } else if (date.includes('  ')) {
          const possiblesDates: string[] = date.split(' ');
          const trimmedDates: string[] = [];
          possiblesDates.forEach((element) => {
            if (element != '') trimmedDates.push(element);
          });
          if (trimmedDates.length === 2) {
            const dateFormat = '01';
            const monthFormat = trimmedDates[0];
            const yearFormat = trimmedDates[1];
            const momentDate = moment(
              dateFormat + '-' + monthFormat + '-' + yearFormat,
              'DD-MMM-YYYY',
            );
            const actualDate = this.momentToDate(momentDate);
            return actualDate;
          }
        }
      } else if (isArray) {
        //Format [Month, Year]
        if (date.length === 2 && !date[1].includes(',') && date[1].lengh < 15) {
          //Sometimes we are getting -January instead of January
          let firstElement = '';
          if (date[0].includes('-'))
            firstElement = date[0].replace(/-/g, '').substring(0, 3);
          else firstElement = date[0].substring(0, 3);
          const dateFormat = '01';
          const monthFormat = firstElement;
          const yearFormat = date[1];
          const momentDate = moment(
            dateFormat + '-' + monthFormat + '-' + yearFormat,
            'DD-MMM-YYYY',
          );
          const actualDate = this.momentToDate(momentDate);
          return actualDate;
        }
        //FORMAT [xyz, MMM,YYYY]
        else if (
          date.length === 2 &&
          date[1].includes(',') &&
          date[1].length === 8 &&
          date[1].includes('20')
        ) {
          const splittedSpans: string[] = date[1].split(',');
          const dateFormat = '01';
          const monthFormat = splittedSpans[0].substring(0, 3);
          const yearFormat = splittedSpans[1];
          const momentDate = moment(
            dateFormat + '-' + monthFormat + '-' + yearFormat,
            'DD-MMM-YYYY',
          );
          const actualDate = this.momentToDate(momentDate);
          return actualDate;
        }
        //Format [MMM - YYYY]
        else if (date.length === 1) {
          const dateFormat = '01';
          const monthFormat = date[0].substring(0, 3);
          const yearFormat = date[0].substring(
            date[0].length - 4,
            date[0].length,
          );
          const momentDate = moment(
            dateFormat + '-' + monthFormat + '-' + yearFormat,
            'DD-MMM-YYYY',
          );
          const actualDate = this.momentToDate(momentDate);
          return actualDate;
        } else {
          const trimmedSpans: string[] = [];
          date.forEach((element) => {
            if (
              ((element.length === 2 || element.length === 4) &&
                numberRegExp.test(element) &&
                element.includes('20')) ||
              (element.length > 2 && this.isMonthWord(element))
            )
              trimmedSpans.push(element);
          });
          if (trimmedSpans.length === 2) {
            //Sometimes we are getting -January instead of January
            let firstElement = '';
            if (trimmedSpans[0].includes('-'))
              firstElement = trimmedSpans[0].replace(/-/g, '').substring(0, 3);
            else firstElement = trimmedSpans[0].substring(0, 3);
            const dateFormat = '01';
            const monthFormat = firstElement;
            let yearFormat;
            if (trimmedSpans[0].includes('20')) {
              yearFormat = trimmedSpans[0].substring(
                trimmedSpans[0].length - 4,
                trimmedSpans[0].length,
              );
            } else yearFormat = trimmedSpans[1];
            const momentDate = moment(
              dateFormat + '-' + monthFormat + '-' + yearFormat,
              'DD-MMM-YYYY',
            );
            const actualDate = this.momentToDate(momentDate);
            return actualDate;
          } else if (trimmedSpans.length === 1) {
            const eligibleSpans: string[] = trimmedSpans[0].split(' ');
            if (eligibleSpans.length > 1) {
              const finalizedSpans: string[] = [];
              eligibleSpans.forEach((element) => {
                if (
                  this.incluesInArray(element, months) ||
                  ((element.length == 2 || element.length == 4) &&
                    element.includes('20'))
                )
                  finalizedSpans.push(element);
              });
              if (finalizedSpans.length === 2) {
                const monthFormat: string = finalizedSpans[0].substring(0, 3);
                const yearFormat: string = finalizedSpans[1];
                const momentDate = moment(
                  '01' + '-' + monthFormat + '-' + yearFormat,
                  'DD-MMM-YYYY',
                );
                const actualDate = this.momentToDate(momentDate);
                return actualDate;
              } else if (finalizedSpans.length === 1) {
                //FORMAT [MMM,YYYY]
                let formettedSpans: string[] = [];
                if (finalizedSpans[0].includes(','))
                  formettedSpans = finalizedSpans[0].split(',');
                if (formettedSpans.length === 2) {
                  const monthFormat: string = formettedSpans[0].substring(0, 3);
                  const yearFormat: string = formettedSpans[1];
                  const momentDate = moment(
                    '01' + '-' + monthFormat + '-' + yearFormat,
                    'DD-MMM-YYYY',
                  );
                  const actualDate = this.momentToDate(momentDate);
                  return actualDate;
                }
              }
            }
          } else {
            const remainingSpans: string[] = [];
            date.forEach((element) => {
              const text: string = element;
              if (text.includes('/')) remainingSpans.push(element);
            });
            if (remainingSpans.length >= 0) {
              for (let index = 0; index < remainingSpans.length; index++) {
                const splittedSpans: string[] =
                  remainingSpans[index].split('/');
                if (splittedSpans.length === 3) {
                  const momentDate = moment(
                    '01' + '-' + splittedSpans[1] + '-' + splittedSpans[2],
                    'DD-MMM-YYYY',
                  );
                  const actualDate = this.momentToDate(momentDate);
                  return actualDate;
                }
              }
              return null;
            }
          }
        }
      } else return null;
    } catch (error) {
      return null;
    }
  }

  getStringToMomentDate(
    date: string,
    month: string,
    year: string,
  ): moment.Moment {
    try {
      let monthFormat = 'MMM';
      if (numberRegExp.test(month)) monthFormat = 'MM';
      return moment(
        (date.length === 1 ? '0' + date : date) +
          '-' +
          month.toUpperCase() +
          '-' +
          year,
        'DD-' + monthFormat + '-YYYY',
      );
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  private momentToDate(momentDate: moment.Moment): Date {
    try {
      const actualDate: Date = new Date();
      actualDate.setFullYear(momentDate.toObject().years);
      actualDate.setMonth(momentDate.toObject().months);
      actualDate.setDate(momentDate.toObject().date);
      actualDate.setUTCHours(momentDate.toObject().hours);
      if (actualDate.toString() === 'Invalid Date') return null;
      else return actualDate;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  isMonthWord(targetString: string): boolean {
    try {
      return this.incluesInArray(targetString, months);
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  incluesInArray(content: string, array: string[]): boolean {
    try {
      let result = false;
      array.forEach((element) => {
        if (content.includes(element) || content === element) result = true;
      });
      return result;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  // 2024-01-22T10:05:21.665Z -> 22 Jan 2024 03:35 PM
  readableDate(dateString: string) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours();
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const hour = `${
      hours <= 9
        ? '0' + hours
        : hours > 12
        ? hours - 12 < 10
          ? '0' + (hours - 12)
          : hours - 12
        : hours
    }`;
    const minute = date.getMinutes();
    const minutes = `${minute < 10 ? '0' + minute : minute}`;
    const formattedDate = `${day} ${month} ${year} ${hour}:${minutes} ${meridiem}`;
    return formattedDate;
  }

  convertIntoWeekGroups(date: Date) {
    // Get the day of the month (1-31)
    const day = date.getDate();

    // Get the day of the week (0-6, where 0 is Sunday and 6 is Saturday)
    const dayOfWeek = date.getDay();

    // Get the first day of the month
    const firstDayOfMonth = new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ).getDay();

    // Calculate the week number
    const weekNumber = Math.ceil((day + firstDayOfMonth) / 7);

    // Calculate the start of the week (Sunday)
    let startOfWeek = new Date(
      date.getFullYear(),
      date.getMonth(),
      day - dayOfWeek,
    );
    if (startOfWeek.getMonth() !== date.getMonth()) {
      startOfWeek = new Date(date.getFullYear(), date.getMonth(), 1);
    }

    // Calculate the end of the week (Saturday)
    let endOfWeek = new Date(
      date.getFullYear(),
      date.getMonth(),
      day + (6 - dayOfWeek),
    );
    if (endOfWeek.getMonth() !== date.getMonth()) {
      endOfWeek = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
    endOfWeek = this.getGlobalDate(endOfWeek);

    // Calculate the number of days in the week
    const daysInWeek = this.typeService.differenceInDays(
      endOfWeek,
      startOfWeek,
    );

    // Calculate the last day of the month
    const lastDayOfMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();

    // Calculate the week number for the last day of the month
    const totalWeeks = Math.ceil((lastDayOfMonth + firstDayOfMonth) / 7);

    const weeks = [];
    let currentWeekDays = 0;

    for (let dayOfMonth = 1; dayOfMonth <= lastDayOfMonth; dayOfMonth++) {
      const currentDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        dayOfMonth,
      );
      const currentDayOfWeek = currentDate.getDay();

      // Count the current day in the week
      currentWeekDays++;

      // If it's the last day of the week (Saturday) or the last day of the month, push the week count
      if (currentDayOfWeek === 6 || dayOfMonth === lastDayOfMonth) {
        weeks.push({
          weekNumber: weeks.length + 1,
          totalDays: currentWeekDays,
        });
        currentWeekDays = 0; // Reset for the next week
      }
    }

    return {
      weekGroup: `week${weekNumber}`,
      totalDays: daysInWeek + 1,
      totalWeeks,
      weeks,
    };
  }
}
