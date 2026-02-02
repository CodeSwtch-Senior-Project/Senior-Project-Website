// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');
  const menuIcon = document.getElementById('menuIcon');
  const closeIcon = document.getElementById('closeIcon');

  if (!mobileMenuBtn || !mobileNav) return;

  mobileMenuBtn.addEventListener('click', function () {
    const isOpen = !mobileNav.classList.contains('hidden');

    mobileNav.classList.toggle('hidden', isOpen);
    menuIcon.classList.toggle('hidden', !isOpen);
    closeIcon.classList.toggle('hidden', isOpen);
  });

  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.add('hidden');
      menuIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
    });
  });
});

// ---- Time Tracking ----
const chartCanvas = document.getElementById('timeChart');
const weekLabel = document.getElementById('weekLabel');
const entriesWeekLabel = document.getElementById('entriesWeekLabel');
const teamTotalEl = document.getElementById('teamTotal');
const avgPerMemberEl = document.getElementById('avgPerMember');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const entriesList = document.getElementById('entriesList');

if (chartCanvas) {
  let currentWeekOffset = 0;
  let allEntries = [];

  const SHEET_ID = '1FRFc1qk-Pp2To3NHKslHLlG2VWNnd1AVSoL-krI-xBg';
  const API_KEY = 'AIzaSyC99OIupa8aTUC8H1NZzhSwtdek7Y2PgIc';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTrQFmOECais2v3pj3V_uSX_6beijJ0vqiJNvW91U5e3EODxW91kBJfQ-xqcw_pz1P_Q/exec';

  // Date range limits: Jan 12, 2026 (Monday) to Aug 10, 2026 (Monday)
  const MIN_DATE = new Date('2026-01-12T00:00:00');
  const MAX_DATE = new Date('2026-08-10T00:00:00');

  const TEAM_MEMBERS = [
    'Aitan Bachrach',
    'Uttam Bhattarai',
    'Jarett Forzano',
    'Michael Camerato',
    'Yi Xhan Lin',
    'Coray Bennett'
  ];

  const COLORS = {
    primary: '#2dd4bf',
    secondary: '#38bdf8',
    text: '#f1f5f9',
    muted: '#94a3b8',
    background: '#0f172a',
    gridLine: '#334155'
  };

  function getWeekRange(offset = 0) {
    const now = new Date();
    const start = new Date(now);
    // Get Monday of current week (0 = Sunday, so we adjust: if Sunday (0), go back 6 days, else go back (day - 1) days)
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(now.getDate() + daysToMonday + offset * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateFull(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function updateNavigationButtons() {
    const { start } = getWeekRange(currentWeekOffset);
    
    // Hide previous button if at or before MIN_DATE (use visibility to maintain layout)
    if (start <= MIN_DATE) {
      prevWeekBtn.style.visibility = 'hidden';
    } else {
      prevWeekBtn.style.visibility = 'visible';
    }
    
    // Hide next button if at or after MAX_DATE (use visibility to maintain layout)
    if (start >= MAX_DATE) {
      nextWeekBtn.style.visibility = 'hidden';
    } else {
      nextWeekBtn.style.visibility = 'visible';
    }
  }

  async function loadEntriesFromSheet() {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`
      );
      const data = await response.json();
      
      if (!data.values || data.values.length < 2) {
        return [];
      }

      // New structure: Name, Week Start Date (Monday), Mon, Tue, Wed, Thu, Fri, Sat, Sun
      const entries = [];
      data.values.slice(1).forEach((row, idx) => {
        const member = row[0] || '';
        const weekStartDate = row[1] || ''; // Monday date
        
        if (!member || !weekStartDate) return;
        
        // Parse hours for each day of the week (columns 2-8)
        const dayHours = {
          monday: parseFloat(row[2]) || 0,
          tuesday: parseFloat(row[3]) || 0,
          wednesday: parseFloat(row[4]) || 0,
          thursday: parseFloat(row[5]) || 0,
          friday: parseFloat(row[6]) || 0,
          saturday: parseFloat(row[7]) || 0,
          sunday: parseFloat(row[8]) || 0
        };
        
        const totalHours = Object.values(dayHours).reduce((sum, h) => sum + h, 0);
        
        entries.push({
          id: idx,
          member,
          weekStartDate, // Monday date in YYYY-MM-DD format
          dayHours,
          totalHours
        });
      });
      
      return entries.filter(e => e.member && e.weekStartDate);
    } catch (error) {
      console.error('Error loading entries from Google Sheets:', error);
      entriesList.innerHTML = '<p class="no-entries">Error loading entries</p>';
      return [];
    }
  }

  function renderEntriesList() {
    const { start } = getWeekRange(currentWeekOffset);
    
    // Format the Monday date to match the sheet format (YYYY-MM-DD)
    const mondayDate = start.toISOString().split('T')[0];
    
    const weekEntries = allEntries
      .filter(e => e.weekStartDate === mondayDate)
      .sort((a, b) => b.totalHours - a.totalHours);

    if (weekEntries.length === 0) {
      entriesList.innerHTML = '<p class="no-entries">No entries for this week</p>';
      return;
    }

    entriesList.innerHTML = weekEntries.map((entry, idx) => {
      const dayBreakdown = Object.entries(entry.dayHours)
        .filter(([day, hours]) => hours > 0)
        .map(([day, hours]) => `${day.charAt(0).toUpperCase() + day.slice(1, 3)}: ${hours.toFixed(2)}`)
        .join(', ');
      
      return `
        <div class="entry-item" data-id="${entry.id}">
          <div class="entry-info">
            <span class="entry-member">${entry.member}</span>
            <span class="entry-date">${dayBreakdown || 'No hours logged'}</span>
          </div>
          <span class="entry-hours">${entry.totalHours.toFixed(2)} hrs</span>
        </div>
      `;
    }).join('');
  }

  function drawChart() {
    const ctx = chartCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.getBoundingClientRect();
    
    // Set canvas size accounting for device pixel ratio
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const { start, end } = getWeekRange(currentWeekOffset);
    const weekRangeText = `${formatDate(start)} - ${formatDate(end)}`;
    weekLabel.textContent = weekRangeText;
    if (entriesWeekLabel) {
      entriesWeekLabel.textContent = `Entries for ${weekRangeText}`;
    }

    // Format the Monday date to match the sheet format (YYYY-MM-DD)
    const mondayDate = start.toISOString().split('T')[0];
    
    const entries = allEntries.filter(e => e.weekStartDate === mondayDate);

    // Calculate totals for all team members (including those with 0)
    const totals = {};
    TEAM_MEMBERS.forEach(member => {
      totals[member] = 0;
    });

    let teamTotal = 0;
    entries.forEach(e => {
      totals[e.member] = (totals[e.member] || 0) + e.totalHours;
      teamTotal += e.totalHours;
    });

    const members = TEAM_MEMBERS;
    const maxHours = Math.max(...Object.values(totals), 10);
    const activeMemberCount = Object.values(totals).filter(h => h > 0).length;

    // Update stats
    teamTotalEl.textContent = `${teamTotal.toFixed(2)} hrs`;
    avgPerMemberEl.textContent = activeMemberCount > 0 
      ? `${(teamTotal / activeMemberCount).toFixed(2)} hrs` 
      : '0 hrs';

    // Chart dimensions
    const padding = { top: 20, right: 20, bottom: 60, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = chartWidth / members.length;
    const barPadding = barWidth * 0.25;
    const actualBarWidth = barWidth - barPadding * 2;

    // Draw grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxHours - (maxHours / gridLines) * i;
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(0), padding.left - 8, y + 4);
    }

    // Draw bars
    members.forEach((member, i) => {
      const x = padding.left + i * barWidth + barPadding;
      const hours = totals[member];
      const barHeight = (hours / maxHours) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      // Create gradient for bar
      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
      gradient.addColorStop(0, COLORS.primary);
      gradient.addColorStop(1, COLORS.secondary);

      // Draw bar with rounded top
      const radius = Math.min(4, actualBarWidth / 2);
      ctx.fillStyle = hours > 0 ? gradient : COLORS.gridLine;
      ctx.beginPath();
      if (barHeight > radius) {
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + actualBarWidth - radius, y);
        ctx.quadraticCurveTo(x + actualBarWidth, y, x + actualBarWidth, y + radius);
        ctx.lineTo(x + actualBarWidth, padding.top + chartHeight);
      } else if (barHeight > 0) {
        ctx.rect(x, y, actualBarWidth, barHeight);
      } else {
        // Draw minimal bar for 0 hours
        ctx.rect(x, padding.top + chartHeight - 2, actualBarWidth, 2);
      }
      ctx.fill();

      // Hours label on top of bar
      if (hours > 0) {
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hours.toFixed(2), x + actualBarWidth / 2, y - 6);
      }

      // Member name label (first name only)
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      const firstName = member.split(' ')[0];
      ctx.fillText(firstName, x + actualBarWidth / 2, height - padding.bottom + 18);
    });

    // Update entries list
    renderEntriesList();
    
    // Update navigation button visibility
    updateNavigationButtons();
  }

  // Week navigation
  prevWeekBtn.addEventListener('click', () => {
    currentWeekOffset--;
    drawChart();
  });

  nextWeekBtn.addEventListener('click', () => {
    currentWeekOffset++;
    drawChart();
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(drawChart, 100);
  });

  // Initial load
  async function initTimeTracking() {
    entriesList.innerHTML = '<p class="no-entries">Loading entries...</p>';
    allEntries = await loadEntriesFromSheet();
    drawChart();
  }

  initTimeTracking();
}
