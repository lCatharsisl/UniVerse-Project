import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const SECTIONS = [
  {
    title: 'FALL SEMESTER',
    rows: [
      { event: 'English Proficiency Exam', hazirlik: '02 September 2025', onlisans: '–', lisansustu: '–' },
      { event: 'Course Registration', hazirlik: '22-23 September 2025', onlisans: '22-26 September 2025', lisansustu: '22-26 September 2025' },
      { event: 'Start of Classes', hazirlik: '29 September 2025', onlisans: '29 September 2025', lisansustu: '29 September 2025' },
      { event: 'End of Semester Exams', hazirlik: '05-16 January 2026', onlisans: '04-16 January 2026', lisansustu: '04-16 January 2026' },
      { event: 'Grade Entry Deadline', hazirlik: '23 January 2026', onlisans: '23 January 2026', lisansustu: '23 January 2026' },
    ],
  },
  {
    title: 'SPRING SEMESTER',
    rows: [
      { event: 'Course Registration', hazirlik: '02-03 February 2026', onlisans: '02-06 February 2026', lisansustu: '02-06 February 2026' },
      { event: 'Start of Classes', hazirlik: '09 February 2026', onlisans: '09 February 2026', lisansustu: '09 February 2026' },
      { event: 'Course Withdrawal Deadline', hazirlik: '–', onlisans: '20 March 2026', lisansustu: '20 March 2026' },
      { event: 'End of Classes', hazirlik: '22 May 2026', onlisans: '22 May 2026', lisansustu: '22 May 2026' },
      { event: 'End of Semester Exams', hazirlik: '25 May - 05 June 2026', onlisans: '25 May - 06 June 2026', lisansustu: '25 May - 06 June 2026' },
    ],
  },
  {
    title: 'SUMMER SCHOOL',
    rows: [
      { event: 'Course Registration', hazirlik: '15-23 June 2026', onlisans: '15-23 June 2026', lisansustu: '15-23 June 2026' },
      { event: 'Start of Classes', hazirlik: '29 June 2026', onlisans: '29 June 2026', lisansustu: '29 June 2026' },
      { event: 'End of Classes', hazirlik: '13 August 2026', onlisans: '13 August 2026', lisansustu: '13 August 2026' },
      { event: 'End of Semester Exams', hazirlik: '14-18 August 2026', onlisans: '14-18 August 2026', lisansustu: '14-18 August 2026' },
    ],
  },
  {
    title: 'OFFICIAL HOLIDAYS',
    rows: [
      { event: 'Republic Day', hazirlik: '29 October 2025 Wednesday', onlisans: '29 October 2025 Wednesday', lisansustu: '29 October 2025 Wednesday' },
      { event: 'New Year Holiday', hazirlik: '1 January 2026 Thursday', onlisans: '1 January 2026 Thursday', lisansustu: '1 January 2026 Thursday' },
      { event: 'Eid al-Fitr', hazirlik: '19 March Eve, 20-21-22 March 2026', onlisans: '19 March Eve, 20-21-22 March 2026', lisansustu: '19 March Eve, 20-21-22 March 2026' },
      { event: 'Eid al-Adha', hazirlik: '26 May Eve, 27-28-29-30 May 2026', onlisans: '26 May Eve, 27-28-29-30 May 2026', lisansustu: '26 May Eve, 27-28-29-30 May 2026' },
      { event: 'Victory Day', hazirlik: '30 August 2026 Sunday', onlisans: '30 August 2026 Sunday', lisansustu: '30 August 2026 Sunday' },
    ],
  },
];

const AcademicCalendar: React.FC = () => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  return (
    <div
      className={`flex flex-col min-h-screen transition-colors duration-500 ${
        isSpace ? 'bg-[#050510]' : 'bg-white'
      } selection:bg-primary selection:text-white`}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 sticky top-0 backdrop-blur-xl border-b z-30 px-6 py-5 ${
          isSpace ? 'bg-[#0a0a1a]/80 border-white/5' : 'bg-white/90 border-gray-100'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${
              isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-uv-black'
            }`}
          >
            <FiCalendar size={24} className="text-primary" />
          </div>
          <div>
            <h2
              className={`text-2xl font-black tracking-tighter leading-none ${
                isSpace ? 'text-white' : 'text-uv-black'
              }`}
            >
              Academic Calendar
            </h2>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${
                isSpace ? 'text-[#e1e1e6]/40' : 'text-uv-gray'
              }`}
            >
              2025-2026 Academic Year
            </p>
          </div>
        </div>
      </div>

      {/* Calendar table */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div
          className={`uv-card overflow-hidden ${
            isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr
                  className={
                    isSpace
                      ? 'bg-primary/20 text-white border-b border-white/10'
                      : 'bg-gray-50 text-uv-black border-b border-uv-border'
                  }
                >
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-[220px]">
                    Event
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                    Preparatory
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                    Associate / Undergraduate
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                    Graduate
                  </th>
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((section) => (
                  <React.Fragment key={section.title}>
                    <tr
                      className={
                        isSpace
                          ? 'bg-white/5 text-primary font-black text-sm uppercase tracking-widest'
                          : 'bg-primary/5 text-primary font-black text-sm uppercase tracking-widest'
                      }
                    >
                      <td colSpan={4} className="px-4 py-3">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row, i) => (
                      <tr
                        key={`${section.title}-${i}`}
                        className={
                          isSpace
                            ? 'border-b border-white/5 hover:bg-white/5'
                            : 'border-b border-uv-border hover:bg-gray-50/50'
                        }
                      >
                        <td
                          className={`px-4 py-3 text-sm font-bold ${
                            isSpace ? 'text-[#e1e1e6]' : 'text-uv-black'
                          }`}
                        >
                          {row.event}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-medium ${
                            isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'
                          }`}
                        >
                          {row.hazirlik}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-medium ${
                            isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'
                          }`}
                        >
                          {row.onlisans}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-medium ${
                            isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'
                          }`}
                        >
                          {row.lisansustu}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p
          className={`mt-4 text-center text-[10px] font-bold uppercase tracking-widest ${
            isSpace ? 'text-[#e1e1e6]/40' : 'text-uv-gray'
          }`}
        >
          Yaşar University 2025-2026 Academic Calendar
        </p>
      </div>
    </div>
  );
};

export default AcademicCalendar;
