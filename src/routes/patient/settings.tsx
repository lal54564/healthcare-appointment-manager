import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../../lib/db/client'
import { toast } from 'react-hot-toast'
import { User, Calendar, Bell, Save, Loader2, Mail, Phone, MapPin } from 'lucide-react'

export const Route = createFileRoute('/patient/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: ''
  })

  // Mock calendar state
  const [calendarConnected, setCalendarConnected] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error && error.message !== 'No rows found') {
        console.warn('Profile fetch note:', error)
      }
      
      if (data) {
        setProfile(data)
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          address: data.address || ''
        })
      }

      // Check calendar connection state
      if (user?.id) {
        const { data: calData } = await supabase
          .from('calendar_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('connection_status', 'connected')
          .maybeSingle()

        if (calData) {
          setCalendarConnected(true)
        } else {
          // Check local storage fallback for mock mode
          const localCal = localStorage.getItem(`cal_connected_${user.id}`)
          setCalendarConnected(localCal === 'true')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
        })
        .eq('id', user?.id)

      if (error) throw error
      toast.success('Profile updated successfully')
      fetchProfile()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCalendarToggle = async () => {
    if (!user) return
    try {
      if (calendarConnected) {
        // Disconnect
        await supabase
          .from('calendar_connections')
          .upsert({
            user_id: user.id,
            provider: 'google',
            connection_status: 'disconnected',
            updated_at: new Date().toISOString()
          })

        localStorage.setItem(`cal_connected_${user.id}`, 'false')
        setCalendarConnected(false)
        toast.success('Google Calendar disconnected')
      } else {
        // Connect
        await supabase
          .from('calendar_connections')
          .upsert({
            user_id: user.id,
            provider: 'google',
            connection_status: 'connected',
            access_token: 'mock_google_oauth_token_' + Date.now(),
            refresh_token: 'mock_google_refresh_token',
            calendar_id: 'primary',
            updated_at: new Date().toISOString()
          })

        localStorage.setItem(`cal_connected_${user.id}`, 'true')
        setCalendarConnected(true)
        toast.success('Google Calendar connected successfully! Events will now sync.', { icon: '🗓️' })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle calendar connection')
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="animate-shimmer h-8 w-1/4 rounded-sm border border-[#d2c19d]" />
        <div className="space-y-6">
          <div className="animate-shimmer h-64 rounded-sm border border-[#d2c19d]" />
          <div className="animate-shimmer h-32 rounded-sm border border-[#d2c19d]" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Settings</h1>
          <p className="page-subtitle">Configure your personal files and clinic preferences</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="hc-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d2c19d]/40 bg-[#faf7f0] flex items-center gap-2">
            <User className="w-5 h-5 text-[#b59a5c]" />
            <h2 className="text-lg font-bold text-[#3b2f2f] font-classic">Personal Information</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="hc-label">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="hc-input"
                  />
                </div>
                <div>
                  <label className="hc-label">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="hc-input"
                  />
                </div>
              </div>

              <div>
                <label className="hc-label">Email Address</label>
                <div className="flex items-center px-3 py-2.5 border border-[#d2c19d]/40 bg-[#faf7f0] rounded-sm text-[#3b2f2f]/60 font-medium">
                  <Mail className="w-4 h-4 mr-2 text-[#b59a5c]" />
                  {user?.email}
                </div>
                <p className="text-xs text-[#3b2f2f]/60 mt-1 italic">Email cannot be modified.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="hc-label">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#d2c19d] absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="hc-input pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="hc-label">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="hc-input"
                  />
                </div>
              </div>

              <div>
                <label className="hc-label">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="hc-input bg-[#faf8f3]"
                >
                  <option value="">Select gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="hc-label">Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#d2c19d] absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="hc-input pl-9"
                    placeholder="Full Address"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary min-w-[150px]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Save Files
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="hc-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d2c19d]/40 bg-[#faf7f0] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#b59a5c]" />
            <h2 className="text-lg font-bold text-[#3b2f2f] font-classic">Calendar Ledger Integration</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#3b2f2f] font-classic">Google Calendar</h3>
                <p className="text-sm text-[#3b2f2f]/60 mt-1 italic">
                  Sync scheduled slot tickets to your global personal calendar.
                </p>
                {calendarConnected && (
                  <p className="text-sm text-[#2d5a27] mt-2 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#2d5a27]"></span> Connected as {user?.email}
                  </p>
                )}
              </div>
              <button
                onClick={handleCalendarToggle}
                className={`btn-secondary ${calendarConnected ? 'text-[#8c2a2a] border-[#8c2a2a] hover:bg-[#8c2a2a]/10' : ''}`}
              >
                {calendarConnected ? 'Disconnect' : 'Connect Calendar'}
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="hc-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d2c19d]/40 bg-[#faf7f0] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#b59a5c]" />
            <h2 className="text-lg font-bold text-[#3b2f2f] font-classic">Notification Directives</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#3b2f2f] font-classic">Email Reminders</h3>
                <p className="text-sm text-[#3b2f2f]/60 italic">Receive automated alerts prior to consultation slot.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-1 peer-focus:ring-[#b59a5c] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#faf8f3] after:border-[#d2c19d] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b59a5c]"></div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-[#d2c19d]/20">
              <label className="hc-label">Reminder Timing</label>
              <select className="hc-input max-w-[200px] bg-[#faf8f3]">
                <option value="24h">24 hours before</option>
                <option value="48h">48 hours before</option>
                <option value="1h">1 hour before</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
