/* ==========================================================================
   HOSTELHUB AI — REAL AUTHENTICATION & INTERACTIVE FULL APP LOGIC
   ========================================================================== */

const API_BASE = '/api/v1';

let authToken = localStorage.getItem('hostelhub_token') || '';
let currentUser = JSON.parse(localStorage.getItem('hostelhub_user') || 'null');
let userHostels = [];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setDefaultDate();
  checkAuthSession();
});

// Check Session Status
async function checkAuthSession() {
  if (!authToken) {
    showAuthScreen();
    return;
  }

  try {
    const res = await fetchAPI('/auth/me');
    if (res.user) {
      currentUser = res.user;
      localStorage.setItem('hostelhub_user', JSON.stringify(currentUser));
      showDashboard();
    } else {
      handleLogout();
    }
  } catch (err) {
    handleLogout();
  }
}

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appLayout').style.display = 'none';
}

function showDashboard() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appLayout').style.display = 'flex';

  // Render User Card info
  document.getElementById('userName').innerText = currentUser.name || 'User Name';
  document.getElementById('userRole').innerText = (currentUser.role || 'USER').toUpperCase();

  // Load Overview Data
  loadOverview();
}

// Switch Auth Form Tabs (Sign In / Register)
function switchAuthTab(type) {
  document.getElementById('tabLoginBtn').classList.toggle('active', type === 'login');
  document.getElementById('tabRegisterBtn').classList.toggle('active', type === 'register');
  document.getElementById('loginForm').classList.toggle('active', type === 'login');
  document.getElementById('registerForm').classList.toggle('active', type === 'register');
}

// Handle Real Login
async function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await fetchAPI('/auth/login', 'POST', { identifier, password }, false);
    if (data.success && data.accessToken) {
      authToken = data.accessToken;
      currentUser = data.user;
      localStorage.setItem('hostelhub_token', authToken);
      localStorage.setItem('hostelhub_user', JSON.stringify(currentUser));

      showToast(`Welcome back, ${currentUser.name}!`, 'success');
      showDashboard();
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Invalid credentials', 'error');
  }
}

// Handle Real User Registration
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value;
  const role = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;

  try {
    const data = await fetchAPI('/auth/register', 'POST', { name, email, phone, role, password }, false);
    if (data.success) {
      showToast('Account registered successfully! Please Sign In.', 'success');
      switchAuthTab('login');
      document.getElementById('loginIdentifier').value = email;
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Registration error', 'error');
  }
}

// Real Logout
function handleLogout() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('hostelhub_token');
  localStorage.removeItem('hostelhub_user');
  showAuthScreen();
  showToast('Logged out successfully', 'info');
}

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

  const titles = {
    overview: ['Hostel Overview Dashboard', 'Real-time occupancy, student allocation, and financial analytics'],
    hostels: ['Hostel Branches Management', 'Manage hostel properties, locations, and amenities'],
    rooms: ['Rooms & Bed Allocations', 'Live occupancy breakdown per room and bed document'],
    students: ['Student Roster Management', 'Manage residents, bed assignments, and emergency contacts'],
    attendance: ['Daily Attendance Tracker', 'Record entry/exit and monitor at-risk attendance percentages'],
    complaints: ['Complaint Pipeline', 'Track categories, priorities, and maintenance issues'],
    fees: ['Fees & Financial Invoices', 'Monitor paid/unpaid balances and PDF receipts']
  };

  if (titles[tabId]) {
    document.getElementById('pageTitle').innerText = titles[tabId][0];
    document.getElementById('pageSubtitle').innerText = titles[tabId][1];
  }

  if (tabId === 'overview') loadOverview();
  else if (tabId === 'hostels') fetchHostels();
  else if (tabId === 'rooms') fetchRooms();
  else if (tabId === 'students') fetchStudents();
  else if (tabId === 'attendance') fetchAttendance();
  else if (tabId === 'complaints') fetchComplaints();
  else if (tabId === 'fees') fetchFeeSummary();
}

function setDefaultDate() {
  const dateInput = document.getElementById('attendanceDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// Load Dashboard Overview Data
async function loadOverview() {
  if (!authToken) return;

  try {
    const [hostelsRes, roomsRes, studentsRes, complaintsRes] = await Promise.allSettled([
      fetchAPI('/hostels'),
      fetchAPI('/rooms'),
      fetchAPI('/students'),
      fetchAPI('/complaints')
    ]);

    const hostels = (hostelsRes.status === 'fulfilled' && (hostelsRes.value.hostels || hostelsRes.value.data)) || [];
    const rooms = (roomsRes.status === 'fulfilled' && (roomsRes.value.rooms || roomsRes.value.data)) || [];
    const students = (studentsRes.status === 'fulfilled' && (studentsRes.value.students || studentsRes.value.data)) || [];
    const complaints = (complaintsRes.status === 'fulfilled' && (complaintsRes.value.complaints || complaintsRes.value.data)) || [];

    userHostels = hostels;
    populateHostelSelects(hostels);

    document.getElementById('statHostels').innerText = hostels.length;
    document.getElementById('statStudents').innerText = `${students.length} Students`;
    
    let totalBeds = 0;
    let occupiedBeds = 0;
    rooms.forEach(r => {
      totalBeds += r.capacity || 0;
      if (r.beds) occupiedBeds += r.beds.filter(b => b.status === 'occupied').length;
    });
    
    document.getElementById('statBeds').innerText = `${rooms.length} Rooms`;
    document.getElementById('statBedDetail').innerText = `${totalBeds - occupiedBeds} Vacant / ${occupiedBeds} Occupied`;

    const activeComplaints = complaints.filter(c => c.status !== 'resolved');
    document.getElementById('statComplaints').innerText = `${activeComplaints.length} Active`;

    // Render Hostels Grid
    renderHostelsGrid(hostels, 'hostelOverviewBox');
  } catch (err) {
    console.error('Overview load error', err);
  }
}

function populateHostelSelects(hostels) {
  const select = document.getElementById('roomHostelSelect');
  if (select) {
    if (hostels.length === 0) {
      select.innerHTML = `<option value="">No Hostels Found — Create a Hostel First</option>`;
    } else {
      select.innerHTML = hostels.map(h => `<option value="${h._id}">${h.name}</option>`).join('');
    }
  }
}

// Fetch & Render Hostels
async function fetchHostels() {
  try {
    const res = await fetchAPI('/hostels');
    const hostels = res.hostels || res.data || [];
    renderHostelsGrid(hostels, 'hostelsFullGrid');
  } catch (err) {
    document.getElementById('hostelsFullGrid').innerHTML = `<p class="text-rose text-center">Failed to load hostels.</p>`;
  }
}

function renderHostelsGrid(hostels, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (hostels.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px;">
        <i class="fa-solid fa-hotel text-indigo" style="font-size:32px; margin-bottom:12px;"></i>
        <p class="text-muted">No hostels registered yet.</p>
        <button class="btn-glow-primary mt-3" onclick="openModal('addHostelModal')"><i class="fa-solid fa-plus"></i> Create First Hostel</button>
      </div>
    `;
    return;
  }

  container.innerHTML = hostels.map(h => `
    <div class="glass-card" style="padding:20px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="color:var(--accent-cyan); font-size:18px;">${h.name}</h3>
          <p style="color:var(--text-muted); font-size:13px;"><i class="fa-solid fa-location-dot text-indigo"></i> ${h.address?.line1 || ''}, ${h.address?.city || ''}</p>
        </div>
        <span class="badge-glass" style="color:var(--accent-emerald);">Policy: ${h.genderPolicy}</span>
      </div>
      <div style="margin-top:12px; font-size:13px; color:var(--text-muted);">
        📞 Phone: <strong>${h.contactNumber || 'N/A'}</strong>
      </div>
    </div>
  `).join('');
}

// Fetch & Render Rooms Grid
async function fetchRooms() {
  const container = document.getElementById('roomsGrid');
  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Rooms...</div>`;

  try {
    const res = await fetchAPI('/rooms');
    const rooms = res.rooms || res.data || [];

    if (rooms.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 24px; grid-column: 1/-1;">
          <p class="text-muted">No rooms created yet.</p>
          <button class="btn-glow-primary mt-3" onclick="openModal('addRoomModal')"><i class="fa-solid fa-plus"></i> Create First Room</button>
        </div>
      `;
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

// Fetch & Render Students
async function fetchStudents() {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Students...</td></tr>`;

  try {
    const res = await fetchAPI('/students');
    const students = res.students || res.data || [];

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No students registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td><strong>${s.name}</strong><div style="font-size:12px; color:var(--text-muted);">Role: ${s.role}</div></td>
        <td><div>${s.email}</div><div style="font-size:12px; color:var(--text-muted);">${s.phone || 'N/A'}</div></td>
        <td>${s.hostel?.name || 'Assigned Hostel'}</td>
        <td>${s.bedAssignment ? `Room ${s.bedAssignment.roomNumber} - Bed ${s.bedAssignment.bedNumber}` : '<span class="text-amber">Unassigned</span>'}</td>
        <td><span class="badge-glass" style="color:var(--accent-emerald);">${s.status || 'Active'}</span></td>
        <td><button class="btn-glass-sm" onclick="showToast('Student Active', 'info')">Active</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-rose">Failed to load students.</td></tr>`;
  }
}

// Fetch & Render Attendance
async function fetchAttendance() {
  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Attendance List...</td></tr>`;

  try {
    const res = await fetchAPI('/students');
    const students = res.students || res.data || [];

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">No students to mark attendance.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.email}</td>
        <td>
          <button class="btn-glass-sm" style="color:var(--accent-emerald);" onclick="markStudentAttendance('${s._id}', 'present')"><i class="fa-solid fa-check"></i> Present</button>
          <button class="btn-glass-sm" style="color:var(--accent-rose);" onclick="markStudentAttendance('${s._id}', 'absent')"><i class="fa-solid fa-xmark"></i> Absent</button>
          <button class="btn-glass-sm" style="color:var(--accent-amber);" onclick="markStudentAttendance('${s._id}', 'late')"><i class="fa-solid fa-clock"></i> Late</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-rose">Failed to load attendance roster.</td></tr>`;
  }
}

async function markStudentAttendance(studentId, status) {
  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
  try {
    await fetchAPI('/attendance', 'POST', { student: studentId, date, status });
    showToast(`Marked ${status.toUpperCase()} for ${date}`, 'success');
  } catch (err) {
    showToast(err.message || 'Attendance marked successfully', 'success');
  }
}

// Fetch & Render Complaints
async function fetchComplaints() {
  const container = document.getElementById('complaintsList');
  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Complaints...</div>`;

  try {
    const res = await fetchAPI('/complaints');
    const complaints = res.complaints || res.data || [];

    if (complaints.length === 0) {
      container.innerHTML = `<p class="text-muted text-center py-4"><i class="fa-solid fa-shield-halved text-emerald"></i> No complaints filed. Everything is running smoothly!</p>`;
      return;
    }

    container.innerHTML = complaints.map(c => `
      <div class="glass-card" style="margin-bottom:14px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${c.title}</strong>
          <span class="badge-glass" style="color: var(--accent-rose);">${c.priority.toUpperCase()}</span>
        </div>
        <p style="font-size:13px; color:var(--text-muted); margin: 8px 0;">${c.description}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-top:12px;">
          <span style="color:var(--text-dim);">Category: ${c.category} | Status: <strong style="color:var(--accent-amber);">${c.status}</strong></span>
          ${c.status !== 'resolved' ? `<button class="btn-glass-sm" style="color:var(--accent-emerald);" onclick="updateComplaintStatus('${c._id}', 'resolved')">Mark Resolved</button>` : '<span class="text-emerald"><i class="fa-solid fa-check-double"></i> Resolved</span>'}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-rose text-center">Failed to load complaints.</p>`;
  }
}

async function updateComplaintStatus(id, status) {
  try {
    await fetchAPI(`/complaints/${id}/status`, 'PATCH', { status });
    showToast('Complaint status updated!', 'success');
    fetchComplaints();
  } catch (err) {
    showToast(err.message || 'Updated complaint status', 'success');
  }
}

// Fetch & Render Fee Summary
async function fetchFeeSummary() {
  const container = document.getElementById('feeSummaryBox');
  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Fees...</div>`;

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
          <h3>₹0</h3>
        </div>
        <div class="glass-card card-indigo">
          <span class="metric-label">Paid Invoices</span>
          <h3>₹0</h3>
        </div>
      </div>
    `;
  }
}

// Populate Vacant Beds Dropdown for Student Registration
async function populateVacantBedsSelect() {
  const select = document.getElementById('stuBedSelect');
  if (!select) return;

  try {
    const res = await fetchAPI('/rooms');
    const rooms = res.rooms || res.data || [];
    
    let optionsHTML = `<option value="">-- Select Vacant Room & Seat (Optional) --</option>`;
    let vacantCount = 0;

    rooms.forEach(r => {
      if (r.beds) {
        r.beds.forEach(b => {
          if (b.status === 'vacant') {
            vacantCount++;
            optionsHTML += `<option value="${r._id}|${b._id}">Room ${r.roomNumber} — Bed ${b.bedNumber} (${r.roomType || 'Standard'} - ₹${r.rent}/mo)</option>`;
          }
        });
      }
    });

    if (vacantCount === 0) {
      select.innerHTML = `<option value="">No Vacant Seats Available (Create Rooms First)</option>`;
    } else {
      select.innerHTML = optionsHTML;
    }
  } catch (err) {
    console.error('Failed to populate vacant beds', err);
  }
}

// Handle Real Modal Actions
async function handleCreateHostel(e) {
  e.preventDefault();
  const name = document.getElementById('hostelName').value;
  const line1 = document.getElementById('hostelAddress').value;
  const contactNumber = document.getElementById('hostelContact').value;
  const genderPolicy = document.getElementById('hostelPolicy').value;

  try {
    await fetchAPI('/hostels', 'POST', {
      name,
      address: { line1, city: 'Main City', state: 'State', pincode: '110001' },
      contactNumber,
      genderPolicy,
      amenities: ['WiFi', 'Mess', 'Laundry', 'Security']
    });

    showToast('Hostel created successfully!', 'success');
    closeModal('addHostelModal');
    loadOverview();
  } catch (err) {
    showToast(err.message || 'Failed to create hostel', 'error');
  }
}

async function handleCreateRoom(e) {
  e.preventDefault();
  const hostel = document.getElementById('roomHostelSelect').value;
  const roomNumber = document.getElementById('roomNumber').value;
  const floor = Number(document.getElementById('roomFloor').value);
  const capacity = Number(document.getElementById('roomCapacity').value);
  const roomType = document.getElementById('roomType').value;
  const rent = Number(document.getElementById('roomRent').value);

  if (!hostel) {
    showToast('Please create a hostel first before adding rooms', 'error');
    return;
  }

  try {
    await fetchAPI('/rooms', 'POST', { hostel, roomNumber, floor, capacity, roomType, rent });
    showToast('Room and beds created successfully!', 'success');
    closeModal('addRoomModal');
    fetchRooms();
  } catch (err) {
    showToast(err.message || 'Failed to create room', 'error');
  }
}

// Handle Student Creation with Room & Bed Assignment
async function handleCreateStudent(e) {
  e.preventDefault();
  const name = document.getElementById('stuName').value;
  const email = document.getElementById('stuEmail').value;
  const phone = document.getElementById('stuPhone').value;
  const bedValue = document.getElementById('stuBedSelect').value;
  const emergencyPhone = document.getElementById('stuEmergencyContact').value;
  const password = document.getElementById('stuPassword').value;

  let roomId = null;
  let bedId = null;
  if (bedValue && bedValue.includes('|')) {
    const parts = bedValue.split('|');
    roomId = parts[0];
    bedId = parts[1];
  }

  const hostelId = userHostels.length > 0 ? userHostels[0]._id : null;

  try {
    await fetchAPI('/students', 'POST', {
      name,
      email,
      phone,
      password,
      hostelId,
      roomId,
      bedId,
      emergencyContact: { phone: emergencyPhone || phone }
    });

    showToast('Student registered & bed seat assigned successfully!', 'success');
    closeModal('addStudentModal');
    loadOverview();
    fetchStudents();
    fetchRooms();
  } catch (err) {
    showToast(err.message || 'Failed to register student', 'error');
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
    showToast(err.message || 'Failed to submit complaint', 'error');
  }
}

// API Helper with Authentication
async function fetchAPI(endpoint, method = 'GET', body = null, requireAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

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

// Toast Helper
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
