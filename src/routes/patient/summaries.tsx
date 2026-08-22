import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../../lib/db/client'
import { formatToClinicTime } from '../../../lib/timezone'
import { toast } from 'react-hot-toast'
import { FileText, Calendar, User, Activity, AlertCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/patient/summaries')({
  component: SummariesPage,
})

function SummariesPage() {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSummaries()
    }
  }, [user])

  const fetchSummaries = async () => {
    try {
      setLoading(true)
      // Fetch summaries where the related appointment belongs to the user
      const { data, error } = await supabase
        .from('summaries')
        .select('*, appointments!inner(*, doctors!inner(*, profiles!fk_doctors_profiles(*)))')
        .eq('appointments.patient_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSummaries(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch summaries')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return <span className="badge badge-completed">Ready</span>
    if (status === 'pending') return <span className="badge badge-pending"><Loader2 className="w-3 h-3 animate-spin"/> Generating</span>
    return <span className="badge badge-cancelled">Failed</span>
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="animate-shimmer h-8 w-1/4 rounded-sm border border-[#d2c19d]" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-shimmer h-48 rounded-sm border border-[#d2c19d]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visit Summaries</h1>
          <p className="page-subtitle">Historical records and AI interpretations of clinical visits</p>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-12 hc-card">
          <FileText className="mx-auto h-12 w-12 text-[#d2c19d] mb-4" />
          <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-2">No summaries available</h3>
          <p className="text-[#3b2f2f]/60 italic">Your medical visit summaries will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {summaries.map((summary) => (
            <div key={summary.id} className="hc-card p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm border border-[#b59a5c]/30 text-[#b59a5c] bg-[#faf7f0] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#3b2f2f] font-classic">
                        {summary.type === 'pre-visit' || summary.summary_type === 'pre_visit' ? 'Pre-Visit Summary' : 'Post-Visit Summary'}
                      </h2>
                      {getStatusBadge(summary.status)}
                    </div>
                    <p className="text-sm text-[#3b2f2f]/60 flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#b59a5c]" />
                      {new Date(summary.appointments?.start_time).toLocaleDateString()}
                      <span className="mx-1 text-[#b59a5c]">•</span>
                      <User className="w-3.5 h-3.5 text-[#b59a5c]" />
                      Dr. {summary.appointments?.doctors?.profiles?.last_name}
                    </p>
                  </div>
                </div>
              </div>

              {summary.status === 'completed' && summary.content ? (
                <div className="bg-[#faf7f0] rounded-sm p-5 border border-[#d2c19d]/40 mt-4 text-[#3b2f2f] whitespace-pre-wrap font-vintage text-base leading-relaxed">
                  {summary.content}
                </div>
              ) : summary.status === 'pending' ? (
                <div className="mt-4 p-8 bg-[#faf7f0] rounded-sm border border-[#d2c19d]/30 flex flex-col items-center justify-center text-[#3b2f2f]/60">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#b59a5c]" />
                  <p className="italic">Archival ledger is compiling visit notes...</p>
                </div>
              ) : (
                <div className="mt-4 p-5 bg-[#ffebee] rounded-sm border border-[#ffcdd2] text-[#c62828] flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="italic">Summary is unavailable at this time.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
