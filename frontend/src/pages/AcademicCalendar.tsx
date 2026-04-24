import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiCalendar, FiExternalLink } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const OFFICIAL_CALENDAR_PDF = 'https://oim.yasar.edu.tr/wp-content/uploads/2025/08/2025-2026-Akademik_Takvim_Revize-26.08.2025.pdf';

const MONTH_TR: Record<string, string> = {
  January: 'Ocak',
  February: 'Şubat',
  March: 'Mart',
  April: 'Nisan',
  May: 'Mayıs',
  June: 'Haziran',
  July: 'Temmuz',
  August: 'Ağustos',
  September: 'Eylül',
  October: 'Ekim',
  November: 'Kasım',
  December: 'Aralık',
};

// Convert English month names (and the "Eve" keyword used for Eid eves) to Turkish.
// Source data is stored in English so it stays readable and PDF-source-aligned.
const formatDate = (value: string, lang: string): string => {
  if (lang !== 'tr' || !value) return value;
  let result = value;
  for (const [en, tr] of Object.entries(MONTH_TR)) {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'g'), tr);
  }
  return result.replace(/\bEve\b/g, 'Arefesi');
};

/* Source: OİDB Official 2025-2026 Academic Calendar (Revised 26.08.2025) */
const SECTIONS = [
  {
    key: 'fall',
    rows: [
      { eventKey: 'englishProficiencyWritten', hazirlik: '11 September 2025', onlisans: '–', lisansustu: '–' },
      { eventKey: 'englishProficiencyOral', hazirlik: '12 September 2025', onlisans: '–', lisansustu: '–' },
      { eventKey: 'preparatoryPlacement', hazirlik: '22 September 2025', onlisans: '–', lisansustu: '–' },
      { eventKey: 'courseRegistration', hazirlik: '23-26 September 2025', onlisans: '22-23 September 2025', lisansustu: '22-23 September 2025' },
      { eventKey: 'startClasses', hazirlik: '29 September 2025', onlisans: '29 September 2025', lisansustu: '29 September 2025' },
      { eventKey: 'endClasses', hazirlik: '09 January 2026', onlisans: '09 January 2026', lisansustu: '09 January 2026' },
      { eventKey: 'endSemesterExams', hazirlik: '04-16 January 2026', onlisans: '04-16 January 2026', lisansustu: '04-16 January 2026' },
      { eventKey: 'gradeEntry', hazirlik: '17 January 2026', onlisans: '17 January 2026', lisansustu: '17 January 2026' },
    ],
  },
  {
    key: 'spring',
    rows: [
      { eventKey: 'courseRegistration', hazirlik: '–', onlisans: '26-30 January 2026', lisansustu: '26-30 January 2026' },
      { eventKey: 'startClasses', hazirlik: '02 February 2026', onlisans: '02 February 2026', lisansustu: '02 February 2026' },
      { eventKey: 'courseWithdrawal', hazirlik: '–', onlisans: '20 February 2026', lisansustu: '–' },
      { eventKey: 'endClasses', hazirlik: '05 June 2026', onlisans: '05 June 2026', lisansustu: '05 June 2026' },
      { eventKey: 'endSemesterExams', hazirlik: '10-23 May 2026', onlisans: '10-23 May 2026', lisansustu: '10-23 May 2026' },
      { eventKey: 'gradeEntry', hazirlik: '25 May 2026', onlisans: '25 May 2026', lisansustu: '25 May 2026' },
    ],
  },
  {
    key: 'summer',
    rows: [
      { eventKey: 'courseRegistration', hazirlik: '15-23 June 2026', onlisans: '08-09 June 2026', lisansustu: '08-09 June 2026' },
      { eventKey: 'startClasses', hazirlik: '25 June 2026', onlisans: '15 June 2026', lisansustu: '15 June 2026' },
      { eventKey: 'endClasses', hazirlik: '13 August 2026', onlisans: '31 July 2026', lisansustu: '31 July 2026' },
      { eventKey: 'twoCourseMakeup', hazirlik: '–', onlisans: '12-13 August 2026', lisansustu: '–' },
    ],
  },
  {
    key: 'holidays',
    rows: [
      { eventKey: 'republicDay', hazirlik: '29 October 2025', onlisans: '29 October 2025', lisansustu: '29 October 2025' },
      { eventKey: 'newYear', hazirlik: '01 January 2026', onlisans: '01 January 2026', lisansustu: '01 January 2026' },
      { eventKey: 'eidFitr', hazirlik: '19 March Eve, 20-21-22 March 2026', onlisans: '19 March Eve, 20-21-22 March 2026', lisansustu: '19 March Eve, 20-21-22 March 2026' },
      { eventKey: 'sovereigntyDay', hazirlik: '23 April 2026', onlisans: '23 April 2026', lisansustu: '23 April 2026' },
      { eventKey: 'laborDay', hazirlik: '01 May 2026', onlisans: '01 May 2026', lisansustu: '01 May 2026' },
      { eventKey: 'youthSports', hazirlik: '19 May 2026', onlisans: '19 May 2026', lisansustu: '19 May 2026' },
      { eventKey: 'eidAdha', hazirlik: '26 May Eve, 27-28-29-30 May 2026', onlisans: '26 May Eve, 27-28-29-30 May 2026', lisansustu: '26 May Eve, 27-28-29-30 May 2026' },
      { eventKey: 'democracyDay', hazirlik: '15 July 2026', onlisans: '15 July 2026', lisansustu: '15 July 2026' },
      { eventKey: 'victoryDay', hazirlik: '30 August 2026', onlisans: '30 August 2026', lisansustu: '30 August 2026' },
    ],
  },
];

const AcademicCalendar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const lang = i18n.language;

  return (
    <div
      className={`flex flex-col min-h-screen transition-colors duration-500 ${
        isSpace ? 'bg-[#050510]' : 'bg-white'
      } selection:bg-primary selection:text-white`}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 sticky top-0 backdrop-blur-xl border-b z-30 px-4 sm:px-6 py-4 sm:py-5 ${
          isSpace ? 'bg-[#0a0a1a]/80 border-white/5' : 'bg-white/90 border-gray-100'
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex flex-shrink-0 items-center justify-center shadow-xl ${
              isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-uv-black'
            }`}
          >
            <FiCalendar size={24} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className={`text-xl sm:text-2xl font-black tracking-tighter leading-none truncate ${
                isSpace ? 'text-white' : 'text-uv-black'
              }`}
            >
              {t('academicCalendar.title')}
            </h2>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1 truncate ${
                isSpace ? 'text-[#e1e1e6]/40' : 'text-uv-gray'
              }`}
            >
              {t('academicCalendar.academicYear')}
            </p>
          </div>
          <a
            href={OFFICIAL_CALENDAR_PDF}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-colors ${
              isSpace
                ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                : 'bg-primary text-white hover:brightness-110'
            }`}
          >
            {t('academicCalendar.viewOfficial')} <FiExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 p-4 sm:p-6 pb-8 overflow-x-hidden overflow-y-auto">
        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <h3 className="mb-3 px-2 text-sm font-black uppercase tracking-widest text-primary">
                {t(`academicCalendar.sections.${section.key}`)}
              </h3>
              <div className="space-y-3">
                {section.rows.map((row, i) => (
                  <div
                    key={`${section.key}-${i}`}
                    className={`uv-card p-4 ${
                      isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${
                        isSpace ? 'text-[#e1e1e6]' : 'text-uv-black'
                      }`}
                    >
                      {t(`academicCalendar.events.${row.eventKey}`)}
                    </p>
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div>
                        <span className={`font-bold ${
                          isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'
                        }`}>
                          {t('academicCalendar.mobileLabels.preparatory')}:
                        </span>
                        <span className={`ml-1 ${
                          isSpace ? 'text-[#e1e1e6]/90' : 'text-uv-black'
                        }`}>
                          {formatDate(row.hazirlik, lang)}
                        </span>
                      </div>
                      <div>
                        <span className={`font-bold ${
                          isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'
                        }`}>
                          {t('academicCalendar.mobileLabels.undergrad')}:
                        </span>
                        <span className={`ml-1 ${
                          isSpace ? 'text-[#e1e1e6]/90' : 'text-uv-black'
                        }`}>
                          {formatDate(row.onlisans, lang)}
                        </span>
                      </div>
                      <div>
                        <span className={`font-bold ${
                          isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'
                        }`}>
                          {t('academicCalendar.mobileLabels.graduate')}:
                        </span>
                        <span className={`ml-1 ${
                          isSpace ? 'text-[#e1e1e6]/90' : 'text-uv-black'
                        }`}>
                          {formatDate(row.lisansustu, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block">
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
                      {t('academicCalendar.tableHeaders.event')}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                      {t('academicCalendar.tableHeaders.preparatory')}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                      {t('academicCalendar.tableHeaders.undergrad')}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                      {t('academicCalendar.tableHeaders.graduate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SECTIONS.map((section) => (
                    <React.Fragment key={section.key}>
                      <tr
                        className={
                          isSpace
                            ? 'bg-white/5 text-primary font-black text-sm uppercase tracking-widest'
                            : 'bg-primary/5 text-primary font-black text-sm uppercase tracking-widest'
                        }
                      >
                        <td colSpan={4} className="px-4 py-3">
                          {t(`academicCalendar.sections.${section.key}`)}
                        </td>
                      </tr>
                      {section.rows.map((row, i) => (
                        <tr
                          key={`${section.key}-${i}`}
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
                            {t(`academicCalendar.events.${row.eventKey}`)}
                          </td>
                          <td
                            className={`px-4 py-3 text-xs font-medium ${
                              isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'
                            }`}
                          >
                            {formatDate(row.hazirlik, lang)}
                          </td>
                          <td
                            className={`px-4 py-3 text-xs font-medium ${
                              isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'
                            }`}
                          >
                            {formatDate(row.onlisans, lang)}
                          </td>
                          <td
                            className={`px-4 py-3 text-xs font-medium ${
                              isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'
                            }`}
                          >
                            {formatDate(row.lisansustu, lang)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p
          className={`mt-4 text-center text-[10px] font-bold uppercase tracking-widest ${
            isSpace ? 'text-[#e1e1e6]/40' : 'text-uv-gray'
          }`}
        >
          {t('academicCalendar.footerTitle')}
        </p>
        <p className={`mt-2 text-center text-[10px] ${isSpace ? 'text-[#e1e1e6]/50' : 'text-uv-gray'}`}>
          {t('academicCalendar.footerDesc')}
        </p>
      </div>
    </div>
  );
};

export default AcademicCalendar;
