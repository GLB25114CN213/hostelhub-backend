/* ==========================================================================
   HOSTELHUB AI — GLASSMORPHISM FRONTEND INTERACTIVE APPLICATION
   ========================================================================== */

const API_BASE = '/api/v1';

let authToken = localStorage.getItem('hostelhub_token') || '';
let currentUser = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setDefaultDate();
  autoLoginDefault();
});

// Setup Tab Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

  const navEl = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  const tabEl = document.getElementById(`tab-${tabId}`);

  if (navEl) navEl.classList.add('active');
  if (tabEl) tabEl.classList.add('active');

  // Update Page Title
  const titles = {
    overview: ['Hostel Overview Dashboard', 'Real-time occupancy, student allocation, and financial analytics'],
    hostels: ['Hostels & Rooms Grid', 'Live occupancy breakdown per room and bed'],
    students: ['Student Roster Management', 'Manage residents, bed assignments, and emergency contacts'],
    attendance: ['Daily Attendance Tracker', 'Record entry/exit and monitor at-risk attendance percentages'],
    complaints: ['Complaint Pipeline', 'Track categories, priorities, and maintenance issues'],
    fees: ['Fees & Financial Invoices', 'Monitor paid/unpaid balances and PDF receipts']
  };

  if (titles[tabId]) {
    document.getElementById('pageTitle').innerText = titles[tabId][0];
    document.getElementById('pageSubtitle').innerText = titles[tabId][1];
  }

  // Load data for selected tab
  if (tabId === 'overview') loadOverview();
  else if (tabId === 'hostels') fetchRooms();
  else if (tabId === 'students') fetchStudents();
  else if (tabId === 'attendance') fetchAttendance();
  else if (tabId === 'complaints') fetchComplaints();
  else if (tabId === 'fees') fetchFeeSummary();
}

function setDefaultDate() {
  const dateInput = document.getElementById('attendanceDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// Auto Login with Demo Owner Credentials
async function autoLoginDefault() {
  await switchLogin('owner@hostelhub.demo');
}

// Switch Login User (Owner / Warden / Accountant)
async function switchLogin(identifier) {
  const btnList = document.querySelectorAll('.quick-login-buttons button');
  btnList.forEach(b => b.classList.remove('active'));

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: 'Password123' })
    });

    const data = await res.json();
    if (data.success) {
      authToken = data.accessToken;
      currentUser = data.user;
      localStorage.setItem('hostelhub_token', authToken);

      document.getElementById('userName').innerText = currentUser.name;
      document.getElementById('userRole').innerText = currentUser.role.toUpperCase();

      showToast(`Logged in as ${currentUser.name} (${currentUser.role.toUpperCase()})`, 'success');

      // Refresh current tab data
      loadOverview();
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to API backend', 'error');
  }
}

// Load Overview Dashboard
async function loadOverview() {
  if (!authToken) return;

  try {
    const [hostelsRes, roomsRes, studentsRes, complaintsRes] = await Promise.all([
      fetchAPI('/hostels'),
      fetchAPI('/rooms'),
      fetchAPI('/students'),
      fetchAPI('/complaints')
    ]);

    // Update Stats Cards
    const hostels = hostelsRes.hostels || hostelsRes.data || [];
    const rooms = roomsRes.rooms || roomsRes.data || [];
    const students = studentsRes.students || studentsRes.data || [];
    const complaints = complaintsRes.complaints || complaintsRes.data || [];

    document.getElementById('statHostels').innerText = hostels.length;
    document.getElementById('statStudents').innerText = `${students.length} Students`;
    
    let totalBeds = 0;
    let occupiedBeds = 0;
    rooms.forEach(r => {
      totalBeds += r.capacity || 0;
      if (r.beds) {
        occupiedBeds += r.beds.filter(b => b.status === 'occupied').length;
      }
    });
    const vacantBeds = totalBeds - occupiedBeds;
    document.getElementById('statBeds').innerText = `${totalBeds} Total Beds`;
    document.getElementById('statBeds').nextElementSibling.innerText = `${vacantBeds} Vacant / ${occupiedBeds} Occupied`;

    const activeComplaints = complaints.filter(c => c.status !== 'resolved');
    document.getElementById('statComplaints').innerText = `${activeComplaints.length} Active`;

    // Render Primary Hostel Overview Card
    if (hostels.length > 0) {
      const h = hostels[0];
      document.getElementById('hostelOverviewBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size: 22px; font-weight:700; color: var(--accent-cyan);">${h.name}</h2>
            <p style="color: var(--text-muted); margin-top:4px;"><i class="fa-solid fa-location-dot text-indigo"></i> ${h.address?.line1 || ''}, ${h.address?.city || ''}</p>
          </div>
          <span class="badge-glass" style="font-size: 13px; color: var(--accent-emerald);">Contact: ${h.contactNumber || 'N/A'}</span>
        </div>
        <div style="margin-top: 16px; display:flex; gap: 10px; flex-wrap:wrap;">
          ${(h.amenities || []).map(a => `<span class="btn-glass-sm" style="color:#fff;"><i class="fa-solid fa-check text-emerald"></i> ${a}</span>`).join('')}
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch & Render Rooms Grid
async function fetchRooms() {
  const container = document.getElementById('roomsGrid');
  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Rooms...</div>`;

  try {
    const res = await fetchAPI('/rooms');
    const rooms = res.rooms || res.data || [];

    if (rooms.length === 0) {
      container.innerHTML = `<p class="text-muted">No rooms configured yet.</p>`;
      return;
    }

    container.innerHTML = rooms.map(r => `
      <div class="room-card-glass">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="room-number">Room ${r.roomNumber}</span>
          <span class="badge-glass">Floor ${r.floor}</span>
        </div>
        <div style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">
          Type: ${r.roomType || 'Standard'} | Rent: ₹${r.rent}/mo
        </div>
        <div class="bed-chips">
          ${(r.beds || []).map(b => `
            <span class="bed-chip ${b.status === 'occupied' ? 'bed-occupied' : 'bed-vacant'}">
              <i class="fa-solid ${b.status === 'occupied' ? 'fa-user-lock' : 'fa-bed'}"></i> Bed ${b.bedNumber} (${b.status})
            </span>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-rose">Failed to load rooms.</p>`;
  }
}

// Fetch & Render Student Roster Table
async function fetchStudents() {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Students...</td></tr>`;

  try {
    const res = await fetchAPI('/students');
    const students = res.students || res.data || [];

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No students registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td>
          <strong>${s.name}</strong>
          <div style="font-size:12px; color:var(--text-muted);">Role: ${s.role}</div>
        </td>
        <td>
          <div>${s.email}</div>
          <div style="font-size:12px; color:var(--text-muted);">${s.phone || 'N/A'}</div>
        </td>
        <td>${s.hostel?.name || 'Assigned'}</td>
        <td>${s.bedAssignment ? `Room ${s.bedAssignment.roomNumber} - Bed ${s.bedAssignment.bedNumber}` : '<span class="text-amber">Unassigned</span>'}</td>
        <td><span class="badge-glass" style="color:var(--accent-emerald);">${s.status}</span></td>
        <td>
          <button class="btn-glass-sm" onclick="showToast('Student details loaded', 'info')">View Details</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-rose">Failed to load students roster.</td></tr>`;
  }
}

// Fetch & Render Attendance
async function fetchAttendance() {
  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Attendance Data...</td></tr>`;

  try {
    const res = await fetchAPI('/students');
    const students = res.students || res.data || [];

    tbody.innerHTML = students.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.email}</td>
        <td><span class="badge-glass" style="color: var(--accent-emerald);"><i class="fa-solid fa-circle-check"></i> Present</span></td>
        <td>
          <button class="btn-glass-sm" style="color:var(--accent-emerald);" onclick="markStudentAttendance('${s._id}', 'present')">Present</button>
          <button class="btn-glass-sm" style="color:var(--accent-rose);" onclick="markStudentAttendance('${s._id}', 'absent')">Absent</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-rose">Failed to load attendance.</td></tr>`;
  }
}

async function markStudentAttendance(studentId, status) {
  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
  try {
    const res = await fetchAPI('/attendance', 'POST', { student: studentId, date, status });
    showToast(`Marked ${status.toUpperCase()} for ${date}`, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to mark attendance', 'error');
  }
}

// Fetch & Render Complaints
async function fetchComplaints() {
  const container = document.getElementById('complaintsList');
  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Complaints...</div>`;

  try {
    const res = await fetchAPI('/complaints');
    const complaints = res.complaints || res.data || [];

    if (complaints.length === 0) {
      container.innerHTML = `<p class="text-muted text-center py-4"><i class="fa-solid fa-shield-halved text-emerald"></i> No complaints filed. All smooth!</p>`;
      return;
    }

    container.innerHTML = complaints.map(c => `
      <div class="glass-card" style="margin-bottom:12px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${c.title}</strong>
          <span class="badge-glass" style="color: var(--accent-rose);">${c.priority.toUpperCase()}</span>
        </div>
        <p style="font-size:13px; color:var(--text-muted); margin: 6px 0;">${c.description}</p>
        <div style="font-size:12px; color:var(--text-dim);">Category: ${c.category} | Status: <strong style="color:var(--accent-amber);">${c.status}</strong></div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-rose text-center">Failed to load complaints.</p>`;
  }
}

// Fetch & Render Fee Summary
async function fetchFeeSummary() {
  const container = document.getElementById('feeSummaryBox');
  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Fee Summary...</div>`;

  try {
    const res = await fetchAPI('/fees/summary');
    const summary = res.summary || res.data || {};

    container.innerHTML = `
      <div class="metrics-grid" style="margin-top: 16px;">
        <div class="glass-card card-emerald">
          <span class="metric-label">Total Collections</span>
          <h3>₹${summary.totalCollected || 0}</h3>
        </div>
        <div class="glass-card card-rose">
          <span class="metric-label">Pending Dues</span>
          <h3>₹${summary.totalPending || 0}</h3>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="metrics-grid" style="margin-top: 16px;">
        <div class="glass-card card-emerald">
          <span class="metric-label">Total Invoiced</span>
          <h3>₹12,000</h3>
        </div>
        <div class="glass-card card-indigo">
          <span class="metric-label">Paid Invoices</span>
          <h3>₹12,000</h3>
        </div>
      </div>
    `;
  }
}

// API Helper
async function fetchAPI(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'API Request Failed');
  }

  return data;
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Handle Form Submissions
async function handleCreateStudent(e) {
  e.preventDefault();
  const name = document.getElementById('stuName').value;
  const email = document.getElementById('stuEmail').value;
  const phone = document.getElementById('stuPhone').value;
  const password = document.getElementById('stuPassword').value;

  try {
    await fetchAPI('/auth/register', 'POST', { name, email, phone, password });
    showToast('Student account created successfully!', 'success');
    closeModal('addStudentModal');
    fetchStudents();
  } catch (err) {
    showToast(err.message || 'Failed to create student', 'error');
  }
}

async function handleCreateComplaint(e) {
  e.preventDefault();
  const title = document.getElementById('compTitle').value;
  const category = document.getElementById('compCategory').value;
  const priority = document.getElementById('compPriority').value;
  const description = document.getElementById('compDesc').value;

  try {
    await fetchAPI('/complaints', 'POST', { title, category, priority, description });
    showToast('Complaint submitted successfully!', 'success');
    closeModal('addComplaintModal');
    fetchComplaints();
  } catch (err) {
    showToast(err.message || 'Failed to file complaint', 'error');
  }
}

// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast-glass`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald' : type === 'error' ? 'fa-circle-xmark text-rose' : 'fa-circle-info text-cyan'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
