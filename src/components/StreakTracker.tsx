import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Flame, Award, Calendar, CheckCircle2, Zap, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StreakTracker: React.FC = () => {
  const { streak, logPagesRead, user } = useApp();
  const [inputPages, setInputPages] = useState<number | ''>('');
  const [showCelebration, setShowCelebration] = useState(false);

  const dailyGoal = user?.dailyGoal || 30;
  const todayStr = new Date().toISOString().split('T')[0];
  const pagesReadToday = streak.activityHistory[todayStr] || 0;
  
  const progressPercent = Math.min(100, Math.round((pagesReadToday / dailyGoal) * 100));
  const isGoalAchieved = pagesReadToday >= dailyGoal;

  // Render a monthly grid of calendar boxes
  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of month and total days
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const days: React.ReactNode[] = [];
    
    // Empty cells before start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-transparent" />);
    }
    
    // Days of month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const pagesRead = streak.activityHistory[dateStr] || 0;
      
      const isToday = d === today.getDate();
      const hasRead = pagesRead > 0;
      
      const dateObj = new Date(currentYear, currentMonth, d);
      const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isPast = dateObj < compareToday;
      
      let bgStyle = 'bg-white text-brand-navy border border-brand-navy/10';
      if (hasRead) {
        bgStyle = 'bg-[#4ECDC4] text-brand-navy border-2 border-brand-navy font-black shadow-[2px_2px_0px_0px_var(--color-brand-navy)]';
      } else if (isPast) {
        bgStyle = 'bg-[#FFE66D] text-brand-navy border-2 border-brand-navy font-black shadow-[2px_2px_0px_0px_var(--color-brand-navy)]';
      } else if (isToday) {
        bgStyle = 'bg-brand-paper border-2 border-dashed border-brand-clay text-brand-navy font-bold';
      }

      days.push(
        <div 
          key={`day-${d}`} 
          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex flex-col items-center justify-center text-xs relative ${bgStyle}`}
          title={hasRead ? `Logged ${pagesRead} pages read on this date` : 'No reading logged on this date'}
        >
          <span>{d}</span>
          {hasRead && (
            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-navy" />
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-brand-navy/50">
          {dayLabels.map((lbl, idx) => (
            <div key={`${lbl}-${idx}`} className="h-6 flex items-center justify-center">{lbl}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days}
        </div>
      </div>
    );
  };

  const handleLogPages = (pages: number) => {
    if (pages <= 0) return;
    logPagesRead(pages);
    setInputPages('');
    
    if (pagesReadToday + pages >= dailyGoal && !isGoalAchieved) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }
  };

  // Badges lists for game goals
  const achievements = [
    {
      title: 'First Page',
      desc: 'Log page progress for the first time',
      unlocked: Object.keys(streak.activityHistory).length > 0,
      icon: '🌱',
    },
    {
      title: 'Goal Getter',
      desc: 'Achieve your daily page goal',
      unlocked: isGoalAchieved || Object.values(streak.activityHistory).some(v => v >= dailyGoal),
      icon: '🎯',
    },
    {
      title: 'Firestarter',
      desc: 'Reach a 3-day reading streak',
      unlocked: streak.currentStreak >= 3,
      icon: '🔥',
    },
    {
      title: 'Bibliophile',
      desc: 'Accumulate a 14-day longest streak',
      unlocked: streak.longestStreak >= 14,
      icon: '👑',
    }
  ];

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Celebration animation banner */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-3xl border-4 border-brand-navy bg-brand-sand p-4 text-center text-brand-navy shadow-[4px_4px_0px_0px_var(--color-brand-navy)] flex flex-col items-center justify-center space-y-2"
          >
            <Zap className="h-8 w-8 text-brand-clay fill-brand-clay animate-bounce" />
            <h3 className="text-lg font-extrabold">Daily Goal Complete! 🎉</h3>
            <p className="text-xs font-semibold max-w-md">
              Awesome job! You have logged {pagesReadToday} pages read today, conquering your daily goal of {dailyGoal} pages. Keep the flame burning!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left column: Gamified Streak and Ring Progress */}
        <div className="md:col-span-6 space-y-6">
          {/* Flame Card */}
          <div className="rounded-3xl border-4 border-brand-navy bg-brand-cream p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 bg-brand-clay/10 border-b-2 border-l-2 border-brand-navy rounded-bl-3xl">
              <Flame className="h-6 w-6 text-brand-clay animate-pulse" />
            </div>

            <h3 className="text-xs font-extrabold uppercase tracking-widest text-brand-navy/50">Reading Habit Streak</h3>
            
            <div className="flex items-center gap-5 mt-4">
              {/* Massive animated flame indicator */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-brand-clay/20 rounded-full blur-xl scale-125 animate-pulse" />
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="h-20 w-20 rounded-full border-4 border-brand-navy bg-brand-clay flex flex-col items-center justify-center text-white shadow-[4px_4px_0px_0px_var(--color-brand-navy)] z-10"
                >
                  <Flame className="h-8 w-8 fill-white text-white" />
                  <span className="text-xl font-black leading-none mt-1">{streak.currentStreak}</span>
                </motion.div>
              </div>

              <div>
                <h4 className="text-2xl font-black text-brand-navy">{streak.currentStreak} Days Active!</h4>
                <p className="text-xs font-semibold text-brand-navy/70 mt-1 leading-relaxed">
                  Your reading streak is alive! Log at least 1 page today to extend your streak.
                </p>
                <div className="flex gap-4 mt-3 text-[11px] font-bold uppercase text-brand-navy/60">
                  <p className="flex items-center gap-1"><Award className="h-4 w-4 text-brand-sand fill-brand-sand" /> Record: {streak.longestStreak} Days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Goal Progress Ring Bento Box */}
          <div className="rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] flex flex-col sm:flex-row items-center gap-5 justify-between">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-wider bg-brand-paper border border-brand-navy/20 px-2.5 py-0.5 rounded-full text-brand-navy">
                Today's Reading Target
              </span>
              <h4 className="text-lg font-black text-brand-navy">Daily Goal: {dailyGoal} Pages</h4>
              <p className="text-xs font-semibold text-brand-navy/60">
                Logged <span className="font-bold text-brand-clay">{pagesReadToday} pages</span> so far today.
              </p>
              
              {isGoalAchieved ? (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-brand-sage bg-brand-sage/10 border-2 border-brand-sage/30 px-3 py-1 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 stroke-[3]" /> Goal Achieved!
                </div>
              ) : (
                <p className="text-xs font-bold text-brand-clay/80 flex items-center gap-1 justify-center sm:justify-start">
                  <AlertCircle className="h-4 w-4" /> Just {dailyGoal - pagesReadToday} pages remaining!
                </p>
              )}
            </div>

            {/* SVG Progress Circle */}
            <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="stroke-brand-paper fill-transparent"
                  strokeWidth="10"
                />
                {/* Progress Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="stroke-brand-clay fill-transparent transition-all duration-500"
                  strokeWidth="10"
                  strokeDasharray={282}
                  strokeDashoffset={282 - (282 * progressPercent) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-black text-brand-navy leading-none">{progressPercent}%</span>
                <span className="text-[8px] font-bold uppercase text-brand-navy/40 tracking-wider">Done</span>
              </div>
            </div>
          </div>

          {/* Quick Page Logger Box */}
          <div className="rounded-3xl border-4 border-brand-navy bg-brand-paper p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-brand-clay" /> Log Reading Pages
            </h4>

            {/* Predefined values buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[5, 15, 30, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => handleLogPages(num)}
                  className="py-2.5 rounded-xl border-2 border-brand-navy bg-white hover:bg-brand-sand text-xs font-bold text-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                >
                  +{num}
                </button>
              ))}
            </div>

            {/* Manual Text field */}
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={inputPages}
                onChange={(e) => setInputPages(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Or log exact pages read..."
                className="flex-1 rounded-xl border-2 border-brand-navy bg-white px-3 py-2 text-xs font-bold text-brand-navy outline-none placeholder:text-brand-navy/35 focus:bg-brand-cream"
              />
              <button
                onClick={() => handleLogPages(Number(inputPages))}
                disabled={!inputPages || Number(inputPages) <= 0}
                className="px-5 py-2.5 rounded-xl border-2 border-brand-navy bg-brand-navy hover:bg-brand-navy/90 text-xs font-bold text-white shadow-[2px_2px_0px_0px_var(--color-brand-clay)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Log pages
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Activity Calendar & Game Badges */}
        <div className="md:col-span-6 space-y-6">
          {/* Calendar Display Box */}
          <div className="rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
            <div className="flex justify-between items-center border-b-2 border-brand-navy/10 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-clay" /> Habit Calendar
              </h4>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-navy/50">{currentMonthName} {new Date().getFullYear()}</span>
            </div>

            {renderCalendar()}

            <div className="flex gap-4 justify-center text-[10px] font-bold text-brand-navy/60 pt-2 border-t border-brand-navy/5">
              <div className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded-md bg-[#4ECDC4] border border-brand-navy" />
                <span>Reading Done (Green)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded-md bg-[#FFE66D] border border-brand-navy" />
                <span>Missed Day / Break (Yellow)</span>
              </div>
            </div>
          </div>

          {/* Gamified Achievements/Badges */}
          <div className="rounded-3xl border-4 border-brand-navy bg-brand-cream p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-brand-sand fill-brand-sand" /> Gamified Achievements
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((ach) => (
                <div 
                  key={ach.title}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                    ach.unlocked 
                      ? 'bg-white border-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)]' 
                      : 'bg-brand-paper/50 border-brand-navy/15 text-brand-navy/40 grayscale'
                  }`}
                >
                  <span className="text-2xl">{ach.icon}</span>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-brand-navy truncate leading-snug">{ach.title}</h5>
                    <p className="text-[10px] font-semibold text-brand-navy/60 leading-tight mt-0.5">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
