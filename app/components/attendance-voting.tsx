'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock, UserPlus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface AttendanceVotingProps {
  compact?: boolean
  scheduleId: string
  currentUserId: string
  isPastSchedule: boolean
  allowGuests?: boolean
  hasTeamFormation?: boolean
  formationConfirmed?: boolean
  isManagerMode?: boolean
  onVoteUpdate: () => void
  // Performance optimization: pre-fetched data from parent
  initialAttendees?: Attendee[]
  initialStats?: AttendanceStats
  initialMyStatus?: 'attending' | 'not_attending' | 'pending'
}

interface AttendanceStats {
  attending: number
  notAttending: number
  pending: number
  total: number
}

interface Attendee {
  userId: string
  name: string
  status: 'attending' | 'not_attending' | 'pending'
  profileImage?: string | null
  isGuest?: boolean
  invitedBy?: string
  invitedByUserId?: string | null
}

export function AttendanceVoting({
  scheduleId,
  currentUserId,
  isPastSchedule,
  allowGuests = false,
  hasTeamFormation = false,
  formationConfirmed = false,
  isManagerMode = false,
  onVoteUpdate,
  initialAttendees,
  initialStats,
  initialMyStatus,
  compact = false
}: AttendanceVotingProps) {
  // Initialize state from props if provided (performance optimization)
  const getInitialMyStatus = (): 'attending' | 'not_attending' | 'pending' => {
    // First check initialMyStatus prop (from dashboard)
    if (initialMyStatus) {
      return initialMyStatus
    }
    // Then check initialAttendees (from schedule card)
    if (initialAttendees) {
      const myAttendance = initialAttendees.find(a => a.userId === currentUserId && !a.isGuest)
      return myAttendance?.status || 'pending'
    }
    return 'pending'
  }

  const [myStatus, setMyStatus] = useState<'attending' | 'not_attending' | 'pending'>(getInitialMyStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stats, setStats] = useState<AttendanceStats>(initialStats || {
    attending: 0,
    notAttending: 0,
    pending: 0,
    total: 0
  })
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees || [])
  const [isLoading, setIsLoading] = useState(!initialAttendees && !initialStats)
  const [detailDialogType, setDetailDialogType] = useState<'attending' | 'not_attending' | 'pending' | null>(null)
  const [isDialogLoading, setIsDialogLoading] = useState(false)
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestLevel, setGuestLevel] = useState<string>('')
  const [isAddingGuest, setIsAddingGuest] = useState(false)
  const [sameTeamAsInviter, setSameTeamAsInviter] = useState(false)

  // 투표 현황 조회
  const fetchAttendance = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/schedule/attendance?scheduleId=${scheduleId}`)
      const result = await response.json()

      if (response.ok && result.success) {
        const myAttendance = result.attendees.find((a: Attendee) => a.userId === currentUserId && !a.isGuest)
        if (myAttendance) {
          setMyStatus(myAttendance.status)
        } else {
          setMyStatus('pending')
        }
        setStats(result.stats)
        setAttendees(result.attendees)
      }
    } catch (error) {
      console.error('참석 현황 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (scheduleId && currentUserId && !initialAttendees && !initialStats) {
      fetchAttendance()
    }
  }, [scheduleId, currentUserId])

  useEffect(() => {
    if (detailDialogType && attendees.length === 0) {
      const loadAttendees = async () => {
        setIsDialogLoading(true)
        try {
          const response = await fetch(`/api/schedule/attendance?scheduleId=${scheduleId}`)
          const result = await response.json()
          if (response.ok && result.success) {
            setAttendees(result.attendees)
            setStats(result.stats)
          }
        } catch (error) {
          console.error('참석자 목록 조회 오류:', error)
        } finally {
          setIsDialogLoading(false)
        }
      }
      loadAttendees()
    }
  }, [detailDialogType, attendees.length, scheduleId])

  const handleVote = async (status: 'ATTENDING' | 'NOT_ATTENDING') => {
    if (isSubmitting || isPastSchedule) return

    if (hasTeamFormation) {
      if (!confirm('팀편성 결과가 있습니다. 투표를 변경하면 팀편성 결과가 초기화됩니다. 투표하시겠습니까?')) {
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/schedule/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          userId: currentUserId,
          status
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setMyStatus(status.toLowerCase() as 'attending' | 'not_attending')
        await fetchAttendance()
        onVoteUpdate()
      } else {
        // 인원 제한 등 서버 에러 메시지 표시
        alert(result.error || '투표 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('투표 처리 오류:', error)
      alert('투표 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAttendance = async (attendee: Attendee) => {
    const isGuestInviter = attendee.isGuest && attendee.invitedByUserId === currentUserId
    if (!isManagerMode && !isGuestInviter) return

    const confirmMessage = attendee.isGuest
      ? `게스트 "${attendee.name}"의 참석 투표를 삭제하시겠습니까?`
      : `"${attendee.name}"님의 참석 투표를 삭제하시겠습니까?`

    if (!confirm(confirmMessage)) return

    if (hasTeamFormation) {
      if (!confirm('팀편성 결과가 있습니다. 투표를 삭제하면 팀편성 결과가 초기화됩니다. 삭제하시겠습니까?')) {
        return
      }
    }

    try {
      const response = await fetch('/api/schedule/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          targetUserId: attendee.isGuest ? null : attendee.userId,
          guestId: attendee.isGuest ? attendee.userId : null,
          adminUserId: currentUserId
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        await fetchAttendance()
        onVoteUpdate()
        if (result.teamFormationReset && hasTeamFormation) {
          alert('참석 투표가 삭제되었습니다. 팀편성 결과가 초기화되었습니다.')
        }
      } else {
        alert(result.error || '투표 삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('투표 삭제 오류:', error)
      alert('투표 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleAddGuest = async () => {
    if (!guestName.trim() || !guestLevel) {
      alert('게스트 이름과 레벨을 입력해주세요.')
      return
    }

    if (hasTeamFormation) {
      if (!confirm('팀편성 결과가 있습니다. 게스트를 초대하면 팀편성 결과가 초기화됩니다. 초대하시겠습니까?')) {
        return
      }
    }

    setIsAddingGuest(true)
    try {
      const levelMap: { [key: string]: number } = { '미숙': 3, '보통': 4, '잘함': 5 }

      const response = await fetch('/api/schedule/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          guestName: guestName.trim(),
          guestLevel: levelMap[guestLevel],
          invitedByUserId: currentUserId,
          sameTeamAsInviter: sameTeamAsInviter
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setGuestName('')
        setGuestLevel('')
        setSameTeamAsInviter(false)
        setIsGuestDialogOpen(false)
        await fetchAttendance()
        onVoteUpdate()
        if (result.teamFormationReset && hasTeamFormation) {
          alert('게스트가 초대되었습니다. 팀편성 결과가 초기화되었습니다.')
        }
      } else {
        alert(result.error || '게스트 추가 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('게스트 추가 오류:', error)
      alert('게스트 추가 중 오류가 발생했습니다.')
    } finally {
      setIsAddingGuest(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attending': return 'bg-green-100 text-green-700 border-green-300'
      case 'not_attending': return 'bg-red-100 text-red-700 border-red-300'
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attending': return <Check className="h-4 w-4" />
      case 'not_attending': return <X className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'attending': return '참석'
      case 'not_attending': return '불참'
      case 'pending': return '미응답'
      default: return '미응답'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
    )
  }

  // 공통 다이얼로그 렌더링 함수
  const renderDetailDialogs = () => (
    <>
      <Dialog open={detailDialogType === 'attending'} onOpenChange={(open) => setDetailDialogType(open ? 'attending' : null)}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>참석 인원</DialogTitle><DialogDescription>참석으로 투표한 멤버 목록입니다.</DialogDescription></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pt-2">
            {isDialogLoading ? <p className="text-center text-gray-500 py-4">로딩 중...</p> : attendees.filter(a => a.status === 'attending').length === 0 ? <p className="text-center text-gray-500 py-4">참석 인원이 없습니다.</p> :
              attendees.filter(a => a.status === 'attending').sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((attendee) => (
                <div key={attendee.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-8 w-8"><AvatarImage src={attendee.profileImage || undefined} /><AvatarFallback>{attendee.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{attendee.name}{attendee.isGuest && attendee.invitedBy && <span className="text-gray-500 font-normal"> ({attendee.invitedBy} 지인)</span>}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attendee.isGuest && <Badge variant="outline" className="text-xs">게스트</Badge>}
                    {(isManagerMode || (attendee.isGuest && attendee.invitedByUserId === currentUserId)) && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteAttendance(attendee)} title="삭제"><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogType === 'not_attending'} onOpenChange={(open) => setDetailDialogType(open ? 'not_attending' : null)}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>불참 인원</DialogTitle><DialogDescription>불참으로 투표한 멤버 목록입니다.</DialogDescription></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pt-2">
            {isDialogLoading ? <p className="text-center text-gray-500 py-4">로딩 중...</p> : attendees.filter(a => a.status === 'not_attending').length === 0 ? <p className="text-center text-gray-500 py-4">불참 인원이 없습니다.</p> :
              attendees.filter(a => a.status === 'not_attending').sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((attendee) => (
                <div key={attendee.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-8 w-8"><AvatarImage src={attendee.profileImage || undefined} /><AvatarFallback>{attendee.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1"><p className="text-sm font-medium">{attendee.name}</p></div>
                  {isManagerMode && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteAttendance(attendee)} title="삭제"><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogType === 'pending'} onOpenChange={(open) => setDetailDialogType(open ? 'pending' : null)}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>미응답 인원</DialogTitle><DialogDescription>아직 투표하지 않은 멤버 목록입니다.</DialogDescription></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pt-2">
            {isDialogLoading ? <p className="text-center text-gray-500 py-4">로딩 중...</p> : attendees.filter(a => a.status === 'pending').length === 0 ? <p className="text-center text-gray-500 py-4">미응답 인원이 없습니다.</p> :
              attendees.filter(a => a.status === 'pending').sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((attendee) => (
                <div key={attendee.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-8 w-8"><AvatarImage src={attendee.profileImage || undefined} /><AvatarFallback>{attendee.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1"><p className="text-sm font-medium">{attendee.name}</p></div>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

  if (isPastSchedule) return null

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={(e) => { e.stopPropagation(); handleVote('ATTENDING'); }}
            disabled={isSubmitting || myStatus === 'attending' || formationConfirmed}
            variant={myStatus === 'attending' ? 'default' : 'outline'}
            className={`flex-1 h-8 text-xs ${myStatus === 'attending' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:text-green-700'} ${formationConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="sm"
          >
            <Check className="h-3 w-3 mr-1" />
            참석
          </Button>
          <Button
            onClick={(e) => { e.stopPropagation(); handleVote('NOT_ATTENDING'); }}
            disabled={isSubmitting || myStatus === 'not_attending' || formationConfirmed}
            variant={myStatus === 'not_attending' ? 'default' : 'outline'}
            className={`flex-1 h-8 text-xs ${myStatus === 'not_attending' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:text-red-700'} ${formationConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="sm"
          >
            <X className="h-3 w-3 mr-1" />
            불참
          </Button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 px-1 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); setDetailDialogType('attending'); }}
            className="hover:text-green-600 hover:underline cursor-pointer"
          >
            참석 {stats.attending}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDetailDialogType('not_attending'); }}
            className="hover:text-red-600 hover:underline cursor-pointer"
          >
            불참 {stats.notAttending}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDetailDialogType('pending'); }}
            className="hover:text-gray-800 hover:underline cursor-pointer"
          >
            미정 {stats.pending}
          </button>
        </div>
        {renderDetailDialogs()}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">내 투표:</span>
        <Badge className={getStatusColor(myStatus)} variant="secondary">
          {getStatusIcon(myStatus)}
          <span className="ml-1">{getStatusText(myStatus)}</span>
        </Badge>
      </div>

      <div className="space-y-2">
        {formationConfirmed && (
          <div className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
            팀편성이 확정되어 투표가 마감되었습니다
          </div>
        )}
        <div className="flex gap-2">
          <Button
            onClick={() => handleVote('ATTENDING')}
            disabled={isSubmitting || myStatus === 'attending' || formationConfirmed}
            variant={myStatus === 'attending' ? 'default' : 'outline'}
            className={`flex-1 ${myStatus === 'attending' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:text-green-700'} ${formationConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="sm"
          >
            <Check className="h-4 w-4 mr-1" />
            참석
          </Button>
          <Button
            onClick={() => handleVote('NOT_ATTENDING')}
            disabled={isSubmitting || myStatus === 'not_attending' || formationConfirmed}
            variant={myStatus === 'not_attending' ? 'default' : 'outline'}
            className={`flex-1 ${myStatus === 'not_attending' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:text-red-700'} ${formationConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="sm"
          >
            <X className="h-4 w-4 mr-1" />
            불참
          </Button>
        </div>

        {allowGuests && (
          <Dialog open={isGuestDialogOpen} onOpenChange={(open) => {
            setIsGuestDialogOpen(open)
            if (!open) { setGuestName(''); setGuestLevel(''); setSameTeamAsInviter(false); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className={`w-full ${formationConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isPastSchedule || formationConfirmed}>
                <UserPlus className="h-4 w-4 mr-1" />
                게스트 초대
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>게스트 초대 등록</DialogTitle>
                <DialogDescription>게스트의 이름과 레벨을 입력해주세요.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">게스트 이름</Label>
                  <Input id="guestName" placeholder="게스트 이름을 입력하세요" value={guestName} onChange={(e) => setGuestName(e.target.value)} disabled={isAddingGuest} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestLevel">게스트 레벨</Label>
                  <Select value={guestLevel} onValueChange={setGuestLevel} disabled={isAddingGuest}>
                    <SelectTrigger id="guestLevel"><SelectValue placeholder="레벨을 선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="미숙">미숙</SelectItem>
                      <SelectItem value="보통">보통</SelectItem>
                      <SelectItem value="잘함">잘함</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 rounded border">
                    <Checkbox id="same-team-inviter" checked={sameTeamAsInviter} onCheckedChange={(checked) => setSameTeamAsInviter(checked === true)} disabled={isAddingGuest} />
                    <label htmlFor="same-team-inviter" className="text-sm font-medium leading-none cursor-pointer">초대자와 같은 팀 희망</label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleAddGuest} disabled={isAddingGuest || !guestName.trim() || !guestLevel} className="flex-1">{isAddingGuest ? '등록 중...' : '등록'}</Button>
                  <Button onClick={() => { setIsGuestDialogOpen(false); setGuestName(''); setGuestLevel(''); setSameTeamAsInviter(false); }} variant="outline" disabled={isAddingGuest} className="flex-1">취소</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setDetailDialogType('attending'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-colors ${stats.attending > 0 ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          disabled={isPastSchedule}
        >
          <span className="text-sm font-medium">참석 {stats.attending}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setDetailDialogType('not_attending'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-colors ${stats.notAttending > 0 ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          disabled={isPastSchedule}
        >
          <span className="text-sm font-medium">불참 {stats.notAttending}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setDetailDialogType('pending'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-colors ${stats.pending > 0 ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          disabled={isPastSchedule}
        >
          <span className="text-sm font-medium">미정 {stats.pending}</span>
        </button>
      </div>

      {renderDetailDialogs()}
    </div>
  )
}

