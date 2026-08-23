import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../../lib/db/client'
import { formatToClinicTime, formatToClinicDate } from '../../../lib/timezone'
import { toast } from 'react-hot-toast'
import { Pill, Calendar, Clock, Info } from 'lucide-react'

export const Route = createFileRoute('/patient/prescriptions')({
  component: PrescriptionsPage,
})

function PrescriptionsPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchPrescriptions()
    }
  }, [user])

  const fetchPrescriptions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, appointments!inner(*, doctors!inner(*, profiles!fk_doctors_profiles(*)))')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrescriptions(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch prescriptions')
    } finally {
      setLoading(false)
    }
  }

  // Group by appointment date
  const groupedPrescriptions = prescriptions.reduce((acc: any, curr: any) => {
    const date = formatToClinicDate(curr.appointments?.start_time) || 'Prescribed Date'
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(curr)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="animate-shimmer h-8 w-1/4 rounded-sm border border-[#d2c19d]" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="animate-shimmer h-6 w-1/3 mb-4 rounded-sm border border-[#d2c19d]" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((j) => (
                  <div key={j} className="animate-shimmer h-32 rounded-sm border border-[#d2c19d]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Prescriptions</h1>
          <p className="page-subtitle">Historical apothecary listings and medicinal directives</p>
        </div>
      </div>

      {Object.keys(groupedPrescriptions).length === 0 ? (
        <div className="text-center py-12 hc-card">
          <Pill className="mx-auto h-12 w-12 text-[#d2c19d] mb-4" />
          <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-2">No prescriptions found</h3>
          <p className="text-[#3b2f2f]/60 italic">You don't have any prescriptions on file.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedPrescriptions).map(([date, items]: [string, any]) => (
            <div key={date}>
              <h2 className="text-lg font-bold text-[#3b2f2f] mb-4 border-b border-[#d2c19d]/40 pb-2 flex items-center gap-2 font-classic">
                <Calendar className="w-5 h-5 text-[#b59a5c]" />
                Prescribed on {date}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((rx: any) => (
                  <div key={rx.id} className="hc-card p-5">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#b59a5c]"></div>
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div>
                        <h3 className="text-lg font-bold text-[#3b2f2f] flex items-center gap-2 font-classic">
                          <Pill className="w-4 h-4 text-[#b59a5c]" />
                          {rx.drug || rx.drug_name}
                        </h3>
                        <p className="text-sm font-semibold text-[#3b2f2f]/70 mt-0.5">{rx.dose}</p>
                      </div>
                      <span className="badge badge-confirmed">
                        {rx.duration}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-4 text-sm pl-2">
                      <div className="flex items-start gap-2 text-[#3b2f2f]/80">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0 text-[#b59a5c]" />
                        <span><strong>Frequency:</strong> {rx.frequency}</span>
                      </div>
                      {rx.instructions && (
                        <div className="flex items-start gap-2 text-[#3b2f2f]/80">
                          <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#b59a5c]" />
                          <span><strong>Instructions:</strong> {rx.instructions}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-[#d2c19d]/20 text-xs text-[#3b2f2f]/60 flex justify-between items-center pl-2">
                      <span>Prescribed by Dr. {rx.doctors?.profiles?.last_name || rx.appointments?.doctors?.profiles?.last_name}</span>
                      <button className="text-[#b59a5c] font-semibold hover:text-[#9d8349] font-classic uppercase tracking-wider text-[10px]">Reminder</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
