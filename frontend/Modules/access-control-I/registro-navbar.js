document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:5200/api/auth'
  const profileBtn = document.getElementById('profile-button')
  const profileDropdown = document.getElementById('profile-dropdown')
  const profileAvatar = document.getElementById('profile-avatar')
  const profileInfoName = document.getElementById('profile-info-name')

  function getAuthHeaders() {
    const token = localStorage.getItem('sigra_token') || ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function getStoredUser() {
    const raw = localStorage.getItem('sigra_user')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch (_) {
      return null
    }
  }

  function clearSessionStorage() {
    localStorage.removeItem('sigra_token')
    localStorage.removeItem('sigra_user')
    localStorage.removeItem('sigra_user_raw')
  }

  async function logoutUser() {
    const stored = getStoredUser()
    const userId = stored?.id || stored?.user_id
    try {
      if (userId) {
        const response = await fetch(`${API_BASE}/logout/${userId}`, {
          method: 'POST',
          headers: { ...getAuthHeaders() }
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          console.warn('No se pudo cerrar sesión en el backend:', err.error || response.statusText)
        }
      }
    } catch (error) {
      console.error('Error llamando a logout en backend:', error)
    } finally {
      clearSessionStorage()
      window.location.href = './login.html'
    }
  }

  function setProfileUI() {
    const user = getStoredUser()
    const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join('')
      : '--'

    if (profileAvatar) profileAvatar.textContent = initials || '--'
    if (profileInfoName) profileInfoName.textContent = name || 'Usuario'
  }

  function toggleProfileDropdown(forceState) {
    if (!profileDropdown || !profileBtn) return
    const isOpen = profileDropdown.classList.contains('open')
    const nextState = forceState !== undefined ? forceState : !isOpen
    profileDropdown.classList.toggle('open', nextState)
    profileBtn.setAttribute('aria-expanded', nextState ? 'true' : 'false')
  }

  async function handleProfileAction(action) {
    if (!action) return
    if (action === 'logout') {
      await logoutUser()
      return
    }

    if (action === 'create') {
      window.location.href = './registro.html'
      return
    }

    if (action === 'view') {
      const stored = getStoredUser()
      if (stored) {
        if (typeof window.openModal === 'function') {
          window.openModal(stored, 'view')
        } else {
          // Modal básico para visualizar datos del usuario si no hay `openModal`
          showViewerModal(stored)
        }
      }
      return
    }

    if (action === 'edit') {
      const stored = getStoredUser()
      if (stored) {
        // Si existe un modal global `openModal`, intentar abrirlo; si no, navegar a registro
        if (typeof window.openModal === 'function') {
          window.openModal(stored, 'edit')
        } else {
          window.location.href = './registro.html'
        }
      }
    }
  }

  function showViewerModal(user) {
    let overlay = document.getElementById('rb-view-overlay')
    let modal = document.getElementById('rb-view-modal')

    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'rb-view-overlay'
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.background = 'rgba(0,0,0,0.4)'
      overlay.style.display = 'none'
      overlay.style.zIndex = '9998'
      document.body.appendChild(overlay)
    }

    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'rb-view-modal'
      modal.style.position = 'fixed'
      modal.style.left = '50%'
      modal.style.top = '50%'
      modal.style.transform = 'translate(-50%, -50%)'
      modal.style.width = 'min(420px, 92vw)'
      modal.style.background = '#fff'
      modal.style.borderRadius = '12px'
      modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'
      modal.style.padding = '16px'
      modal.style.zIndex = '9999'
      modal.style.display = 'none'
      modal.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:12px;">
          <h3 style="margin:0; font-size:18px;">Tu perfil</h3>
          <button id="rb-view-close" type="button" aria-label="Cerrar" style="border:none; background:transparent; font-size:18px; cursor:pointer;">✕</button>
        </div>
        <div id="rb-view-content" style="display:grid; gap:8px; font-size:14px;"></div>
        <div style="margin-top:12px; text-align:right;">
          <button id="rb-view-ok" type="button" style="padding:8px 12px; border-radius:8px; border:1px solid #ddd; background:#f7f7f7; cursor:pointer;">Cerrar</button>
        </div>
      `
      document.body.appendChild(modal)
    }

    const rows = []
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'
    const email = user.email || '—'
    const phone = user.phone || '—'
    const national = user.national_id || '—'
    const roleId = Number(user.role_id)
    const roleMap = { 1: 'Administrador', 2: 'Docente', 3: 'Estudiante', 4: 'Control de Estudios' }
    const role = roleMap[roleId] || (roleId ? `Rol ${roleId}` : '—')

    rows.push(`<div><strong>Nombre:</strong> ${fullName}</div>`)
    rows.push(`<div><strong>Correo:</strong> ${email}</div>`)
    rows.push(`<div><strong>Teléfono:</strong> ${phone}</div>`)
    rows.push(`<div><strong>Cédula:</strong> ${national}</div>`)
    rows.push(`<div><strong>Rol:</strong> ${role}</div>`)

    const content = modal.querySelector('#rb-view-content')
    content.innerHTML = rows.join('')

    function close() {
      overlay.style.display = 'none'
      modal.style.display = 'none'
    }
    modal.querySelector('#rb-view-close').onclick = close
    modal.querySelector('#rb-view-ok').onclick = close
    overlay.onclick = close

    overlay.style.display = 'block'
    modal.style.display = 'block'
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', () => toggleProfileDropdown())
  }

  document.addEventListener('click', (evt) => {
    if (!profileDropdown || !profileBtn) return
    if (!profileDropdown.contains(evt.target) && !profileBtn.contains(evt.target)) {
      toggleProfileDropdown(false)
    }
  })

  if (profileDropdown) {
    profileDropdown.addEventListener('click', (evt) => {
      const item = evt.target.closest('[data-profile-action]')
      if (!item) return
      const action = item.dataset.profileAction
      handleProfileAction(action)
      toggleProfileDropdown(false)
    })
  }

  setProfileUI()
})
