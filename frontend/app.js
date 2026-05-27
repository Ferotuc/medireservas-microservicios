const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  selectedDoctor: null,
  appointments: [],
  patients: []
};

const qs = (selector) => document.querySelector(selector);
const roleLabels = {
  patient: 'Paciente',
  doctor: 'Medico',
  admin: 'Administrador'
};

const statusLabels = {
  available: 'Disponible',
  booked: 'Reservado',
  blocked: 'Bloqueado',
  scheduled: 'Agendada',
  rescheduled: 'Reprogramada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  pending: 'Pendiente',
  sent: 'Enviada',
  failed: 'Fallida',
  read: 'Leida'
};

const labelFor = (labels, value) => labels[value] || value;
const portal = window.location.port === '8082'
  ? {
      role: 'doctor',
      eyebrow: 'Portal medico',
      title: 'MediReservas Medicos',
      description: 'Administra disponibilidad, revisa agenda y registra resultados de consulta.',
      email: 'ana.doctor@demo.com'
    }
  : {
      role: 'patient',
      eyebrow: 'Portal paciente',
      title: 'MediReservas Pacientes',
      description: 'Busca medicos, agenda citas, revisa notificaciones y consulta tus resultados.',
      email: 'luis.paciente@demo.com'
    };

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

const configurePortal = () => {
  qs('#portalEyebrow').textContent = portal.eyebrow;
  qs('#portalTitle').textContent = portal.title;
  qs('#portalDescription').textContent = portal.description;
  qs('#loginEmail').value = portal.email;
  document.title = portal.title;
};

const renderSession = async () => {
  qs('#appView').classList.toggle('hidden', !state.token);
  qs('.auth-card').classList.toggle('hidden', Boolean(state.token));
  if (!state.token) return;
  qs('#userTitle').textContent = `${state.user.name} (${labelFor(roleLabels, state.user.role)})`;
  qs('#availabilityForm').classList.toggle('hidden', state.user.role !== 'doctor');
  qs('#recordForm').classList.toggle('hidden', state.user.role !== 'doctor');
  qs('#patientsPanel').classList.toggle('hidden', state.user.role !== 'doctor');
  qs('#doctorProfilePanel').classList.toggle('hidden', state.user.role !== 'doctor');
  await Promise.all([loadDoctors(), loadAppointments(), loadNotifications()]);
  if (state.user.role === 'doctor') await loadPatients();
  await loadRecords();
};

const loadDoctors = async () => {
  const { doctors } = await api('/api/agenda/doctors');
  const doctorsToRender = state.user?.role === 'patient'
    ? doctors.filter((doctor) => Number(doctor.available_slots) > 0)
    : doctors;

  qs('#doctorsTitle').textContent = state.user?.role === 'patient' ? 'Medicos disponibles' : 'Medicos';

  if (state.user?.role === 'patient' && !doctorsToRender.length) {
    qs('#doctorsList').innerHTML = `
      <div class="item">
        <strong>No hay medicos con horarios disponibles</strong>
        <small>Un medico debe publicar disponibilidad futura para que puedas agendar.</small>
      </div>
    `;
    qs('#slotsList').innerHTML = '<small>Selecciona un medico con disponibilidad para ver horarios.</small>';
    return;
  }

  qs('#doctorsList').innerHTML = doctorsToRender.map((doctor) => `
    <div class="item">
      <strong>${doctor.name}</strong>
      <small>${doctor.specialty} - ${doctor.office}</small>
      <small>${Number(doctor.available_slots) || 0} horarios disponibles${doctor.next_available_at ? ` - Proximo: ${new Date(doctor.next_available_at).toLocaleString()}` : ''}</small>
      <button type="button" data-doctor="${doctor.id}" ${Number(doctor.available_slots) === 0 ? 'disabled' : ''}>Ver horarios</button>
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
  state.appointments = appointments;
  qs('#appointmentsList').innerHTML = appointments.map((appointment) => `
    <div class="item">
      <strong>${new Date(appointment.starts_at).toLocaleString()}</strong>
      <small>${appointment.patient_name} con ${appointment.doctor_name} - ${labelFor(statusLabels, appointment.status)}</small>
      <p>${appointment.reason}</p>
      ${state.user.role === 'doctor' && appointment.status !== 'cancelled' ? `<button type="button" data-record="${appointment.id}">Registrar resultado</button>` : ''}
      ${state.user.role === 'patient' && appointment.status !== 'cancelled' ? `<button type="button" data-edit="${appointment.id}">Modificar motivo</button>` : ''}
      ${state.user.role === 'patient' && appointment.status !== 'cancelled' ? `<button type="button" data-reschedule="${appointment.id}">Reprogramar</button>` : ''}
      ${appointment.status !== 'cancelled' ? `<button class="danger" type="button" data-id="${appointment.id}">Cancelar</button>` : ''}
    </div>
  `).join('') || '<small>No tienes citas.</small>';

  qs('#appointmentsList').querySelectorAll('button[data-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/agenda/appointments/${button.dataset.id}`, { method: 'DELETE' });
      toast('Cita cancelada');
      await Promise.all([loadAppointments(), loadNotifications()]);
    });
  });

  qs('#appointmentsList').querySelectorAll('button[data-record]').forEach((button) => {
    button.addEventListener('click', () => {
      qs('#recordAppointment').value = button.dataset.record;
      qs('#recordForm textarea[name="summary"]').focus();
    });
  });

  qs('#appointmentsList').querySelectorAll('button[data-edit]').forEach((button) => {
    button.addEventListener('click', async () => {
      const appointment = state.appointments.find((item) => item.id === button.dataset.edit);
      const reason = prompt('Nuevo motivo de la consulta', appointment?.reason || '');
      if (!reason) return;
      await api(`/api/agenda/appointments/${button.dataset.edit}`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      toast('Cita modificada');
      await loadAppointments();
    });
  });

  qs('#appointmentsList').querySelectorAll('button[data-reschedule]').forEach((button) => {
    button.addEventListener('click', async () => {
      const appointment = state.appointments.find((item) => item.id === button.dataset.reschedule);
      if (!appointment) return;
      const { slots } = await api(`/api/agenda/doctors/${appointment.doctor_id}/availability`);
      if (!slots.length) {
        toast('No hay horarios disponibles para reprogramar');
        return;
      }
      const menu = slots
        .map((slot, index) => `${index + 1}. ${new Date(slot.starts_at).toLocaleString()}`)
        .join('\n');
      const selected = Number(prompt(`Elige un nuevo horario:\n${menu}`));
      const slot = slots[selected - 1];
      if (!slot) return;
      await api(`/api/agenda/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ slotId: slot.id })
      });
      toast('Cita reprogramada');
      await Promise.all([loadAppointments(), loadNotifications()]);
    });
  });

  renderRecordAppointmentOptions();
};

const loadNotifications = async () => {
  const { notifications } = await api('/api/notifications/me');
  qs('#notificationsList').innerHTML = notifications.map((notification) => `
    <div class="item">
      <strong>${notification.subject}</strong>
      <small>${new Date(notification.created_at).toLocaleString()} - ${labelFor(statusLabels, notification.status)}</small>
      <p>${notification.body}</p>
    </div>
  `).join('') || '<small>No hay notificaciones.</small>';
};

const renderRecordAppointmentOptions = () => {
  if (state.user?.role !== 'doctor') return;
  const options = state.appointments
    .filter((appointment) => appointment.status !== 'cancelled')
    .map((appointment) => `
      <option value="${appointment.id}">
        ${appointment.patient_name} - ${new Date(appointment.starts_at).toLocaleString()}
      </option>
    `)
    .join('');

  qs('#recordAppointment').innerHTML = options || '<option value="">No hay citas activas</option>';
};

const loadRecords = async () => {
  const { results } = await api('/api/records/me');
  qs('#recordsList').innerHTML = results.map((result) => `
    <div class="item">
      <strong>${result.patient_name} - ${new Date(result.created_at).toLocaleString()}</strong>
      <small>Medico: ${result.doctor_name}</small>
      <p>${result.summary}</p>
      ${result.prescription ? `<small>Prescripcion: ${result.prescription}</small>` : ''}
    </div>
  `).join('') || '<small>No hay resultados registrados.</small>';
};

const loadPatients = async () => {
  const { users } = await api('/api/auth/users?role=patient');
  state.patients = users;
  qs('#patientsList').innerHTML = users.map((patient) => `
    <div class="item">
      <strong>${patient.name}</strong>
      <small>${patient.email}</small>
      <small>Registrado: ${new Date(patient.created_at).toLocaleString()}</small>
    </div>
  `).join('') || '<small>No hay pacientes registrados.</small>';
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

qs('#doctorProfileForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    await api('/api/agenda/doctors', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    toast('Perfil medico actualizado');
    await loadDoctors();
  } catch (error) {
    toast(error.message);
  }
});

qs('#recordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  const appointment = state.appointments.find((item) => item.id === body.appointmentRef);
  if (!appointment) {
    toast('Selecciona una cita activa');
    return;
  }

  try {
    await api('/api/records/results', {
      method: 'POST',
      body: JSON.stringify({
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        summary: body.summary,
        prescription: body.prescription
      })
    });
    event.target.reset();
    toast('Resultado registrado');
    await loadRecords();
  } catch (error) {
    toast(error.message);
  }
});

qs('#patientForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  try {
    await api('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify({ ...body, role: 'patient' })
    });
    event.target.reset();
    event.target.password.value = 'Paciente123!';
    toast('Paciente agregado');
    await loadPatients();
  } catch (error) {
    toast(error.message);
  }
});

qs('#logoutBtn').addEventListener('click', clearSession);
configurePortal();
renderSession();
