const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  selectedDoctor: null
};

const qs = (selector) => document.querySelector(selector);
const toast = (message) => {
  const box = qs('#toast');
  box.textContent = message;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 3200);
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error de API');
  return data;
};

const setSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  renderSession();
};

const clearSession = () => {
  state.token = null;
  state.user = null;
  localStorage.clear();
  renderSession();
};

const renderSession = async () => {
  qs('#appView').classList.toggle('hidden', !state.token);
  qs('.auth-card').classList.toggle('hidden', Boolean(state.token));
  if (!state.token) return;
  qs('#userTitle').textContent = `${state.user.name} (${state.user.role})`;
  qs('#availabilityForm').classList.toggle('hidden', state.user.role !== 'doctor');
  await Promise.all([loadDoctors(), loadAppointments(), loadNotifications()]);
};

const loadDoctors = async () => {
  const { doctors } = await api('/api/agenda/doctors');
  qs('#doctorsList').innerHTML = doctors.map((doctor) => `
    <div class="item">
      <strong>${doctor.name}</strong>
      <small>${doctor.specialty} - ${doctor.office}</small>
      <button type="button" data-doctor="${doctor.id}">Ver horarios</button>
    </div>
  `).join('') || '<small>No hay medicos registrados.</small>';

  qs('#doctorsList').querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => loadSlots(button.dataset.doctor));
  });
};

const loadSlots = async (doctorId) => {
  state.selectedDoctor = doctorId;
  const { slots } = await api(`/api/agenda/doctors/${doctorId}/availability`);
  qs('#slotsList').innerHTML = slots.map((slot) => `
    <div class="item">
      <strong>${new Date(slot.starts_at).toLocaleString()}</strong>
      <small>Finaliza ${new Date(slot.ends_at).toLocaleString()}</small>
      ${state.user.role === 'patient' ? `<button type="button" data-slot="${slot.id}">Agendar</button>` : ''}
    </div>
  `).join('') || '<small>No hay horarios disponibles.</small>';

  qs('#slotsList').querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', async () => {
      const reason = prompt('Motivo de la consulta');
      if (!reason) return;
      await api('/api/agenda/appointments', {
        method: 'POST',
        body: JSON.stringify({ doctorId, slotId: button.dataset.slot, reason })
      });
      toast('Cita agendada');
      await Promise.all([loadSlots(doctorId), loadAppointments(), loadNotifications()]);
    });
  });
};

const loadAppointments = async () => {
  const { appointments } = await api('/api/agenda/appointments/me');
  qs('#appointmentsList').innerHTML = appointments.map((appointment) => `
    <div class="item">
      <strong>${new Date(appointment.starts_at).toLocaleString()}</strong>
      <small>${appointment.patient_name} con ${appointment.doctor_name} - ${appointment.status}</small>
      <p>${appointment.reason}</p>
      ${appointment.status !== 'cancelled' ? `<button class="danger" type="button" data-id="${appointment.id}">Cancelar</button>` : ''}
    </div>
  `).join('') || '<small>No tienes citas.</small>';

  qs('#appointmentsList').querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/agenda/appointments/${button.dataset.id}`, { method: 'DELETE' });
      toast('Cita cancelada');
      await Promise.all([loadAppointments(), loadNotifications()]);
    });
  });
};

const loadNotifications = async () => {
  const { notifications } = await api('/api/notifications/me');
  qs('#notificationsList').innerHTML = notifications.map((notification) => `
    <div class="item">
      <strong>${notification.subject}</strong>
      <small>${new Date(notification.created_at).toLocaleString()} - ${notification.status}</small>
      <p>${notification.body}</p>
    </div>
  `).join('') || '<small>No hay notificaciones.</small>';
};

qs('#loginTab').addEventListener('click', () => {
  qs('#loginTab').classList.add('active');
  qs('#registerTab').classList.remove('active');
  qs('#loginForm').classList.remove('hidden');
  qs('#registerForm').classList.add('hidden');
});

qs('#registerTab').addEventListener('click', () => {
  qs('#registerTab').classList.add('active');
  qs('#loginTab').classList.remove('active');
  qs('#registerForm').classList.remove('hidden');
  qs('#loginForm').classList.add('hidden');
});

qs('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    setSession(await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }));
  } catch (error) {
    toast(error.message);
  }
});

qs('#registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    setSession(await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }));
  } catch (error) {
    toast(error.message);
  }
});

qs('#availabilityForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    await api('/api/agenda/availability', {
      method: 'POST',
      body: JSON.stringify({
        startsAt: new Date(body.startsAt).toISOString(),
        endsAt: new Date(body.endsAt).toISOString()
      })
    });
    event.target.reset();
    toast('Horario publicado');
    await loadDoctors();
  } catch (error) {
    toast(error.message);
  }
});

qs('#logoutBtn').addEventListener('click', clearSession);
renderSession();

