import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReadingStatus } from '../types';
import { BarChart2, PieChart, Tag, Award, Target, HelpCircle, ArrowRight, Star, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export const StatsDashboard: React.FC = () => {
  const { books, streak } = useApp();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // AI Wrap-up states
  const [wrapup, setWrapup] = useState<string | null>(null);
  const [isLoadingWrapup, setIsLoadingWrapup] = useState(false);
  const [wrapupError, setWrapupError] = useState('');

  const generateWrapup = async () => {
    setIsLoadingWrapup(true);
    setWrapupError('');
    setWrapup(null);

    try {
      const response = await fetch('/api/ai/monthly-wrapup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          books,
          streak,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to summon your AI Reading Mentor.');
      }

      const data = await response.json();
      setWrapup(data.wrapup || 'Your AI Mentor got distracted reading something else.');
    } catch (err: any) {
      setWrapupError(err.message || 'Failed to generate your personalized critique.');
    } finally {
      setIsLoadingWrapup(false);
    }
  };

  // Status Distribution Calculations
  const statusCounts = books.reduce((acc, book) => {
    acc[book.status] = (acc[book.status] || 0) + 1;
    return acc;
  }, {} as Record<ReadingStatus, number>);

  const totalBooks = books.length;
  const statuses: { key: ReadingStatus; label: string; color: string; desc: string }[] = [
    { key: 'reading', label: 'Currently Reading', color: '#FFE66D', desc: 'Active pages' },
    { key: 'read', label: 'Finished Read', color: '#4ECDC4', desc: 'Conquered shelf' },
    { key: 'TBR', label: 'To Be Read (TBR)', color: '#FF6B6B', desc: 'Future list' },
    { key: 'DNF', label: 'Did Not Finish (DNF)', color: '#2D2D2D', desc: 'On pause' }
  ];

  // Category Calculations
  const categoryCounts = books.reduce((acc, book) => {
    const cats = book.categories && book.categories.length > 0 ? book.categories : ['General'];
    cats.forEach(cat => {
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = (Object.entries(categoryCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Pages Read last 7 days calculations
  const getPastSevenDays = () => {
    const arr = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      arr.push({
        dateStr,
        label: dayLabel,
        pages: streak.activityHistory[dateStr] || 0
      });
    }
    return arr;
  };

  const chartData = getPastSevenDays();
  const maxPages = Math.max(...chartData.map(d => d.pages), 10); // fallback min height

  // Circular Doughnut calculations
  let accumulatedAngle = 0;
  const doughnutSegments = statuses.map((status) => {
    const count = statusCounts[status.key] || 0;
    const percent = totalBooks > 0 ? (count / totalBooks) * 100 : 0;
    const angle = totalBooks > 0 ? (count / totalBooks) * 360 : 0;
    
    // SVG circular arc calculations
    const radius = 35;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius; // ~219.9
    const strokeDasharray = `${circumference}`;
    const strokeDashoffset = circumference - (circumference * percent) / 100;
    
    const segmentOffset = accumulatedAngle;
    accumulatedAngle += angle;

    return {
      ...status,
      count,
      percent,
      strokeDasharray,
      strokeDashoffset,
      rotation: segmentOffset - 90 // align starting point to top
    };
  });

  // Calculate high level cards data
  const totalPagesReadEver = (Object.values(streak.activityHistory) as number[]).reduce((sum, val) => sum + val, 0);
  const completedBooksCount = books.filter(b => b.status === 'read').length;
  const favoriteGenre = sortedCategories[0]?.[0] || 'Fiction';

  return (
    <div className="space-y-6">
      {/* 🔮 Gemini AI Monthly Reading Mentor Critique Banner */}
      <div className="rounded-3xl border-4 border-brand-navy bg-gradient-to-br from-brand-paper to-brand-cream p-6 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] relative overflow-hidden">
        {/* Absolute cute backgrounds */}
        <div className="absolute right-4 bottom-4 text-brand-navy/5 text-8xl font-black select-none pointer-events-none">
          🔮
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-sm font-black text-brand-navy flex items-center gap-2">
              <span className="p-1.5 bg-brand-clay text-white rounded-xl text-[10px] uppercase font-black shrink-0 animate-pulse">AI Wrap-Up</span>
              Witty Reading Mentor Critique
            </h3>
            <p className="text-xs font-semibold text-brand-navy/70 leading-relaxed">
              Summon your affectionate, sassy AI reading companion to analyze your bookshelves, ratings, DNFs, and intensity trends. Receive a customized reading persona critique!
            </p>
          </div>

          <button
            onClick={generateWrapup}
            disabled={isLoadingWrapup}
            className="rounded-2xl border-2 border-brand-navy bg-brand-navy text-brand-sand px-5 py-3 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_var(--color-brand-clay)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-40 shrink-0 flex items-center gap-2 cursor-pointer"
          >
            {isLoadingWrapup ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-brand-sand border-t-transparent rounded-full" />
                Reading your mind...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 animate-bounce text-brand-sand" /> Generate My Critique
              </>
            )}
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoadingWrapup && (
          <div className="mt-4 p-6 rounded-2xl border-2 border-dashed border-brand-navy/20 bg-white/40 text-center animate-pulse">
            <p className="text-xs font-black text-brand-navy/60">Your AI mentor is analyzing your stats, laughing at your Did-Not-Finish counts, and preparing a witty retort...</p>
          </div>
        )}

        {wrapupError && (
          <div className="mt-4 p-4 rounded-2xl border-2 border-brand-navy bg-brand-cream text-center">
            <p className="text-xs font-bold text-brand-clay">{wrapupError}</p>
          </div>
        )}

        {/* Result wrapup text */}
        {wrapup && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-5 rounded-2xl border-2 border-brand-navy bg-white shadow-sm space-y-3 relative text-left"
          >
            <div className="absolute top-3 right-3 bg-brand-clay/10 text-brand-clay border border-brand-clay/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              Affectionate Critique
            </div>
            
            <div className="prose prose-sm max-w-none text-xs font-medium text-brand-navy/90 leading-relaxed space-y-2">
              <ReactMarkdown>{wrapup}</ReactMarkdown>
            </div>
            
            <div className="border-t border-brand-navy/10 pt-3 flex items-center justify-between text-[10px] font-bold text-brand-navy/40">
              <span>*Generated based on your live reading habit metrics*</span>
              <span>NovelNest AI Companion</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Visual Habit Metrics Overview Grid (Bento Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Books Catalogued', value: totalBooks, icon: '📚', desc: 'On your shelf' },
          { title: 'Finished Reads', value: completedBooksCount, icon: '🎓', desc: '100% completed' },
          { title: 'Total Pages Logged', value: totalPagesReadEver, icon: '⚡', desc: 'Reading energy' },
          { title: 'Primary Genre', value: favoriteGenre, icon: '🔥', desc: 'Most read category' }
        ].map((metric, i) => (
          <div key={i} className="rounded-2xl border-2 border-brand-navy bg-white p-4 shadow-[3px_3px_0px_0px_var(--color-brand-navy)] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-2xl">{metric.icon}</span>
              <span className="text-[9px] font-bold uppercase text-brand-navy/50 tracking-wider font-mono">Metric {i+1}</span>
            </div>
            <div className="mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 leading-none">{metric.title}</h4>
              <p className="text-xl font-black text-brand-navy mt-1.5 leading-none">{metric.value}</p>
              <p className="text-[10px] font-semibold text-brand-navy/50 mt-1">{metric.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Pages Logged Last 7 Days (Curved Bar Chart) */}
        <div className="md:col-span-7 rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
          <div className="flex justify-between items-center border-b-2 border-brand-navy/10 pb-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
              <BarChart2 className="h-4.5 w-4.5 text-brand-clay" /> Reading Intensity Trends
            </h4>
            <span className="text-[10px] font-black text-brand-navy/40 font-mono">Pages Logged Past 7 Days</span>
          </div>

          {/* Custom SVG Bar Chart */}
          <div className="relative pt-6">
            <svg viewBox="0 0 300 130" className="w-full h-auto overflow-visible">
              {/* Grid Lines */}
              <line x1="10" y1="20" x2="290" y2="20" className="stroke-brand-paper/50 stroke-[1.5] stroke-dasharray-[2,2]" />
              <line x1="10" y1="60" x2="290" y2="60" className="stroke-brand-paper/50 stroke-[1.5] stroke-dasharray-[2,2]" />
              <line x1="10" y1="100" x2="290" y2="100" className="stroke-brand-navy/10 stroke-[2]" />

              {chartData.map((day, idx) => {
                const barWidth = 24;
                const gap = 36;
                const x = 16 + idx * gap;
                
                // SVG Coordinates (y goes from top to bottom)
                const chartHeight = 80;
                const barHeight = (day.pages / maxPages) * chartHeight;
                const y = 100 - barHeight;

                const isHovered = hoveredBar === idx;

                return (
                  <g key={day.dateStr} className="cursor-pointer">
                    {/* Background hover bar track */}
                    <rect
                      x={x - 4}
                      y={10}
                      width={barWidth + 8}
                      height={100}
                      className="fill-transparent hover:fill-brand-paper/25 rounded-xl transition-colors"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />

                    {/* Active Page Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx="4"
                      className={`stroke-brand-navy stroke-2 transition-all ${
                        day.pages > 0 ? 'fill-brand-clay' : 'fill-brand-paper/40'
                      }`}
                    />

                    {/* Numeric Value Label on hover/always */}
                    {(isHovered || day.pages > 0) && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className="text-[9px] font-black font-mono fill-brand-navy"
                      >
                        {day.pages}
                      </text>
                    )}

                    {/* X-Axis day labels */}
                    <text
                      x={x + barWidth / 2}
                      y={114}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-brand-navy/60 font-sans"
                    >
                      {day.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Details below bar chart */}
          <div className="p-3 rounded-2xl border-2 border-brand-navy border-dashed bg-brand-paper/30 flex items-center justify-between text-xs font-semibold text-brand-navy/70">
            <p>Active Day Streak Progress Status:</p>
            <span className="font-bold text-brand-clay">Keep logging daily to scale your charts!</span>
          </div>
        </div>

        {/* Status Doughnut Chart Segment */}
        <div className="md:col-span-5 rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
          <div className="flex justify-between items-center border-b-2 border-brand-navy/10 pb-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
              <PieChart className="h-4.5 w-4.5 text-brand-clay" /> Bookshelf Allocation
            </h4>
            <span className="text-[10px] font-black text-brand-navy/40 font-mono">Doughnut visual</span>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center justify-around gap-4 py-2">
            {/* SVG Doughnut */}
            <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
              {totalBooks === 0 ? (
                <div className="text-center p-3">
                  <HelpCircle className="h-6 w-6 text-brand-navy/20 mx-auto mb-1" />
                  <p className="text-[9px] font-bold text-brand-navy/40">EMPTY</p>
                </div>
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full transform">
                  {doughnutSegments.map((seg) => {
                    if (seg.count === 0) return null;
                    return (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r="35"
                        fill="transparent"
                        className="stroke-brand-navy transition-all"
                        strokeWidth="10"
                        stroke={seg.color}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        style={{
                          transformOrigin: 'center',
                          transform: `rotate(${seg.rotation}deg)`,
                        }}
                      />
                    );
                  })}
                  {/* Innermost overlay cutout circle */}
                  <circle cx="50" cy="50" r="30" fill="#ffffff" className="stroke-brand-navy stroke-2" />
                </svg>
              )}
              {totalBooks > 0 && (
                <div className="absolute flex flex-col items-center">
                  <span className="text-base font-black text-brand-navy leading-none">{totalBooks}</span>
                  <span className="text-[8px] font-black uppercase text-brand-navy/40 tracking-wider">Books</span>
                </div>
              )}
            </div>

            {/* List details */}
            <div className="flex-1 space-y-2 w-full">
              {doughnutSegments.map((seg) => (
                <div key={seg.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="h-3.5 w-3.5 rounded-md border border-brand-navy shrink-0" 
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-bold text-brand-navy/80">{seg.label}</span>
                  </div>
                  <span className="font-mono font-bold text-brand-navy/60">
                    {seg.count} ({Math.round(seg.percent)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reader Genre & Goal tracker cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Pill Board */}
        <div className="rounded-3xl border-4 border-brand-navy bg-brand-cream p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
            <Tag className="h-4.5 w-4.5 text-brand-clay" /> Top Reading Genres
          </h4>

          <div className="space-y-2.5">
            {sortedCategories.length === 0 ? (
              <p className="text-xs text-brand-navy/50 font-bold uppercase text-center py-4 border-2 border-dashed border-brand-navy/10 rounded-xl">No genres recorded yet. Add books to start!</p>
            ) : (
              sortedCategories.map(([cat, count]) => {
                const percent = Math.round((count / totalBooks) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-brand-navy">
                      <span>{cat}</span>
                      <span>{count} volume{count > 1 ? 's' : ''}</span>
                    </div>
                    {/* Progress Bar background */}
                    <div className="w-full h-3 rounded-xl border-2 border-brand-navy bg-white overflow-hidden">
                      <div className="bg-brand-sand h-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Fun reading goals check box */}
        <div className="rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy/70 flex items-center gap-1.5">
            <Target className="h-4.5 w-4.5 text-brand-clay" /> Personal Reading Objectives
          </h4>

          <div className="space-y-3">
            {[
              { label: 'Achieve a 5-day active streak', done: streak.currentStreak >= 5, val: `${streak.currentStreak}/5 days` },
              { label: 'Catalogue at least 3 books', done: totalBooks >= 3, val: `${totalBooks}/3 volumes` },
              { label: 'Finish at least 1 book', done: completedBooksCount >= 1, val: `${completedBooksCount}/1 read` },
              { label: 'Log more than 100 pages', done: totalPagesReadEver >= 100, val: `${totalPagesReadEver}/100 pgs` }
            ].map((obj, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-brand-paper/40 border border-brand-navy/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded border-2 border-brand-navy flex items-center justify-center font-bold ${
                    obj.done ? 'bg-brand-sage text-white' : 'bg-white'
                  }`}>
                    {obj.done && '✓'}
                  </span>
                  <span className={`font-semibold ${obj.done ? 'line-through text-brand-navy/40' : 'text-brand-navy'}`}>{obj.label}</span>
                </div>
                <span className="font-mono text-[10px] font-bold bg-brand-paper px-2 py-0.5 rounded-md text-brand-navy/60">{obj.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
