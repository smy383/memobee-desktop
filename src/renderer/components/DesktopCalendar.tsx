import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Schedule } from '../../shared/services/apiService';
import './DesktopCalendar.css';

interface DesktopCalendarProps {
  schedules: Schedule[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const DesktopCalendar: React.FC<DesktopCalendarProps> = ({
  schedules,
  selectedDate,
  onDateSelect
}) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Array<{
    date: string;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    scheduleCount: number;
    hasSchedules: boolean;
  }>>([]);

  // 카테고리별 색상 정의 (ScheduleView와 동일하게 통일)
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'work': return '#FFC107';
      case 'personal': return '#17A2B8';
      case 'appointment': return '#E83E8C';
      case 'meeting': return '#6F42C1';
      case 'other':
      default: return '#6C757D';
    }
  };

  // 달력 생성
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 해당 월의 첫 번째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 달력 시작일 (이전 달의 일부 포함)
    const startDay = new Date(firstDay);
    startDay.setDate(firstDay.getDate() - firstDay.getDay());
    
    // 달력 종료일 (다음 달의 일부 포함)
    const endDay = new Date(lastDay);
    endDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days: typeof calendarDays = [];
    const today = new Date();
    
    // 날짜별 일정 개수 계산
    const schedulesByDate: { [key: string]: Schedule[] } = {};
    schedules.forEach(schedule => {
      let dateKey = '';
      if (schedule.is_all_day && schedule.all_day_date) {
        dateKey = schedule.all_day_date;
      } else if (schedule.start_datetime) {
        dateKey = schedule.start_datetime.split('T')[0];
      }
      
      if (dateKey) {
        if (!schedulesByDate[dateKey]) {
          schedulesByDate[dateKey] = [];
        }
        schedulesByDate[dateKey].push(schedule);
      }
    });
    
    // 날짜별 데이터 생성
    for (let date = new Date(startDay); date <= endDay; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      const daySchedules = schedulesByDate[dateString] || [];
      
      days.push({
        date: dateString,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: dateString === selectedDate,
        scheduleCount: daySchedules.length,
        hasSchedules: daySchedules.length > 0
      });
    }
    
    setCalendarDays(days);
  }, [currentMonth, schedules, selectedDate]);

  // 이전/다음 달 이동
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // 오늘 날짜로 이동
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today.toISOString().split('T')[0]);
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (dateString: string) => {
    onDateSelect(dateString === selectedDate ? '' : dateString);
  };

  // 특정 날짜의 일정들 (텍스트로 표시용)
  const getScheduleItemsForDate = (dateString: string): JSX.Element[] => {
    const daySchedules = schedules.filter(schedule => {
      if (schedule.is_all_day && schedule.all_day_date) {
        return schedule.all_day_date === dateString;
      } else if (schedule.start_datetime) {
        return schedule.start_datetime.split('T')[0] === dateString;
      }
      return false;
    });

    // 최대 3개의 일정만 표시
    const schedulesToShow = daySchedules.slice(0, 3);
    const items: JSX.Element[] = [];

    schedulesToShow.forEach((schedule, index) => {
      items.push(
        <div
          key={`${schedule.id}-${index}`}
          className="schedule-item-mini"
          style={{ 
            backgroundColor: getCategoryColor(schedule.category),
            color: 'white'
          }}
          title={`${schedule.title} - ${formatScheduleTime(schedule)} - 카테고리: ${schedule.category}`}
        >
          {schedule.title.length > 8 ? schedule.title.substring(0, 8) + '...' : schedule.title}
        </div>
      );
    });

    // 4개 이상이면 더보기 표시
    if (daySchedules.length > 3) {
      items.push(
        <div
          key="more"
          className="schedule-item-more"
          title={`+${daySchedules.length - 3}${t('calendar.more_items')}`}
        >
          +{daySchedules.length - 3}
        </div>
      );
    }

    return items;
  };

  // 일정 시간 포맷팅 (툴팁용)
  const formatScheduleTime = (schedule: Schedule): string => {
    if (schedule.is_all_day) {
      return t('schedule.all_day');
    }
    if (schedule.start_datetime) {
      const date = new Date(schedule.start_datetime);
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    return '';
  };

  // 월 이름 번역
  const getMonthName = (monthIndex: number): string => {
    const monthKeys = [
      'calendar.months.january', 'calendar.months.february', 'calendar.months.march',
      'calendar.months.april', 'calendar.months.may', 'calendar.months.june',
      'calendar.months.july', 'calendar.months.august', 'calendar.months.september',
      'calendar.months.october', 'calendar.months.november', 'calendar.months.december'
    ];
    return t(monthKeys[monthIndex]);
  };

  // 요일 이름 번역
  const getDayNames = (): string[] => {
    return [
      t('calendar.days.sunday'), t('calendar.days.monday'), t('calendar.days.tuesday'),
      t('calendar.days.wednesday'), t('calendar.days.thursday'), t('calendar.days.friday'),
      t('calendar.days.saturday')
    ];
  };

  return (
    <div className="desktop-calendar">
      {/* 달력 헤더 */}
      <div className="calendar-header">
        <div className="month-navigation">
          <button onClick={() => navigateMonth('prev')}>‹</button>
          <div className="month-year">
            <h3>{currentMonth.getFullYear()}{t('calendar.year')} {getMonthName(currentMonth.getMonth())}</h3>
          </div>
          <button onClick={() => navigateMonth('next')}>›</button>
        </div>
        <button className="today-btn" onClick={goToToday}>
          {t('calendar.today')}
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="weekdays">
        {getDayNames().map((dayName, index) => (
          <div
            key={dayName}
            className={`weekday ${index === 0 ? 'sunday' : ''} ${index === 6 ? 'saturday' : ''}`}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* 달력 본체 */}
      <div className="calendar-grid">
        {calendarDays.map((dayData, index) => (
          <div
            key={`${dayData.date}-${index}`}
            className={`calendar-day ${
              !dayData.isCurrentMonth ? 'other-month' : ''
            } ${
              dayData.isToday ? 'today' : ''
            } ${
              dayData.isSelected ? 'selected' : ''
            } ${
              dayData.hasSchedules ? 'has-schedules' : ''
            }`}
            onClick={() => handleDateClick(dayData.date)}
          >
            <div className="day-number">{dayData.day}</div>
            {dayData.hasSchedules && (
              <div className="schedule-items">
                {getScheduleItemsForDate(dayData.date)}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default DesktopCalendar;