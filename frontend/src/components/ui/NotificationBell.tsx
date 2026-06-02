'use client'
import { useState, useEffect, useRef } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Notification {
  notification_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  info: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  match: '#7F77DD',
}

const TYPE_ICONS: Record<string, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  match: '⚡',
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${userId}`
      )
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (e) {
      console.warn('Could not fetch notifications')
    }
  }

  const markAllRead = async () => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${userId}/read-all`,
      { method: 'PATCH' }
    )
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/read`,
      { method: 'PATCH' }
    )
    setNotifications(prev =>
      prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px', borderRadius: '8px',
          color: 'rgba(255,255,255,0.5)', fontSize: '18px',
          transition: 'color 0.15s',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: TEAL, color: '#fff',
            fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'system-ui',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '40px', right: 0,
          width: '340px', maxHeight: '440px',
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: '14px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 200, fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            padding: '1rem 1.25rem', borderBottom: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Notifications {unreadCount > 0 && (
                <span style={{ color: TEAL, marginLeft: '4px' }}>({unreadCount})</span>
              )}
            </p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: 'rgba(255,255,255,0.35)',
              }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.notification_id}
                  onClick={() => markRead(n.notification_id)}
                  style={{
                    padding: '0.875rem 1.25rem',
                    borderBottom: `1px solid ${BORDER}`,
                    background: n.is_read ? 'transparent' : 'rgba(16,185,129,0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}
                >
                  <span style={{
                    fontSize: '14px', flexShrink: 0,
                    color: TYPE_COLORS[n.type] || TYPE_COLORS.info,
                    marginTop: '1px',
                  }}>
                    {TYPE_ICONS[n.type] || TYPE_ICONS.info}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '13px', fontWeight: n.is_read ? 400 : 600,
                      color: n.is_read ? 'rgba(255,255,255,0.6)' : '#fff',
                      margin: '0 0 2px', lineHeight: 1.4,
                    }}>
                      {n.title}
                    </p>
                    <p style={{
                      fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                      margin: '0 0 4px', lineHeight: 1.4,
                    }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                      {new Date(n.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: TEAL, flexShrink: 0, marginTop: '4px',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}